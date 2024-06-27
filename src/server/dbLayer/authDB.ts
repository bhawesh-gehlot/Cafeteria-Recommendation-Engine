import bcrypt from 'bcrypt';
import pool from '../utils/db';
import { UserId, UserPassword, UserRole } from '../definitions/Interfaces';

export class AuthDB {
    async userExists(username: string): Promise<boolean> {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query<UserId[]>('SELECT COUNT(*) as count FROM User WHERE username = ?', [username]);
            return rows[0].count > 0;
        } finally {
            connection.release();
        }
    }

    async authenticate(username: string, password: string): Promise<boolean> {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query<UserPassword[]>('SELECT password FROM User WHERE username = ?', [username]);
            if (rows.length > 0) {
                const user = rows[0];
                return await bcrypt.compare(password, user.password);
            }
            return false;
        } finally {
            connection.release();
        }
    }

    async getUserRole(username: string): Promise<string | null> {
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query<UserRole[]>('SELECT role FROM User WHERE username = ?', [username]);
            if (rows.length > 0) {
                return rows[0].role;
            }
            return null;
        } finally {
            connection.release();
        }
    }

    async logLogin(username: string, logType: string): Promise<void> {
        const date = new Date();
        const connection = await pool.getConnection();
        try {
            const [rows] = await connection.query<UserId[]>('SELECT emp_id FROM User WHERE username = ?', [username]);
            if (rows.length > 0) {
                await connection.query('INSERT INTO Login_Log (emp_id, log_type, date) VALUES (?, ?, ?)', [rows[0].emp_id, logType, date]);
            }
        } finally {
            connection.release();
        }
    }
}
