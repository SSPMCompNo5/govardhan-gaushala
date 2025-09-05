import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

import clientPromise from '@/lib/mongo';
import { z } from 'zod';

const SettingsSchema = z.object({
  systemName: z.string().min(1).max(100),
  systemVersion: z.string().min(1).max(20),
  maintenanceMode: z.boolean(),
  debugMode: z.boolean(),
  sessionTimeout: z.number().min(5).max(480),
  maxLoginAttempts: z.number().min(3).max(10),
  passwordMinLength: z.number().min(6).max(20),
  requireStrongPasswords: z.boolean(),
  emailNotifications: z.boolean(),
  smsNotifications: z.boolean(),
  lowStockAlerts: z.boolean(),
  criticalAlerts: z.boolean(),
  dailyReports: z.boolean(),
  autoBackup: z.boolean(),
  backupFrequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
  backupRetention: z.number().min(1).max(365),
  cacheEnabled: z.boolean(),
  cacheTimeout: z.number().min(60).max(3600),
  maxConnections: z.number().min(10).max(1000)
});

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'Admin' && session.user.role !== 'Owner/Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection('system_settings');

    // Get current settings or return defaults
    const settingsDoc = await collection.findOne({ type: 'system' });
    const settings = settingsDoc?.settings || {
      systemName: 'Govardhan Goshala',
      systemVersion: '1.0.0',
      maintenanceMode: false,
      debugMode: false,
      sessionTimeout: 30,
      maxLoginAttempts: 5,
      passwordMinLength: 8,
      requireStrongPasswords: true,
      emailNotifications: true,
      smsNotifications: false,
      lowStockAlerts: true,
      criticalAlerts: true,
      dailyReports: true,
      autoBackup: true,
      backupFrequency: 'daily',
      backupRetention: 30,
      cacheEnabled: true,
      cacheTimeout: 300,
      maxConnections: 100
    };

    return NextResponse.json({ success: true, data: { settings } });

  } catch (error) {
    console.error('Failed to fetch system settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'Admin' && session.user.role !== 'Owner/Admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedSettings = SettingsSchema.parse(body.settings);

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB);
    const collection = db.collection('system_settings');

    // Upsert settings
    await collection.updateOne(
      { type: 'system' },
      { 
        $set: { 
          settings: validatedSettings,
          updatedAt: new Date(),
          updatedBy: session.user.userId || session.user.id
        }
      },
      { upsert: true }
    );

    // Log the settings change
    const auditCollection = db.collection('audit_logs');
    await auditCollection.insertOne({
      type: 'system_settings_updated',
      message: 'System settings updated',
      user: session.user.userId || session.user.id,
      severity: 'info',
      metadata: { settings: validatedSettings },
      timestamp: new Date()
    });

    return NextResponse.json({ success: true, settings: validatedSettings });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid settings data', details: error.errors }, { status: 400 });
    }
    
    console.error('Failed to update system settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
