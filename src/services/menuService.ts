import pool from '../utils/db';

export class MenuService {
    async addFoodItem(name: string, price: number, mealTime: string, availabilityStatus: string): Promise<boolean> {
        try {
            const connection = await pool.getConnection();
            try {
                await connection.execute(
                    'INSERT INTO Menu (item_name, price, availability_status, meal_time) VALUES (?, ?, ?, ?)',
                    [name, price, availabilityStatus, mealTime]
                );
                return true;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    async removeFoodItem(name: string): Promise<boolean> {
        try {
            const connection = await pool.getConnection();
            try {
                const [result] = await connection.execute(
                    'DELETE FROM Menu WHERE item_name = ?',
                    [name]
                );
                return (result as any).affectedRows > 0;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    async updateFoodItemPrice(name: string, price: number): Promise<boolean> {
        try {
            const connection = await pool.getConnection();
            try {
                const [result] = await connection.execute(
                    'UPDATE Menu SET price = ? WHERE item_name = ?',
                    [price, name]
                );
                return (result as any).affectedRows > 0;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    async updateFoodItemAvailability(name: string, availabilityStatus: string): Promise<boolean> {
        try {
            const connection = await pool.getConnection();
            try {
                const [result] = await connection.execute(
                    'UPDATE Menu SET availability_status = ? WHERE item_name = ?',
                    [availabilityStatus, name]
                );
                return (result as any).affectedRows > 0;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error(error);
            return false;
        }
    }
}
