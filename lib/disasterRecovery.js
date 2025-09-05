import 'server-only';
import clientPromise from './mongo.js';
import { z } from 'zod';
import { backupService } from './backup.js';

// Disaster Recovery schemas
export const RecoveryPlanSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  backupId: z.string(),
  collections: z.array(z.string()).optional(),
  restoreMode: z.enum(['replace', 'merge', 'skip']).default('replace'),
  validation: z.boolean().default(true),
  notifications: z.object({
    email: z.array(z.string().email()).optional(),
    webhook: z.string().url().optional()
  }).optional(),
  schedule: z.object({
    enabled: z.boolean().default(false),
    frequency: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
    time: z.string().default('02:00')
  }).optional()
});

export const RecoveryTestSchema = z.object({
  planId: z.string(),
  testMode: z.boolean().default(true),
  validateOnly: z.boolean().default(true),
  notifyResults: z.boolean().default(true)
});

// Disaster Recovery service
export class DisasterRecoveryService {
  constructor() {
    this.db = null;
  }

  async connect() {
    if (!this.db) {
      const client = await clientPromise;
      this.db = client.db(process.env.MONGODB_DB);
    }
    return this.db;
  }

  // Create a disaster recovery plan
  async createRecoveryPlan(planData) {
    const validatedPlan = RecoveryPlanSchema.parse(planData);
    const db = await this.connect();
    
    try {
      const plan = {
        ...validatedPlan,
        id: this.generatePlanId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        status: 'active',
        lastTested: null,
        testResults: []
      };

      await db.collection('recoveryPlans').insertOne(plan);
      
      console.log(`Recovery plan created: ${plan.id}`);
      
      return {
        success: true,
        planId: plan.id,
        plan: plan
      };
      
    } catch (error) {
      console.error('Error creating recovery plan:', error);
      throw error;
    }
  }

  // Execute disaster recovery
  async executeRecovery(planId, options = {}) {
    const db = await this.connect();
    
    try {
      console.log(`Executing disaster recovery for plan: ${planId}`);
      
      // Get recovery plan
      const plan = await db.collection('recoveryPlans').findOne({ id: planId });
      if (!plan) {
        throw new Error('Recovery plan not found');
      }

      if (plan.status !== 'active') {
        throw new Error('Recovery plan is not active');
      }

      // Validate backup exists
      const backups = await backupService.listBackups();
      const backup = backups.find(b => b.id === plan.backupId);
      if (!backup) {
        throw new Error('Backup not found');
      }

      // Execute restore
      const restoreResult = await backupService.restoreBackup({
        backupId: plan.backupId,
        collections: plan.collections,
        mode: plan.restoreMode,
        validateData: plan.validation,
        createIndexes: true
      });

      // Update plan with execution record
      await db.collection('recoveryPlans').updateOne(
        { id: planId },
        {
          $set: {
            lastExecuted: new Date(),
            updatedAt: new Date()
          },
          $push: {
            executionHistory: {
              timestamp: new Date(),
              result: restoreResult,
              status: 'completed'
            }
          }
        }
      );

      // Send notifications if configured
      if (plan.notifications) {
        await this.sendRecoveryNotification(plan, restoreResult, 'success');
      }

      console.log(`Disaster recovery completed for plan: ${planId}`);
      
      return {
        success: true,
        planId,
        result: restoreResult
      };
      
    } catch (error) {
      console.error('Error executing disaster recovery:', error);
      
      // Update plan with failure record
      await db.collection('recoveryPlans').updateOne(
        { id: planId },
        {
          $set: {
            lastExecuted: new Date(),
            updatedAt: new Date()
          },
          $push: {
            executionHistory: {
              timestamp: new Date(),
              error: error.message,
              status: 'failed'
            }
          }
        }
      );

      // Send failure notification
      const plan = await db.collection('recoveryPlans').findOne({ id: planId });
      if (plan && plan.notifications) {
        await this.sendRecoveryNotification(plan, { error: error.message }, 'failure');
      }

      throw error;
    }
  }

