import { ResultSetHeader } from 'mysql2';
import pool from '../utils/db';

export async function createNotification(userRole: string, message: string) {
    await pool.query('INSERT INTO Notifications (user_role, message) VALUES (?, ?)', [userRole, message]);
}

export async function getLatestNotifications(userRole: string, limit: number = 10) {
    const [notifications] = await pool.query<ResultSetHeader[]>('SELECT * FROM Notifications WHERE user_role = ? ORDER BY date_created DESC LIMIT ?', [userRole, limit]);
    return notifications;
}
