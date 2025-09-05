import 'server-only';
import { backupScheduler } from './backupScheduler.js';
import { backupService } from './backup.js';

// Initialize backup system on server startup
export async function initializeBackupSystem() {
  try {
    console.log('Initializing backup system...');
    
    // Start backup scheduler
    backupScheduler.start();
    
    // Create initial backup if none exist
    const backups = await backupService.listBackups();
    if (backups.length === 0) {
      console.log('No backups found, creating initial backup...');
      try {
        await backupService.createBackup({
          collections: [],
          includeIndexes: true,
          compression: true,
          encryption: false,
          retentionDays: 30,
          maxBackups: 10
        });
        console.log('✅ Initial backup created successfully');
      } catch (error) {
        console.error('❌ Failed to create initial backup:', error);
      }
    }
    
    console.log('✅ Backup system initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize backup system:', error);
    return false;
  }
}

// Graceful shutdown
export async function shutdownBackupSystem() {
  try {
    console.log('Shutting down backup system...');
    
    // Stop backup scheduler
    backupScheduler.stop();
    
    // Flush any pending backup operations
    await backupService.cleanupOldBackups({
      retentionDays: 30,
      maxBackups: 10
    });
    
    console.log('✅ Backup system shutdown successfully');
    return true;
  } catch (error) {
    console.error('❌ Error during backup system shutdown:', error);
    return false;
  }
}
