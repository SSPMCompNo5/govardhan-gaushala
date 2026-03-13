import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongo';

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB);

        // Run all counts in parallel
        const [
            usersCount,
            activeUsersCount,
            cowsCount,
            inventoryItems,
            gateLogsToday,
            alerts,
            recentActivity
        ] = await Promise.all([
            // Users
            db.collection('users').countDocuments(),
            db.collection('users').countDocuments({ lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),

            // Cows
            db.collection('cows').countDocuments(),

            // Inventory (need data to calc low stock)
            db.collection('foodInventory').find({}, { projection: { status: 1 } }).toArray(),

            // Gate logs (today)
            db.collection('gateLogs').find({
                at: { $regex: new RegExp(`^${new Date().toISOString().split('T')[0]}`) }
            }).toArray(),

            // Alerts
            db.collection('alerts').find({ status: 'active' }).toArray(),

            // Activity (recent 5)
            db.collection('auditLogs').find().sort({ timestamp: -1 }).limit(5).toArray()
        ]);

        const lowStockCount = inventoryItems.filter(i => i.status === 'low' || i.status === 'critical').length;

        // Process gate logs
        const todayEntries = gateLogsToday.filter(l => l.type === 'entry').length;
        const todayExits = gateLogsToday.filter(l => l.type === 'exit').length;

        // Process alerts
        const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length;

        // Construct response
        const data = {
            stats: {
                totalUsers: usersCount,
                activeUsers: activeUsersCount,
                totalCattle: cowsCount,
                totalInventory: inventoryItems.length,
                lowStockItems: lowStockCount,
                criticalAlerts,
                todayEntries,
                todayExits,
                systemHealth: criticalAlerts > 5 ? 'warning' : 'healthy',
                lastBackup: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Mock for now
            },
            recentActivity: recentActivity.map(a => ({
                id: a._id,
                message: a.action || 'System Action',
                user: a.actor || 'System',
                time: a.timestamp,
                severity: 'info'
            })),
            systemAlerts: alerts.slice(0, 5).map(a => ({
                id: a._id,
                title: a.title,
                message: a.message,
                type: a.severity === 'critical' ? 'critical' : 'warning'
            }))
        };

        return NextResponse.json(data);
    } catch (error) {
        console.error('Dashboard Stats Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard stats' },
            { status: 500 }
        );
    }
}
