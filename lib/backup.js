import 'server-only';
import clientPromise from './mongo.js';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'crypto';

// Backup schemas
export const BackupConfigSchema = z.object({
  collections: z.array(z.string()).optional(),
  includeIndexes: z.boolean().default(true),
  compression: z.boolean().default(true),
  encryption: z.boolean().default(false),
  retentionDays: z.number().min(1).max(365).default(30),
  schedule: z.enum(['hourly', 'daily', 'weekly', 'monthly']).default('daily'),
  maxBackups: z.number().min(1).max(100).default(10)
});

export const RestoreConfigSchema = z.object({
  backupId: z.string(),
  collections: z.array(z.string()).optional(),
  mode: z.enum(['replace', 'merge', 'skip']).default('replace'),
  validateData: z.boolean().default(true),
  createIndexes: z.boolean().default(true)
});

// Backup service
export class BackupService {
  constructor() {
    this.db = null;
    this.backupDir = path.join(process.cwd(), 'backups');
    this.ensureBackupDirectory();
  }

  async connect() {
    if (!this.db) {
      const client = await clientPromise;
      this.db = client.db(process.env.MONGODB_DB);
    }
    return this.db;
  }

  async ensureBackupDirectory() {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });
    } catch (error) {
      console.error('Error creating backup directory:', error);
    }
  }

  // Create a full database backup
  async createBackup(config = {}) {
    const validatedConfig = BackupConfigSchema.parse(config);
    const db = await this.connect();
    
    const backupId = this.generateBackupId();
    const timestamp = new Date().toISOString();
    const backupPath = path.join(this.backupDir, `${backupId}.json`);
    
    try {
      console.log(`Starting backup: ${backupId}`);
      
      const backup = {
        id: backupId,
        timestamp,
        config: validatedConfig,
        collections: {},
        metadata: {
          version: '1.0.0',
          nodeVersion: process.version,
          platform: process.platform,
          totalSize: 0,
          collectionCount: 0
        }
      };

      // Get all collections if not specified
      const collections = validatedConfig.collections || await this.getAllCollections();
      
      for (const collectionName of collections) {
        console.log(`Backing up collection: ${collectionName}`);
        
        const collection = db.collection(collectionName);
        const documents = await collection.find({}).toArray();
        
        // Get indexes if requested
        let indexes = [];
        if (validatedConfig.includeIndexes) {
          indexes = await collection.indexes();
        }
        
        backup.collections[collectionName] = {
          documents,
          indexes,
          count: documents.length,
          size: JSON.stringify(documents).length
        };
        
        backup.metadata.totalSize += backup.collections[collectionName].size;
        backup.metadata.collectionCount++;
      }

      // Write backup to file
      const backupData = JSON.stringify(backup, null, 2);
      await fs.writeFile(backupPath, backupData, 'utf8');
      
      // Create backup record in database
      await this.createBackupRecord(backup);
      
      console.log(`Backup completed: ${backupId}`);
      
      return {
        success: true,
        backupId,
        path: backupPath,
        size: backupData.length,
        collections: Object.keys(backup.collections),
        metadata: backup.metadata
      };
      
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  // Restore from backup
  async restoreBackup(config) {
    const validatedConfig = RestoreConfigSchema.parse(config);
    const db = await this.connect();
    
    try {
      console.log(`Starting restore from backup: ${validatedConfig.backupId}`);
      
      // Load backup file
      const backupPath = path.join(this.backupDir, `${validatedConfig.backupId}.json`);
      const backupData = await fs.readFile(backupPath, 'utf8');
      const backup = JSON.parse(backupData);
      
      // Validate backup
      if (validatedConfig.validateData) {
        await this.validateBackup(backup);
      }
      
      const collections = validatedConfig.collections || Object.keys(backup.collections);
      
      for (const collectionName of collections) {
        if (!backup.collections[collectionName]) {
          console.warn(`Collection ${collectionName} not found in backup`);
          continue;
        }
        
        console.log(`Restoring collection: ${collectionName}`);
        
        const collection = db.collection(collectionName);
        const collectionData = backup.collections[collectionName];
        
        // Handle different restore modes
        if (validatedConfig.mode === 'replace') {
          // Drop existing collection and recreate
          await collection.drop().catch(() => {}); // Ignore if collection doesn't exist
          await db.createCollection(collectionName);
        }
        
        // Insert documents
        if (collectionData.documents.length > 0) {
          if (validatedConfig.mode === 'merge') {
            // Use upsert for merge mode
            for (const doc of collectionData.documents) {
              await collection.replaceOne(
                { _id: doc._id },
                doc,
                { upsert: true }
              );
            }
          } else {
            // Insert all documents
            await collection.insertMany(collectionData.documents);
          }
        }
        
        // Recreate indexes
        if (validatedConfig.createIndexes && collectionData.indexes) {
          for (const index of collectionData.indexes) {
            if (index.name !== '_id_') { // Skip default _id index
              try {
                await collection.createIndex(index.key, index.options || {});
              } catch (error) {
                console.warn(`Failed to create index ${index.name}:`, error.message);
              }
            }
          }
        }
      }
      
      console.log(`Restore completed: ${validatedConfig.backupId}`);
      
      return {
        success: true,
        backupId: validatedConfig.backupId,
        collections,
        mode: validatedConfig.mode
      };
      
    } catch (error) {
      console.error('Error restoring backup:', error);
      throw error;
    }
  }

  // List available backups
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files.filter(file => file.endsWith('.json'));
      
      const backups = [];
      
      for (const file of backupFiles) {
        try {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          const backupId = file.replace('.json', '');
          
          // Try to read backup metadata
          const backupData = await fs.readFile(filePath, 'utf8');
          const backup = JSON.parse(backupData);
          
          backups.push({
            id: backupId,
            timestamp: backup.timestamp,
            size: stats.size,
            collections: Object.keys(backup.collections),
            metadata: backup.metadata
          });
        } catch (error) {
          console.warn(`Error reading backup file ${file}:`, error.message);
        }
      }
      
      return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
    } catch (error) {
      console.error('Error listing backups:', error);
      throw error;
    }
  }

  // Delete backup
  async deleteBackup(backupId) {
    try {
      const backupPath = path.join(this.backupDir, `${backupId}.json`);
      await fs.unlink(backupPath);
      
      // Remove backup record from database
      await this.deleteBackupRecord(backupId);
      
      return { success: true, backupId };
      
    } catch (error) {
      console.error('Error deleting backup:', error);
      throw error;
    }
  }

  // Cleanup old backups
  async cleanupOldBackups(config = {}) {
    const validatedConfig = BackupConfigSchema.parse(config);
    const backups = await this.listBackups();
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - validatedConfig.retentionDays);
    
    const oldBackups = backups.filter(backup => 
      new Date(backup.timestamp) < cutoffDate
    );
    
    // Keep only the most recent backups up to maxBackups
    const sortedBackups = backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const excessBackups = sortedBackups.slice(validatedConfig.maxBackups);
    
    const backupsToDelete = [...oldBackups, ...excessBackups];
    
    for (const backup of backupsToDelete) {
      try {
        await this.deleteBackup(backup.id);
        console.log(`Deleted old backup: ${backup.id}`);
      } catch (error) {
        console.error(`Error deleting backup ${backup.id}:`, error);
      }
    }
    
    return {
      deleted: backupsToDelete.length,
      remaining: backups.length - backupsToDelete.length
    };
  }

  // Schedule automatic backups
  async scheduleBackups(config = {}) {
    const validatedConfig = BackupConfigSchema.parse(config);
    
    const scheduleInterval = this.getScheduleInterval(validatedConfig.schedule);
    
    setInterval(async () => {
      try {
        console.log('Running scheduled backup...');
        await this.createBackup(validatedConfig);
        await this.cleanupOldBackups(validatedConfig);
      } catch (error) {
        console.error('Error in scheduled backup:', error);
      }
    }, scheduleInterval);
    
    console.log(`Scheduled backups every ${validatedConfig.schedule}`);
  }

  // Utility methods
  generateBackupId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `backup_${timestamp}_${random}`;
  }

  async getAllCollections() {
    const db = await this.connect();
    const collections = await db.listCollections().toArray();
    return collections.map(col => col.name);
  }

  async createBackupRecord(backup) {
    const db = await this.connect();
    await db.collection('backupRecords').insertOne({
      id: backup.id,
      timestamp: backup.timestamp,
      config: backup.config,
      metadata: backup.metadata,
      status: 'completed',
      createdAt: new Date()
    });
  }

  async deleteBackupRecord(backupId) {
    const db = await this.connect();
    await db.collection('backupRecords').deleteOne({ id: backupId });
  }

  async validateBackup(backup) {
    if (!backup.id || !backup.timestamp || !backup.collections) {
      throw new Error('Invalid backup format');
    }
    
    // Additional validation can be added here
    return true;
  }

  getScheduleInterval(schedule) {
    const intervals = {
      hourly: 60 * 60 * 1000,      // 1 hour
      daily: 24 * 60 * 60 * 1000,   // 1 day
      weekly: 7 * 24 * 60 * 60 * 1000, // 1 week
      monthly: 30 * 24 * 60 * 60 * 1000 // 1 month
    };
    
    return intervals[schedule] || intervals.daily;
  }

  // Get backup statistics
  async getBackupStats() {
    const backups = await this.listBackups();
    const db = await this.connect();
    
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    const oldestBackup = backups[backups.length - 1];
    const newestBackup = backups[0];
    
    // Get backup records from database
    const backupRecords = await db.collection('backupRecords').find({}).toArray();
    const successfulBackups = backupRecords.filter(record => record.status === 'completed').length;
    const failedBackups = backupRecords.filter(record => record.status === 'failed').length;
    
    return {
      totalBackups: backups.length,
      totalSize,
      successfulBackups,
      failedBackups,
      oldestBackup: oldestBackup?.timestamp,
      newestBackup: newestBackup?.timestamp,
      averageSize: backups.length > 0 ? totalSize / backups.length : 0
    };
  }
}

export const backupService = new BackupService();