  // Test disaster recovery plan
  async testRecoveryPlan(planId, options = {}) {
    const validatedOptions = RecoveryTestSchema.parse({ planId, ...options });
    const db = await this.connect();
    
    try {
      console.log(`Testing recovery plan: ${planId}`);
      
      // Get recovery plan
      const plan = await db.collection('recoveryPlans').findOne({ id: planId });
      if (!plan) {
        throw new Error('Recovery plan not found');
      }

      const testResult = {
        planId,
        timestamp: new Date(),
        testMode: validatedOptions.testMode,
        validateOnly: validatedOptions.validateOnly,
        status: 'running'
      };

      if (validatedOptions.validateOnly) {
        // Only validate backup and plan
        const backups = await backupService.listBackups();
        const backup = backups.find(b => b.id === plan.backupId);
        
        if (!backup) {
          testResult.status = 'failed';
          testResult.error = 'Backup not found';
        } else {
          testResult.status = 'passed';
          testResult.details = {
            backupExists: true,
            backupSize: backup.size,
            backupCollections: backup.collections,
            planValid: true
          };
        }
      } else {
        // Full test restore (in test mode)
        try {
          const restoreResult = await backupService.restoreBackup({
            backupId: plan.backupId,
            collections: plan.collections,
            mode: 'skip', // Skip existing data in test mode
            validateData: true,
            createIndexes: false // Don't create indexes in test mode
          });

          testResult.status = 'passed';
          testResult.details = restoreResult;
        } catch (error) {
          testResult.status = 'failed';
          testResult.error = error.message;
        }
      }

      // Update plan with test result
      await db.collection('recoveryPlans').updateOne(
        { id: planId },
        {
          $set: {
            lastTested: new Date(),
            updatedAt: new Date()
          },
          $push: {
            testResults: testResult
          }
        }
      );

      // Send test notification if requested
      if (validatedOptions.notifyResults && plan.notifications) {
        await this.sendRecoveryNotification(plan, testResult, 'test');
      }

      console.log(`Recovery plan test completed: ${planId}`);
      
      return {
        success: true,
        planId,
        testResult
      };
      
    } catch (error) {
      console.error('Error testing recovery plan:', error);
      throw error;
    }
  }

  // List recovery plans
  async listRecoveryPlans() {
    const db = await this.connect();
    
    try {
      const plans = await db.collection('recoveryPlans').find({}).toArray();
      
      // Get backup information for each plan
      const backups = await backupService.listBackups();
      
      const plansWithBackupInfo = plans.map(plan => {
        const backup = backups.find(b => b.id === plan.backupId);
        return {
          ...plan,
          backupInfo: backup || null
        };
      });
      
      return plansWithBackupInfo.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
    } catch (error) {
      console.error('Error listing recovery plans:', error);
      throw error;
    }
  }

