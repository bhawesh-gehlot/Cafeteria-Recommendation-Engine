import pool from '../utils/db';

export class NotificationDB {
    constructor() {}

    async createNotification(userRole: string, message: string): Promise<void> {
        try {
            await pool.query(
                'INSERT INTO Notification (user_role, message) VALUES (?, ?)', 
                [userRole, message]
            );
        } catch (error) {
            console.error(`Failed to create notification: ${error}`);
            throw new Error('Error creating notification.');
        }
    }

    async getLatestNotifications(userRole: string, limit: number = 10): Promise<any[]> {
        try {
            const [notifications] = await pool.query<any[]>(
                `SELECT * FROM Notification 
                 WHERE user_role = ? 
                 ORDER BY date_created DESC 
                 LIMIT ?`,
                [userRole, limit]
            );
            return notifications;
        } catch (error) {
            console.error(`Failed to retrieve notifications: ${error}`);
            throw new Error('Error retrieving notifications.');
        }
    }
}