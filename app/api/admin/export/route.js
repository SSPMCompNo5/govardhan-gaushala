import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import clientPromise from '@/lib/mongo';
import { rateLimit, rateLimitKeyFromRequest } from '@/lib/rateLimit';
import { validateCSRFFromRequest } from '@/lib/csrf';

const limitExport = rateLimit({ windowMs: 60 * 1000, max: 5 }); // 5 exports per minute

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'Owner/Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const k = rateLimitKeyFromRequest(request, session.user?.userId);
    const r = await limitExport(k);
    if (r.limited) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    if (!validateCSRFFromRequest(request)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }

    const { collections, format = 'json', includeMetadata = true } = await request.json();

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: session.user.userId,
        version: '1.0',
        collections: collections || []
      },
      data: {}
    };

    // Define available collections
    const availableCollections = [
      'users',
      'gate_logs',
      'inventory_items',
      'feeding_logs',
      'feeding_schedules',
      'suppliers',
      'cows',
      'treatments',
      'vaccinations',
      'medicines',
      'medicine_batches',
      'medicine_usage',
      'medicine_wastage',
      'staff',
      'staff_tasks',
      'infrastructure_checklists',
      'infrastructure_maintenance',
      'infrastructure_assets',
      'alerts',
      'settings',
      'audit_logs'
    ];

    const collectionsToExport = collections && collections.length > 0 
      ? collections.filter(col => availableCollections.includes(col))
      : availableCollections;

    // Export each collection
    for (const collectionName of collectionsToExport) {
      try {
        const collection = db.collection(collectionName);
        const documents = await collection.find({}).toArray();
        
        exportData.data[collectionName] = {
          count: documents.length,
          documents: documents
        };
      } catch (error) {
        console.error(`Error exporting collection ${collectionName}:`, error);
        exportData.data[collectionName] = {
          count: 0,
          documents: [],
          error: error.message
        };
      }
    }

    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `goshala-backup-${timestamp}.${format}`;

    let responseData;
    let contentType;

    if (format === 'json') {
      responseData = JSON.stringify(exportData, null, 2);
      contentType = 'application/json';
    } else if (format === 'csv') {
      // Convert to CSV format (simplified)
      const csvData = convertToCSV(exportData);
      responseData = csvData;
      contentType = 'text/csv';
    } else {
      return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
    }

    return new NextResponse(responseData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(responseData).toString()
      }
    });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

function convertToCSV(exportData) {
  const csvRows = [];
  
  // Add metadata
  csvRows.push('Collection,Field,Value');
  csvRows.push(`metadata,exportedAt,"${exportData.metadata.exportedAt}"`);
  csvRows.push(`metadata,exportedBy,"${exportData.metadata.exportedBy}"`);
  csvRows.push(`metadata,version,"${exportData.metadata.version}"`);
  csvRows.push('');

  // Add data for each collection
  for (const [collectionName, collectionData] of Object.entries(exportData.data)) {
    if (collectionData.documents && collectionData.documents.length > 0) {
      csvRows.push(`# ${collectionName.toUpperCase()} (${collectionData.count} records)`);
      
      // Get all unique fields across all documents
      const allFields = new Set();
      collectionData.documents.forEach(doc => {
        Object.keys(doc).forEach(key => allFields.add(key));
      });
      
      // Create header row
      const headerRow = Array.from(allFields).join(',');
      csvRows.push(headerRow);
      
      // Add data rows
      collectionData.documents.forEach(doc => {
        const row = Array.from(allFields).map(field => {
          const value = doc[field];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
          if (typeof value === 'string' && value.includes(',')) return `"${value.replace(/"/g, '""')}"`;
          return value;
        }).join(',');
        csvRows.push(row);
      });
      
      csvRows.push('');
    }
  }
  
  return csvRows.join('\n');
}
