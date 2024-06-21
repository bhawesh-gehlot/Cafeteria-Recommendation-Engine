import pool from '../utils/db';
import { RowDataPacket } from 'mysql2';

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

        async getRecommendedItems(mealTime: string): Promise<string[]> {
        // Fetch top 5 recommended items based on sentiment score and average rating
        const [recommendedItems] = await pool.query<RowDataPacket[]>(
            `SELECT Menu.item_name
            FROM Menu
            JOIN Sentiments ON Menu.menu_item_id = Sentiments.menu_item_id
            WHERE Menu.meal_time = ?
            ORDER BY Sentiments.sentiment_score DESC, Sentiments.average_rating DESC
            LIMIT 5`,
            [mealTime]
        );
        
        return recommendedItems.map(item => item.item_name);
    }

    async rolloutMenuItems(mealTime: string, itemNames: string[], ws): Promise<string> {
        const today = new Date().toISOString().slice(0, 10);
        const [existingRollout] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM RolledOutItems WHERE date = ? AND meal_time = ?',
            [today, mealTime]
        );
    
        if (existingRollout.length > 0) {
            return 'Menu items have already been rolled out for today. Please wait until tomorrow.';
        }
    
        for (const itemName of itemNames) {
            const [item] = await pool.query<RowDataPacket[]>('SELECT menu_item_id FROM Menu WHERE item_name = ? AND meal_time = ?', [itemName, mealTime]);
            if (item.length === 0) {
                return `Menu item ${itemName} does not exist for ${mealTime}.`;
            }
            await pool.query(
                'INSERT INTO RolledOutItems (menu_item_id, meal_time, date) VALUES (?, ?, ?)',
                [item[0].menu_item_id, mealTime, today]
            );
        }
    
        return `Menu items for ${mealTime} rolled out successfully.`;
    }

    async getRolledOutItems(mealTime: string): Promise<string[]> {
        const today = new Date().toISOString().slice(0, 10);
        const [rolledOutItems] = await pool.query<RowDataPacket[]>(
            'SELECT Menu.item_name FROM RolledOutItems JOIN Menu ON RolledOutItems.menu_item_id = Menu.menu_item_id WHERE RolledOutItems.date = ? AND RolledOutItems.meal_time = ?',
            [today, mealTime]
        );
    
        return rolledOutItems.map(item => item.item_name);
    }

    async selectMenuItem(username: string, menuItemName: string, mealTime: string, ws): Promise<string> {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const date = tomorrow.toISOString().slice(0, 10);

        const [empId] = await pool.query('SELECT emp_id FROM Users WHERE username = ?', [username]);
    
        const [existingSelection] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM EmployeeSelections WHERE emp_id = ? AND date = ? AND meal_time = ?',
            [empId, date, mealTime]
        );
    
        if (existingSelection.length > 0) {
            return 'You have already selected the menu item for tomorrow.';
        }

        // const rolledOutItems = await this.getRolledOutItems(mealTime);
        // const message = `Rolled out items for ${mealTime}: ${rolledOutItems}`;
        // ws.send(JSON.stringify({ status: message ? 'printMessage' : 'error', message }));
    
        const [menuItem] = await pool.query<RowDataPacket[]>('SELECT menu_item_id FROM Menu WHERE item_name = ? AND meal_time = ?', [menuItemName, mealTime]);
    
        if (menuItem.length === 0) {
            return `Menu item ${menuItemName} does not exist for ${mealTime}.`;
        }
    
        await pool.query(
            'INSERT INTO EmployeeSelections (emp_id, menu_item_id, meal_time, date) VALUES (?, ?, ?, ?)',
            [empId[0].emp_id, menuItem[0].menu_item_id, mealTime, date]
        );
    
        return `Menu item for ${mealTime} selected successfully.`;
    }

    async checkResponses(mealTime: string): Promise<string> {
        const today = new Date().toISOString().slice(0, 10);
        const [responses] = await pool.query<Response[]>(
            `SELECT Menu.item_name, COUNT(EmployeeSelections.menu_item_id) as vote_count
            FROM EmployeeSelections
            JOIN Menu ON EmployeeSelections.menu_item_id = Menu.menu_item_id
            WHERE EmployeeSelections.date = ? AND EmployeeSelections.meal_time = ?
            GROUP BY EmployeeSelections.menu_item_id`,
            [today, mealTime]
        );
    
        let responseString = `--- Responses for ${mealTime} ---\n`;
        responses.forEach((response: any) => {
            responseString += `Item: ${response.item_name}, Votes: ${response.vote_count}\n`;
        });
    
        return responseString;
    }

    async selectFoodToPrepare(today, mealTime) {
        const [responses] = await pool.query<RowDataPacket[]>(
            `SELECT Menu.item_name, COUNT(EmployeeSelections.menu_item_id) as vote_count
            FROM EmployeeSelections
            JOIN Menu ON EmployeeSelections.menu_item_id = Menu.menu_item_id
            WHERE EmployeeSelections.date = ? AND EmployeeSelections.meal_time = ?
            GROUP BY EmployeeSelections.menu_item_id
            ORDER BY vote_count DESC`,
            [today, mealTime]
        );

        return responses;
    }
    
    async saveSelectedMeal(data) {
        const today = new Date().toISOString().slice(0, 10);

        const [breakfast_meal] = await pool.query<RowDataPacket[]>('SELECT menu_item_id FROM Menu where item_name = ?', [data.mealForBreakfast]);
        const [lunch_meal] = await pool.query<RowDataPacket[]>('SELECT menu_item_id FROM Menu where item_name = ?', [data.mealForLunch]);
        const [dinner_meal] = await pool.query<RowDataPacket[]>('SELECT menu_item_id FROM Menu where item_name = ?', [data.mealForDinner]);

        await pool.query<RowDataPacket[]>('INSERT INTO SelectedMeals (menu_item_id, meal_time, date) VALUES (?, \'breakfast\', ?), (?, \'lunch\', ?), (?, \'dinner\', ?)', [breakfast_meal[0].menu_item_id, today, lunch_meal[0].menu_item_id, today, dinner_meal[0].menu_item_id, today,]);
        return 'Meals for today saved successfully.';
    }

    async getSelectedMeal() {
        const today = new Date().toISOString().slice(0, 10);
        const [row] = await pool.query<RowDataPacket[]>('SELECT menu_item_id, meal_time FROM SelectedMeals WHERE date = ?', [today]);
        // console.log("222222222222222", row);
        // for(const obj of row) {
        //     const [item_name] = await pool.query<RowDataPacket[]>('SELECT item_name FROM Menu WHERE menu_item_id = ?', [obj.menu_item_id]);
        //     console.log("1111111111111111111", item_name);
        //     row[obj?.menu_item_id] = item_name[0]?.item_name;
        // }
        return row;
    }

    async provideFeedback(data) {
        const today = new Date().toISOString().slice(0, 10);
        const [row] = await pool.query<RowDataPacket[]>('SELECT emp_id FROM Users WHERE username = ?', [data.username]);
        const [response] = await pool.query<RowDataPacket[]>(
            'INSERT INTO RatingsAndComments (menu_item_id, emp_id, rating, comment, date_posted) VALUES (?, ?, ?, ?, ?)',
            [data.menu_item_id, row[0].emp_id, data.rating, data.comment, today]
        );
        if(response.length > 0) {
            return true;
        } else {
            return false;
        }
    }
}

interface Response extends RowDataPacket {
    item_name: string;
    vote_count: number;
}