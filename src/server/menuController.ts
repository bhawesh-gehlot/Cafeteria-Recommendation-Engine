import { MenuService } from '../services/menuService';
import pool from '../utils/db';
import { calculateSentiments } from '../services/sentimentService';
import { RowDataPacket } from 'mysql2';
import { createNotification } from '../services/notificationService';

interface MenuItem extends RowDataPacket {
    menu_item_id: number;
    item_name: string;
    price: number;
    meal_time: string;
    availability_status: string;
    sentiment: string | null;
    average_rating: number | null;
    sentiment_score: number | null;
}

export class MenuController {
    private static menuService = new MenuService();

    static async handleAddFoodItem(ws, data) {
        const { name, price, mealTime, availabilityStatus } = data;
        const success = await MenuController.menuService.addFoodItem(name, parseFloat(price), mealTime, availabilityStatus);
        ws.send(JSON.stringify({ status: success ? 'success' : 'error', message: success ? 'Food item added successfully.' : 'Failed to add food item.' }));
        createNotification('employee', `${name} is now available in cafeteria for Rs. ${price} at ${mealTime}.`);
        createNotification('chef', `${name} is now available in cafeteria for Rs. ${price} at ${mealTime}.`);
    }

    static async handleRemoveFoodItem(ws, data) {
        const { name } = data;
        const success = await MenuController.menuService.removeFoodItem(name);
        ws.send(JSON.stringify({ status: success ? 'success' : 'error', message: success ? 'Food item removed successfully.' : 'Failed to remove food item.' }));
        createNotification('employee', `${name} is now removed from cafeteria.`);
        createNotification('chef', `${name} is now removed from cafeteria.`);
    }

    static async handleUpdateFoodItemPrice(ws, data) {
        const { name, price } = data;
        const success = await MenuController.menuService.updateFoodItemPrice(name, parseFloat(price));
        ws.send(JSON.stringify({ status: success ? 'success' : 'error', message: success ? 'Food item price updated successfully.' : 'Failed to update food item price.' }));
        createNotification('employee', `Price for ${name} is updated to Rs. ${price}.`);
        createNotification('chef', `Price for ${name} is updated to Rs. ${price}.`);
    }

    static async handleUpdateFoodItemAvailability(ws, data) {
        const { name, availabilityStatus } = data;
        const success = await MenuController.menuService.updateFoodItemAvailability(name, availabilityStatus);
        ws.send(JSON.stringify({ status: success ? 'success' : 'error', message: success ? 'Food item availability updated successfully.' : 'Failed to update food item availability.' }));
        createNotification('employee', `${name} is ${availabilityStatus ? 'now available' : 'unavailable'} in cafeteria.`);
        createNotification('chef', `${name} is ${availabilityStatus ? 'now available' : 'unavailable'} in cafeteria.`);
    }

    static async displayMenu(ws) {
        await calculateSentiments();
    
        const [menuItems] = await pool.query<MenuItem[]>(`
            SELECT m.*, s.sentiment, s.average_rating, s.sentiment_score 
            FROM Menu m 
            LEFT JOIN Sentiments s ON m.menu_item_id = s.menu_item_id`);

        ws.send(JSON.stringify({ status: menuItems ? 'displayMenu' : 'error', menuItems }));
    
        
    }

    static async displayRecommendations(ws) {
        await calculateSentiments();
    
        const [recommendedItems] = await pool.query<MenuItem[]>(`
            SELECT m.*, s.sentiment, s.average_rating, s.sentiment_score 
            FROM Menu m 
            LEFT JOIN Sentiments s ON m.menu_item_id = s.menu_item_id 
            ORDER BY s.average_rating DESC 
            LIMIT 5`);
    
        ws.send(JSON.stringify({ status: recommendedItems ? 'showRecommendations' : 'error', recommendedItems }));
    }

    static async getTopRecommendations(ws) {
        const mealTimes = ['breakfast', 'lunch', 'dinner'];
        for (const mealTime of mealTimes) {
            const recommendedItems = await MenuController.menuService.getRecommendedItems(mealTime);
            const message = `Top recommended items for ${mealTime}: ${recommendedItems}`;
            ws.send(JSON.stringify({ status: message ? 'printMessage' : 'error', message }));
        }
    }

    static async rolloutFoodItems(ws, data) {
        const { mealTime, items } = data;
        const message = await MenuController.menuService.rolloutMenuItems(mealTime, items, ws);
        createNotification('employee', `Chef has rolled out ${items} for tomorrow's ${mealTime}.`);
    }

    static async getRolloutItems(ws) {
        const mealTimes = ['breakfast', 'lunch', 'dinner'];
        for (const mealTime of mealTimes) {
            const rolledOutItems = await MenuController.menuService.getRolledOutItems(mealTime);
            const message = `Rolled out items for ${mealTime}: ${rolledOutItems}`;
            ws.send(JSON.stringify({ status: message ? 'printMessage' : 'error', message }));
        }
    }

    static async voteFoodItem(ws, data) {
        const { username, item, mealTime } = data;
        const message = await MenuController.menuService.selectMenuItem(username, item, mealTime, ws);
    }

    static async checkResponses(ws) {
        const mealTimes = ['breakfast', 'lunch', 'dinner'];
        for (const mealTime of mealTimes) {
            const message = await MenuController.menuService.checkResponses(mealTime);
            ws.send(JSON.stringify({ status: message ? 'printMessage' : 'error', message }));
        }
    }

    static async selectTodayMeal(ws) {
        const today = new Date().toISOString().slice(0, 10);
        const mealTimes = ['breakfast', 'lunch', 'dinner'];
        for (const mealTime of mealTimes) {
            const responses = await MenuController.menuService.selectFoodToPrepare(today, mealTime);

            responses.forEach((response: any) => {
                const message = `Item: ${response.item_name}, Votes: ${response.vote_count}`;
                ws.send(JSON.stringify({ status: message ? 'printMessage' : 'error', message }));
            });
        }
        setTimeout(() => {
            ws.send(JSON.stringify({ status: 'selectMeal' }));
        }, 200);
    }

    static async saveSelectedMeal(ws, data) {
        const message = await MenuController.menuService.saveSelectedMeal(data);
        ws.send(JSON.stringify({ status: message ? 'printMessage' : 'error', message }));
    }

    static async giveFeedback(ws) {
        const row = await MenuController.menuService.getSelectedMeal();
        ws.send(JSON.stringify({ status: 'selectedMenuItems', selectedItems: row }));
    }

    static async saveFeedback(ws, data) {
        const isSaved = await MenuController.menuService.provideFeedback(data);
    }
}
