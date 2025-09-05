import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

const limitImport = rateLimit({ windowMs: 60 * 1000, max: 3 }); // 3 imports per minute

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Owner/Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitImport(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    if (!validateCSRFFromRequest(request)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const options = JSON.parse(formData.get('options') || '{}');

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileContent = await file.text();
    let importData;

    try {
      importData = JSON.parse(fileContent);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON file' }, { status: 400 });
    }

    // Validate import data structure
    if (!importData.metadata || !importData.data) {
      return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const importResults = {
      importedAt: new Date().toISOString(),
      importedBy: session.user.userId,
      collections: {},
      summary: {
        totalCollections: 0,
        totalDocuments: 0,
        successfulImports: 0,
        failedImports: 0
      }
    };

    // Import each collection
    for (const [collectionName, collectionData] of Object.entries(importData.data)) {
      if (!collectionData.documents || !Array.isArray(collectionData.documents)) {
        continue;
      }

      importResults.summary.totalCollections++;
      importResults.collections[collectionName] = {
        requested: collectionData.documents.length,
        imported: 0,
        errors: []
      };

      try {
        const collection = db.collection(collectionName);
        
        // Handle different import modes
        if (options.mode === 'replace') {
          // Clear existing data and insert new data
          await collection.deleteMany({});
          if (collectionData.documents.length > 0) {
            const result = await collection.insertMany(collectionData.documents);
            importResults.collections[collectionName].imported = result.insertedCount;
          }
        } else if (options.mode === 'merge') {
          // Insert only new documents (skip duplicates)
          let imported = 0;
          for (const doc of collectionData.documents) {
            try {
              // Try to insert, ignore duplicates
              await collection.insertOne(doc);
              imported++;
            } catch (error) {
              if (error.code === 11000) {
                // Duplicate key error - skip
                continue;
              } else {
                throw error;
              }
            }
          }
          importResults.collections[collectionName].imported = imported;
        } else {
          // Default: insert all documents
          if (collectionData.documents.length > 0) {
            const result = await collection.insertMany(collectionData.documents);
            importResults.collections[collectionName].imported = result.insertedCount;
          }
        }

        importResults.summary.totalDocuments += collectionData.documents.length;
        importResults.summary.successfulImports += importResults.collections[collectionName].imported;

      } catch (error) {
        console.error(`Error importing collection ${collectionName}:`, error);
        importResults.collections[collectionName].errors.push(error.message);
        importResults.summary.failedImports++;
      }
    }

    // Log the import operation
    try {
      await db.collection('audit_logs').insertOne({
        action: 'data_import',
        userId: session.user.userId,
        timestamp: new Date(),
        details: {
          collections: Object.keys(importData.data),
          mode: options.mode || 'default',
          summary: importResults.summary
        }
      });
    } catch (error) {
      console.error('Error logging import operation:', error);
    }

    return NextResponse.json({
      success: true,
      results: importResults
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}

// GET endpoint to validate import file
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Owner/Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fileContent = searchParams.get('content');

    if (!fileContent) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 });
    }

    let importData;
    try {
      importData = JSON.parse(fileContent);
    } catch (error) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid JSON format' 
      });
    }

    // Validate structure
    if (!importData.metadata || !importData.data) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid backup file structure' 
      });
    }

    // Analyze the file
    const analysis = {
      valid: true,
      metadata: importData.metadata,
      collections: Object.keys(importData.data),
      totalDocuments: Object.values(importData.data).reduce((sum, col) => {
        return sum + (col.documents ? col.documents.length : 0);
      }, 0),
      estimatedSize: JSON.stringify(importData).length
    };

    return NextResponse.json(analysis);

  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json({ 
      valid: false, 
      error: 'Validation failed' 
    });
  }
}
