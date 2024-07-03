import { DiscardMenuItem, MenuItem } from '../definitions/Interfaces';
import pool from '../utils/db';
import { RowDataPacket } from 'mysql2';

export class MenuDB {
    async addFoodItem(name: string, price: number, mealTime: string, availabilityStatus: string, itemAttributes): Promise<boolean> {
        try {
            const connection = await pool.getConnection();
            try {
                await connection.execute(
                    'INSERT INTO Menu (item_name, price, availability_status, meal_time) VALUES (?, ?, ?, ?)',
                    [name, price, availabilityStatus, mealTime]
                );
                const menu_item_id = await this.getItemIdByName(name);
                if (menu_item_id.length > 0) {
                    await connection.execute('INSERT INTO Menu_Item_Attribute (menu_item_id, food_type, spice_level, cuisine, sweet_tooth) VALUES (?, ?, ?, ?, ?)', [menu_item_id[0].menu_item_id, itemAttributes.foodPreference, itemAttributes.spiceLevel, itemAttributes.cuisine, itemAttributes.sweetTooth])
                }
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
        const [recommendedItems] = await pool.query<RowDataPacket[]>(
            `SELECT Menu.item_name
            FROM Menu
            JOIN Sentiment ON Menu.menu_item_id = Sentiment.menu_item_id
            WHERE Menu.meal_time = ?
            ORDER BY Sentiment.sentiment_score DESC, Sentiment.average_rating DESC
            LIMIT 5`,
            [mealTime]
        );

        return recommendedItems.map(item => item.item_name);
    }

    async rolloutMenuItems(mealTime: string, itemNames: string[], ws): Promise<string> {
        const today = new Date().toISOString().slice(0, 10);

        const [existingRollout] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM Rolledout_Item WHERE date = ? AND meal_time = ?',
            [today, mealTime]
        );

        if (existingRollout.length > 0) {
            return 'Menu items have already been rolled out for today. Please wait until tomorrow.';
        }

        for (const itemName of itemNames) {
            const [item] = await pool.query<RowDataPacket[]>(
                'SELECT menu_item_id FROM Menu WHERE item_name = ? AND meal_time = ?',
                [itemName, mealTime]
            );

            if (item.length === 0) {
                return `Menu item ${itemName} does not exist for ${mealTime}.`;
            }

            await pool.query(
                'INSERT INTO Rolledout_Item (menu_item_id, meal_time, date) VALUES (?, ?, ?)',
                [item[0].menu_item_id, mealTime, today]
            );
        }

        return `Menu items for ${mealTime} rolled out successfully.`;
    }

    async getRolledOutItems(mealTime: string, username: string): Promise<string[]> {
        const today = new Date().toISOString().slice(0, 10);
        const emp_id = await this.getEmpIdByUsername(username);
        const [userAttributes] = await pool.query<RowDataPacket[]>('SELECT food_preference, spice_level, cuisine, sweet_tooth FROM User_Profile WHERE emp_id = ?', [emp_id[0].emp_id]);

        const [rolledOutItems] = await pool.query<RowDataPacket[]>(
            `SELECT m.item_name
            FROM Rolledout_Item ri
            INNER JOIN Menu m ON ri.menu_item_id = m.menu_item_id
            INNER JOIN Menu_Item_Attribute mia ON m.menu_item_id = mia.menu_item_id
            WHERE ri.date = ? AND ri.meal_time = ?
            ORDER BY (CASE WHEN mia.food_type = ? THEN 0 ELSE 1 END),
            (CASE WHEN mia.spice_level = ? THEN 0 ELSE 1 END),
            (CASE WHEN mia.cuisine = ? THEN 0 ELSE 1 END),
            (CASE WHEN mia.sweet_tooth = ? THEN 0 ELSE 1 END) DESC`,
            [today, mealTime, userAttributes[0].food_preference, userAttributes[0].spice_level, userAttributes[0].cuisine, userAttributes[0].sweet_tooth]
        );

        return rolledOutItems.map(item => item.item_name);
    }

    async selectMenuItem(username: string, menuItemName: string, mealTime: string, ws): Promise<string> {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const date = tomorrow.toISOString().slice(0, 10);

        const empId = await this.getEmpIdByUsername(username);

        if (empId.length === 0) {
            return `User ${username} not found.`;
        }

        const [existingSelection] = await pool.query<RowDataPacket[]>(
            'SELECT * FROM Employee_Selection WHERE emp_id = ? AND date = ? AND meal_time = ?',
            [empId[0].emp_id, date, mealTime]
        );

        if (existingSelection.length > 0) {
            return 'You have already selected the menu item for tomorrow.';
        }

        const [menuItem] = await pool.query<RowDataPacket[]>(
            'SELECT menu_item_id FROM Menu WHERE item_name = ? AND meal_time = ?',
            [menuItemName, mealTime]
        );

        if (menuItem.length === 0) {
            return `Menu item ${menuItemName} does not exist for ${mealTime}.`;
        }

        await pool.query(
            'INSERT INTO Employee_Selection (emp_id, menu_item_id, meal_time, date) VALUES (?, ?, ?, ?)',
            [empId[0].emp_id, menuItem[0].menu_item_id, mealTime, date]
        );

        return `Menu item for ${mealTime} selected successfully.`;
    }

    async checkResponses(mealTime: string): Promise<string> {
        const today = new Date().toISOString().slice(0, 10);

        const [responses] = await pool.query<RowDataPacket[]>(
            `SELECT Menu.item_name, COUNT(Employee_Selection.menu_item_id) as vote_count
            FROM Employee_Selection
            JOIN Menu ON Employee_Selection.menu_item_id = Menu.menu_item_id
            WHERE Employee_Selection.date = ? AND Employee_Selection.meal_time = ?
            GROUP BY Employee_Selection.menu_item_id`,
            [today, mealTime]
        );

        let responseString = `--- Responses for ${mealTime} ---\n`;
        responses.forEach((response: any) => {
            responseString += `Item: ${response.item_name}, Votes: ${response.vote_count}\n`;
        });

        return responseString;
    }

    async selectFoodToPrepare(today: string, mealTime: string): Promise<RowDataPacket[]> {
        const [responses] = await pool.query<RowDataPacket[]>(
            `SELECT Menu.item_name, COUNT(Employee_Selection.menu_item_id) as vote_count
            FROM Employee_Selection
            JOIN Menu ON Employee_Selection.menu_item_id = Menu.menu_item_id
            WHERE Employee_Selection.date = ? AND Employee_Selection.meal_time = ?
            GROUP BY Employee_Selection.menu_item_id
            ORDER BY vote_count DESC`,
            [today, mealTime]
        );

        return responses;
    }

    private async getItemIdByName(itemName: string): Promise<any> {
        const [item] = await pool.query<RowDataPacket[]>(
            'SELECT menu_item_id FROM Menu WHERE item_name = ?',
            [itemName]
        );
        return item;
    }

    private async getEmpIdByUsername(username: string): Promise<any> {
        const [empId] = await pool.query<RowDataPacket[]>(
            'SELECT emp_id FROM User WHERE username = ?',
            [username]
        );
        return empId;
    }

    async saveSelectedMeal(data: { mealForBreakfast: string, mealForLunch: string, mealForDinner: string }): Promise<string> {
        const today = new Date().toISOString().slice(0, 10);

        const breakfastMeal = await this.getItemIdByName(data.mealForBreakfast);
        const lunchMeal = await this.getItemIdByName(data.mealForLunch);
        const dinnerMeal = await this.getItemIdByName(data.mealForDinner);

        await pool.query(
            'INSERT INTO Selected_Meal (menu_item_id, meal_time, date) VALUES (?, \'breakfast\', ?), (?, \'lunch\', ?), (?, \'dinner\', ?)',
            [breakfastMeal[0].menu_item_id, today, lunchMeal[0].menu_item_id, today, dinnerMeal[0].menu_item_id, today]
        );

        return 'Meals for today saved successfully.';
    }

    async getSelectedMeal(): Promise<RowDataPacket[]> {
        const today = new Date().toISOString().slice(0, 10);

        const [selectedMeals] = await pool.query<RowDataPacket[]>(
            'SELECT menu_item_id, meal_time FROM Selected_Meal WHERE date = ?',
            [today]
        );

        return selectedMeals;
    }

    async provideFeedback(data: { username: string, menu_item_id: number, rating: number, comment: string }): Promise<boolean> {
        const today = new Date().toISOString().slice(0, 10);

        const empId = await this.getEmpIdByUsername(data.username);

        if (empId.length === 0) {
            console.error(`User ${data.username} not found.`);
            return false;
        }

        const [response] = await pool.query<RowDataPacket[]>(
            'INSERT INTO Feedback (menu_item_id, emp_id, rating, comment, date_posted) VALUES (?, ?, ?, ?, ?)',
            [data.menu_item_id, empId[0].emp_id, data.rating, data.comment, today]
        );

        return !!response;
    }

    async getMenu(): Promise<MenuItem[]> {
        try {
            const query = `
            SELECT m.*, s.sentiment, s.average_rating, s.sentiment_score 
            FROM Menu m 
            LEFT JOIN Sentiment s ON m.menu_item_id = s.menu_item_id`;
            const [menuItems] = await pool.query<MenuItem[]>(query);
            return menuItems;
        } catch (error) {
            console.error(`Failed to insert sentiments: ${error}`);
            throw new Error('Error inserting sentiments.');
        }
    }

    async getRecommendations(): Promise<MenuItem[]> {
        try {
            const query = `
            SELECT m.*, s.sentiment, s.average_rating, s.sentiment_score 
            FROM Menu m 
            LEFT JOIN Sentiment s ON m.menu_item_id = s.menu_item_id 
            ORDER BY s.average_rating DESC 
            LIMIT 5`;
            const [menuItems] = await pool.query<MenuItem[]>(query);
            return menuItems;
        } catch (error) {
            console.error(`Failed to insert sentiments: ${error}`);
            throw new Error('Error inserting sentiments.');
        }
    }

    async fetchDiscardMenuItems(): Promise<DiscardMenuItem[]> {
        try{
            const [rows] = await pool.query<DiscardMenuItem[]>(`
            SELECT m.menu_item_id, m.item_name, s.average_rating, s.sentiment_score
            FROM Menu m
            JOIN Sentiment s ON m.menu_item_id = s.menu_item_id
            WHERE s.average_rating <= 2
            OR s.sentiment_score <= 20`);
            return rows;
        } catch (error) {
            console.error(`Failed to fetch discard menu items: ${error}`);
            throw new Error('Error fetching discard menu items.');
        }
    }

    async logMonthlyUsage(usageType: string): Promise<void> {
        try {
            await pool.query('INSERT INTO Monthly_Usage_Log (usage_type, last_used) VALUES (?, CURDATE()) ON DUPLICATE KEY UPDATE last_used = CURDATE()', [usageType]);
        } catch (error) {
            console.error(`Failed to log monthly usage: ${error}`);
        }
    }

    async canUseFeature(usageType: string): Promise<boolean> {
        try {
            const [rows] = await pool.query<RowDataPacket[]>('SELECT last_used FROM Monthly_Usage_Log WHERE usage_type = ?', [usageType]);
            if (rows.length > 0) {
                const lastUsed = new Date(rows[0].last_used);
                const today = new Date();
                return lastUsed.getMonth() !== today.getMonth() || lastUsed.getFullYear() !== today.getFullYear();
            }
            return true;
        } catch (error) {
            console.error(`Failed to check feature usage: ${error}`);
            return false;
        }
    }

    async removeMenuItem(item_name: string): Promise<boolean> {
        try {
            const [result] = await pool.query('DELETE FROM Menu WHERE item_name = ?', [item_name]);
            return (result as any).affectedRows > 0;
        } catch (error) {
            console.error(`Failed to remove menu item: ${error}`);
            return false;
        }
    }

    async getFeedbackItems(): Promise<RowDataPacket[]> {
        try{
            const [rows] = await pool.query<RowDataPacket[]>(`
            SELECT REPLACE(usage_type, 'getDetailedFeedback-', '') as item_name
            FROM Monthly_Usage_Log
            WHERE usage_type LIKE 'getDetailedFeedback-%'`);
            return rows;
        } catch (error) {
            console.error(`Failed to get menu items for feedback: ${error}`);
            throw new Error('Error fetching menu items for feedback.');
        }
    }

    async saveDetailedFeedback(data): Promise<void> {
        try {
            const emp_id = await this.getEmpIdByUsername(data.username);
            const menu_item_id = await this.getItemIdByName(data.item_name);

            await pool.query(`
                INSERT INTO Feedback_Responses (menu_item_id, emp_id, question, response) 
                VALUES 
                    (?, ?, ?, ?), 
                    (?, ?, ?, ?), 
                    (?, ?, ?, ?)
            `, [
                menu_item_id[0].menu_item_id, emp_id[0].emp_id, data.question[0], data.feedback[0], 
                menu_item_id[0].menu_item_id, emp_id[0].emp_id, data.question[1], data.feedback[1], 
                menu_item_id[0].menu_item_id, emp_id[0].emp_id, data.question[2], data.feedback[2]
            ]);
        } catch (error) {
            console.error(`Failed save detailed feedback: ${error}`);
        }
    }

    async fetchDetailedFeedback(menu_item_name): Promise<RowDataPacket[]> {
        try{
            const menu_item_id = await this.getItemIdByName(menu_item_name);

            const [rows] = await pool.query<RowDataPacket[]>('SELECT emp_id, question, response, response_date FROM Feedback_Responses WHERE menu_item_id = ?', [menu_item_id[0].menu_item_id]);
            return rows;
        } catch (error) {
            console.error(`Failed to get detailed feedback: ${error}`);
            throw new Error('Error fetching detailed feedback.');
        }
    }

    async savePreferences(username, preferences): Promise<void> {
        try {
            const emp_id = await this.getEmpIdByUsername(username);

            const [existingPreferences] = await pool.query<RowDataPacket[]>('SELECT emp_id FROM User_Profile WHERE emp_id = ?', [emp_id[0].emp_id]);
            if (existingPreferences.length > 0) {
                await pool.query('UPDATE User_Profile SET food_preference = ?, spice_level = ?, cuisine = ?, sweet_tooth = ? WHERE emp_id = ?', [preferences.foodPreference, preferences.spiceLevel, preferences.cuisine, preferences.sweetTooth, emp_id[0].emp_id]);
            } else {
                await pool.query('INSERT INTO User_Profile (emp_id, food_preference, spice_level, cuisine, sweet_tooth) VALUES (?, ?, ?, ?, ?)', [emp_id[0].emp_id, preferences.foodPreference, preferences.spiceLevel, preferences.cuisine, preferences.sweetTooth]);
            }
        } catch (error) {
            console.error(`Failed to save preferences: ${error}`);
            throw new Error('Error saving preferences.');
        }
    }
}