  // Update recovery plan
  async updateRecoveryPlan(planId, updates) {
    const db = await this.connect();
    
    try {
      const validatedUpdates = RecoveryPlanSchema.partial().parse(updates);
      
      const result = await db.collection('recoveryPlans').updateOne(
        { id: planId },
        {
          $set: {
            ...validatedUpdates,
            updatedAt: new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        throw new Error('Recovery plan not found');
      }

      return {
        success: true,
        planId,
        updated: result.modifiedCount > 0
      };
      
    } catch (error) {
      console.error('Error updating recovery plan:', error);
      throw error;
    }
  }

  // Delete recovery plan
  async deleteRecoveryPlan(planId) {
    const db = await this.connect();
    
    try {
      const result = await db.collection('recoveryPlans').deleteOne({ id: planId });
      
      if (result.deletedCount === 0) {
        throw new Error('Recovery plan not found');
      }

      return {
        success: true,
        planId
      };
      
    } catch (error) {
      console.error('Error deleting recovery plan:', error);
      throw error;
    }
  }

  // Get recovery plan statistics
  async getRecoveryStats() {
    const db = await this.connect();
    
    try {
      const plans = await db.collection('recoveryPlans').find({}).toArray();
      
      const stats = {
        totalPlans: plans.length,
        activePlans: plans.filter(p => p.status === 'active').length,
        inactivePlans: plans.filter(p => p.status === 'inactive').length,
        testedPlans: plans.filter(p => p.lastTested).length,
        untestedPlans: plans.filter(p => !p.lastTested).length,
        recentlyExecuted: plans.filter(p => {
          if (!p.lastExecuted) return false;
          const daysSince = (Date.now() - new Date(p.lastExecuted).getTime()) / (1000 * 60 * 60 * 24);
          return daysSince <= 7;
        }).length
      };

      return stats;
      
    } catch (error) {
      console.error('Error getting recovery stats:', error);
      throw error;
    }
  }

  // Send recovery notification
  async sendRecoveryNotification(plan, result, type) {
    try {
      const message = this.formatNotificationMessage(plan, result, type);
      
      // Email notifications
      if (plan.notifications?.email) {
        // Implementation would depend on email service
        console.log('Email notification:', message);
      }
      
      // Webhook notifications
      if (plan.notifications?.webhook) {
        // Implementation would depend on webhook service
        console.log('Webhook notification:', message);
      }
      
    } catch (error) {
      console.error('Error sending recovery notification:', error);
    }
  }

  // Format notification message
  formatNotificationMessage(plan, result, type) {
    const timestamp = new Date().toISOString();
    
    switch (type) {
      case 'success':
        return {
          type: 'recovery_success',
          planId: plan.id,
          planName: plan.name,
          timestamp,
          message: `Disaster recovery completed successfully for plan: ${plan.name}`,
          result
        };
        
      case 'failure':
        return {
          type: 'recovery_failure',
          planId: plan.id,
          planName: plan.name,
          timestamp,
          message: `Disaster recovery failed for plan: ${plan.name}`,
          error: result.error
        };
        
      case 'test':
        return {
          type: 'recovery_test',
          planId: plan.id,
          planName: plan.name,
          timestamp,
          message: `Recovery plan test ${result.status} for plan: ${plan.name}`,
          testResult: result
        };
        
      default:
        return {
          type: 'recovery_notification',
          planId: plan.id,
          planName: plan.name,
          timestamp,
          message: `Recovery plan notification for: ${plan.name}`,
          result
        };
    }
  }

  // Utility methods
  generatePlanId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `plan_${timestamp}_${random}`;
  }

  // Schedule recovery plan tests
  async scheduleRecoveryTests() {
    const db = await this.connect();
    
    try {
      const plans = await db.collection('recoveryPlans').find({
        status: 'active',
        'schedule.enabled': true
      }).toArray();

      for (const plan of plans) {
        if (this.shouldRunScheduledTest(plan)) {
          try {
            await this.testRecoveryPlan(plan.id, {
              testMode: true,
              validateOnly: true,
              notifyResults: true
            });
          } catch (error) {
            console.error(`Error in scheduled test for plan ${plan.id}:`, error);
          }
        }
      }
      
    } catch (error) {
      console.error('Error in scheduled recovery tests:', error);
    }
  }

  shouldRunScheduledTest(plan) {
    if (!plan.schedule?.enabled || !plan.lastTested) {
      return true;
    }

    const lastTest = new Date(plan.lastTested);
    const now = new Date();
    const daysSince = (now.getTime() - lastTest.getTime()) / (1000 * 60 * 60 * 24);

    switch (plan.schedule.frequency) {
      case 'daily':
        return daysSince >= 1;
      case 'weekly':
        return daysSince >= 7;
      case 'monthly':
        return daysSince >= 30;
      default:
        return false;
    }
  }
}

export const disasterRecoveryService = new DisasterRecoveryService();
