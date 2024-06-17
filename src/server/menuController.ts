import { MenuService } from '../services/menuService';

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
}
