import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { canAccess } from '@/lib/roles';
import clientPromise from '@/lib/mongo';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canAccess(session.user.role, 'admin')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const backupFile = formData.get('backup');
    
    if (!backupFile) {
      return NextResponse.json({ error: 'No backup file provided' }, { status: 400 });
    }

    // Parse the backup file
    const backupText = await backupFile.text();
    let backup;
    
    try {
      backup = JSON.parse(backupText);
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid backup file format' }, { status: 400 });
    }

    // Validate backup structure
    if (!backup.collections || !backup.timestamp) {
      return NextResponse.json({ error: 'Invalid backup file structure' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);

    // Create a backup before restoring (safety measure)
    const preRestoreBackup = {
      timestamp: new Date(),
      version: '1.0.0',
      createdBy: session.user.userId,
      type: 'pre_restore_backup',
      collections: {}
    };

    const collections = await db.listCollections().toArray();
    for (const collectionInfo of collections) {
      const collectionName = collectionInfo.name;
      const collection = db.collection(collectionName);
      const documents = await collection.find({}).toArray();
      
      preRestoreBackup.collections[collectionName] = {
        count: documents.length,
        documents: documents
      };
    }

    // Store pre-restore backup
    const backupCollection = db.collection('system_backups');
    await backupCollection.insertOne(preRestoreBackup);

    // Restore collections
    const restoredCollections = [];
    const totalRestoredDocuments = 0;

    for (const [collectionName, collectionData] of Object.entries(backup.collections)) {
      if (collectionData.documents && Array.isArray(collectionData.documents)) {
        const collection = db.collection(collectionName);
        
        // Clear existing data (optional - you might want to merge instead)
        await collection.deleteMany({});
        
        // Insert restored documents
        if (collectionData.documents.length > 0) {
          await collection.insertMany(collectionData.documents);
        }
        
        restoredCollections.push({
          name: collectionName,
          documents: collectionData.documents.length
        });
      }
    }

    // Log the restore action
    const auditCollection = db.collection('audit_logs');
    await auditCollection.insertOne({
      type: 'system_restore_completed',
      message: 'System restored from backup',
      user: session.user.userId,
      severity: 'warning',
      metadata: { 
        originalBackupTimestamp: backup.timestamp,
        originalBackupCreatedBy: backup.createdBy,
        restoredCollections: restoredCollections,
        totalRestoredDocuments: restoredCollections.reduce((sum, col) => sum + col.documents, 0)
      },
      timestamp: new Date()
    });

    return NextResponse.json({ 
      success: true,
      restoredCollections: restoredCollections,
      totalRestoredDocuments: restoredCollections.reduce((sum, col) => sum + col.documents, 0),
      originalBackupTimestamp: backup.timestamp
    });

  } catch (error) {
    console.error('Failed to restore backup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
