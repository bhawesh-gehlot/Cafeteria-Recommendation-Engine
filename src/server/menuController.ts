import { MenuService } from '../services/menuService';
import pool from '../utils/db';
import { calculateSentiments } from '../services/sentimentService';
import { RowDataPacket } from 'mysql2';

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
    }

    static async handleRemoveFoodItem(ws, data) {
        const { name } = data;
        const success = await MenuController.menuService.removeFoodItem(name);
        ws.send(JSON.stringify({ status: success ? 'success' : 'error', message: success ? 'Food item removed successfully.' : 'Failed to remove food item.' }));
    }

    static async handleUpdateFoodItemPrice(ws, data) {
        const { name, price } = data;
        const success = await MenuController.menuService.updateFoodItemPrice(name, parseFloat(price));
        ws.send(JSON.stringify({ status: success ? 'success' : 'error', message: success ? 'Food item price updated successfully.' : 'Failed to update food item price.' }));
    }

    static async handleUpdateFoodItemAvailability(ws, data) {
        const { name, availabilityStatus } = data;
        const success = await MenuController.menuService.updateFoodItemAvailability(name, availabilityStatus);
        ws.send(JSON.stringify({ status: success ? 'success' : 'error', message: success ? 'Food item availability updated successfully.' : 'Failed to update food item availability.' }));
    }

    static async displayMenu() {
        await calculateSentiments();
    
        const [menuItems] = await pool.query<MenuItem[]>(`
            SELECT m.*, s.sentiment, s.average_rating, s.sentiment_score 
            FROM Menu m 
            LEFT JOIN Sentiments s ON m.menu_item_id = s.menu_item_id`);
    
        console.log('Menu:');
        menuItems.forEach((item: any) => {
            console.log(`Name: ${item.item_name}, Price: ${item.price}, Meal Time: ${item.meal_time}, Available: ${item.availability_status}`);
            console.log(`Rating: ${item.average_rating}, Sentiment: ${item.sentiment} (Score: ${item.sentiment_score})`);
            console.log('---');
        });
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
}
