import bcrypt from 'bcrypt';
import pool from '../../utils/db';

export class AuthService {
    async userExists(username: string): Promise<boolean> {
        const connection = await pool.getConnection();
        try {
            const [rows]: any[] = await connection.query('SELECT COUNT(*) as count FROM Users WHERE username = ?', [username]);
            return rows[0].count > 0;
        } finally {
            connection.release();
        }
    }

    async authenticate(username: string, password: string): Promise<boolean> {
        const connection = await pool.getConnection();
        try {
            const [rows]: any[] = await connection.query('SELECT password FROM Users WHERE username = ?', [username]);
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
            const [rows]: any[] = await connection.query('SELECT role FROM Users WHERE username = ?', [username]);
            if (rows.length > 0) {
                return rows[0].role;
            }
            return null;
        } finally {
            connection.release();
        }
    }

    static async logLogin(username, logType) {
        const date = new Date()
        const connection = await pool.getConnection();
        try {
            const [rows]: any[] = await connection.query('SELECT emp_id FROM Users WHERE username = ?', [username]);
            if (rows.length > 0) {
                await connection.query('INSERT INTO LoginLog (emp_id, log_type, date) VALUES (?, ?, ?)', [rows[0].emp_id, logType, date]);
            }
            return null;
        } finally {
            connection.release();
        }
    }
}
