import 'server-only';
import { backupService } from './backup.js';
import { disasterRecoveryService } from './disasterRecovery.js';

// Backup scheduler service
export class BackupScheduler {
  constructor() {
    this.scheduledJobs = new Map();
    this.isRunning = false;
  }

  // Start the backup scheduler
  start() {
    if (this.isRunning) {
      console.log('Backup scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('✅ Backup scheduler started');

    // Run initial cleanup
    this.runScheduledTasks();

    // Schedule regular tasks
    this.scheduleRegularTasks();
  }

  // Stop the backup scheduler
  stop() {
    if (!this.isRunning) {
      console.log('Backup scheduler is not running');
      return;
    }

    // Clear all scheduled jobs
    for (const [jobId, intervalId] of this.scheduledJobs) {
      clearInterval(intervalId);
      console.log(`Stopped scheduled job: ${jobId}`);
    }

    this.scheduledJobs.clear();
    this.isRunning = false;
    console.log('✅ Backup scheduler stopped');
  }

  // Schedule regular tasks
  scheduleRegularTasks() {
    // Run cleanup every hour
    const cleanupInterval = setInterval(async () => {
      try {
        await this.runScheduledTasks();
      } catch (error) {
        console.error('Error in scheduled cleanup:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    this.scheduledJobs.set('cleanup', cleanupInterval);

    // Run disaster recovery tests daily
    const drTestInterval = setInterval(async () => {
      try {
        await disasterRecoveryService.scheduleRecoveryTests();
      } catch (error) {
        console.error('Error in scheduled disaster recovery tests:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    this.scheduledJobs.set('dr-tests', drTestInterval);

    console.log('✅ Scheduled regular tasks configured');
  }

  // Run scheduled tasks
  async runScheduledTasks() {
    try {
      console.log('Running scheduled backup tasks...');

      // Cleanup old backups
      await backupService.cleanupOldBackups({
        retentionDays: 30,
        maxBackups: 10
      });

      // Run disaster recovery tests
      await disasterRecoveryService.scheduleRecoveryTests();

      console.log('✅ Scheduled backup tasks completed');
    } catch (error) {
      console.error('Error running scheduled backup tasks:', error);
    }
  }

  // Schedule a custom backup job
  scheduleBackupJob(jobId, config, interval) {
    if (this.scheduledJobs.has(jobId)) {
      console.warn(`Backup job ${jobId} already exists`);
      return false;
    }

    const intervalId = setInterval(async () => {
      try {
        console.log(`Running scheduled backup job: ${jobId}`);
        await backupService.createBackup(config);
        await backupService.cleanupOldBackups(config);
      } catch (error) {
        console.error(`Error in scheduled backup job ${jobId}:`, error);
      }
    }, interval);

    this.scheduledJobs.set(jobId, intervalId);
    console.log(`✅ Scheduled backup job: ${jobId}`);
    return true;
  }

  // Cancel a scheduled backup job
  cancelBackupJob(jobId) {
    const intervalId = this.scheduledJobs.get(jobId);
    if (intervalId) {
      clearInterval(intervalId);
      this.scheduledJobs.delete(jobId);
      console.log(`✅ Cancelled backup job: ${jobId}`);
      return true;
    }
    return false;
  }

  // Get status of scheduled jobs
  getStatus() {
    return {
      isRunning: this.isRunning,
      scheduledJobs: Array.from(this.scheduledJobs.keys()),
      jobCount: this.scheduledJobs.size
    };
  }

  // Get job details
  getJobDetails(jobId) {
    const intervalId = this.scheduledJobs.get(jobId);
    return {
      exists: !!intervalId,
      jobId,
      status: intervalId ? 'active' : 'inactive'
    };
  }
}

export const backupScheduler = new BackupScheduler();
