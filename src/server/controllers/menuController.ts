import { MenuDB } from '../dbLayer/menuDB';
import { RecommendationController } from './recommendationController';
import { NotificationDB } from '../dbLayer/notificationDB';

export class MenuController {
    private menuDB: MenuDB;
    private notificationDB: NotificationDB;
    private recommendationController: RecommendationController;

    constructor() {
        this.menuDB = new MenuDB();
        this.notificationDB = new NotificationDB();
        this.recommendationController = new RecommendationController();
    }

    private async handleAction(
        ws: WebSocket,
        action: () => Promise<boolean>,
        successMessage: string,
        errorMessage: string,
        notifications: { role: string, message: string }[] = []
    ) {
        const success = await action();
        ws.send(JSON.stringify({ status: success ? 'success' : 'error', message: success ? successMessage : errorMessage }));

        if (success) {
            notifications.forEach((notification) => this.notificationDB.createNotification(notification.role, notification.message));
        }
    }

    async handleAddFoodItem(ws, data: any) {
        const { name, price, mealTime, availabilityStatus, itemAttributes } = data;
        const attributes = this.getAttributes(itemAttributes);
        await this.handleAction(
            ws,
            () => this.menuDB.addFoodItem(name, parseFloat(price), mealTime, availabilityStatus, attributes),
            'Food item added successfully.',
            'Failed to add food item.',
            [
                { role: 'employee', message: `${name} is now available in cafeteria for Rs. ${price} at ${mealTime}.` },
                { role: 'chef', message: `${name} is now available in cafeteria for Rs. ${price} at ${mealTime}.` }
            ]
        );
        ws.send(JSON.stringify({ status: 'menu', message: '\nPlease choose one of the following options:' }));
    }

    async handleRemoveFoodItem(ws, data: any) {
        const { name } = data;
        await this.handleAction(
            ws,
            () => this.menuDB.removeFoodItem(name),
            'Food item removed successfully.',
            'Failed to remove food item.',
            [
                { role: 'employee', message: `${name} is now removed from cafeteria.` },
                { role: 'chef', message: `${name} is now removed from cafeteria.` }
            ]
        );
        ws.send(JSON.stringify({ status: 'menu', message: '\nPlease choose one of the following options:' }));
    }

    async handleUpdateFoodItemPrice(ws, data: any) {
        const { name, price } = data;
        await this.handleAction(
            ws,
            () => this.menuDB.updateFoodItemPrice(name, parseFloat(price)),
            'Food item price updated successfully.',
            'Failed to update food item price.',
            [
                { role: 'employee', message: `Price for ${name} is updated to Rs. ${price}.` },
                { role: 'chef', message: `Price for ${name} is updated to Rs. ${price}.` }
            ]
        );
        ws.send(JSON.stringify({ status: 'menu', message: '\nPlease choose one of the following options:' }));
    }

    async handleUpdateFoodItemAvailability(ws, data: any) {
        const { name, availabilityStatus } = data;
        await this.handleAction(
            ws,
            () => this.menuDB.updateFoodItemAvailability(name, availabilityStatus),
            'Food item availability updated successfully.',
            'Failed to update food item availability.',
            [
                { role: 'employee', message: `${name} is ${availabilityStatus ? 'now available' : 'unavailable'} in cafeteria.` },
                { role: 'chef', message: `${name} is ${availabilityStatus ? 'now available' : 'unavailable'} in cafeteria.` }
            ]
        );
        ws.send(JSON.stringify({ status: 'menu', message: '\nPlease choose one of the following options:' }));
    }

    async displayMenu(ws) {
        await this.recommendationController.calculateSentiments();
        const menuItems = await this.menuDB.getMenu();
        ws.send(JSON.stringify({ status: menuItems ? 'displayMenu' : 'error', menuItems }));
        ws.send(JSON.stringify({ status: 'menu', message: '\nPlease choose one of the following options:' }));
    }

    async displayRecommendations(ws) {
        await this.recommendationController.calculateSentiments();
        const menuItems = await this.menuDB.getRecommendations();
        ws.send(JSON.stringify({ status: menuItems ? 'showRecommendations' : 'error', menuItems }));
        ws.send(JSON.stringify({ status: 'menu', message: '\nPlease choose one of the following options:' }));
    }

    async getTopRecommendations(ws) {
        const mealTimes = ['breakfast', 'lunch', 'dinner'];
        for (const mealTime of mealTimes) {
            const recommendedItems = await this.menuDB.getRecommendedItems(mealTime);
            const message = `Top recommended items for ${mealTime}: ${recommendedItems}`;
            ws.send(JSON.stringify({ status: message ? 'printMessage' : 'error', message }));
        }
    }

    async rolloutFoodItems(ws, data: any) {
        const { mealTime, items } = data;
        const message = await this.menuDB.rolloutMenuItems(mealTime, items, ws);
        this.notificationDB.createNotification('employee', `Chef has rolled out ${items} for tomorrow's ${mealTime}.`);
    }

    async getRolloutItems(ws, data) {
        const mealTimes = ['breakfast', 'lunch', 'dinner'];
        for (const mealTime of mealTimes) {
            const rolledOutItems = await this.menuDB.getRolledOutItems(mealTime, data.username);
            const message = `Rolled out items for ${mealTime}: ${rolledOutItems}`;
            ws.send(JSON.stringify({ status: message ? 'printMessage' : 'error', message }));
        }
    }

    async voteFoodItem(ws, data: any) {
        const { username, item, mealTime } = data;
        await this.menuDB.selectMenuItem(username, item, mealTime, ws);
    }

    async checkResponses(ws) {
        const mealTimes = ['breakfast', 'lunch', 'dinner'];
        for (const mealTime of mealTimes) {
            const message = await this.menuDB.checkResponses(mealTime);
            ws.send(JSON.stringify({ status: message ? 'printMessage' : 'error', message }));
        }
        ws.send(JSON.stringify({ status: 'menu', message: '\nPlease choose one of the following options:' }));
    }

    async selectTodayMeal(ws) {
        const today = new Date().toISOString().slice(0, 10);
        const mealTimes = ['breakfast', 'lunch', 'dinner'];
        for (const mealTime of mealTimes) {
            const responses = await this.menuDB.selectFoodToPrepare(today, mealTime);
            responses.forEach((response: any) => {
                const message = `Item: ${response.item_name}, Votes: ${response.vote_count}`;
                ws.send(JSON.stringify({ status: message ? 'printMessage' : 'error', message }));
            });
        }
        setTimeout(() => {
            ws.send(JSON.stringify({ status: 'selectMeal' }));
        }, 200);
    }

    async saveSelectedMeal(ws, data: any) {
        const message = await this.menuDB.saveSelectedMeal(data);
        ws.send(JSON.stringify({ status: message ? 'printMessage' : 'error', message }));
        ws.send(JSON.stringify({ status: 'menu', message: '\nPlease choose one of the following options:' }));
    }

    async giveFeedback(ws) {
        const row = await this.menuDB.getSelectedMeal();
        ws.send(JSON.stringify({ status: 'selectedMenuItems', selectedItems: row }));
    }

    async saveFeedback(ws, data: any) {
        await this.menuDB.provideFeedback(data);
    }

    async getDiscardedMenuItems(ws) {
        const discardedItems = await this.menuDB.fetchDiscardMenuItems();
        ws.send(JSON.stringify({ status: discardedItems ? 'discardedItems' : 'error', discardedItems }));
    }

    async discardMenuItem(ws, data: any) {
        const canUse = await this.menuDB.canUseFeature('discardMenuItem');
        if (canUse) {
            const isDiscarded = await this.menuDB.removeMenuItem(data.item_name);
            await this.menuDB.logMonthlyUsage('discardMenuItem');
            isDiscarded && this.notificationDB.createNotification('employee', `Chef has removed ${data.item_name} from Menu because of poor reviews.`);
            ws.send(JSON.stringify({ status: isDiscarded ? 'printMessage' : 'error', message: `${data.item_name} successfully removed from the Menu.` }));
            ws.send(JSON.stringify({ status: 'menu', message: '\nPlease choose one of the following options:' }));
        } else {
            ws.send(JSON.stringify({ status: 'printMessage', message: 'This feature is available only once a month. Come back next month to use this feature again.' }));
            ws.send(JSON.stringify({ status: 'menu', message: '\nPlease choose one of the following options:' }));
        }
    }

    async askDetailedFeedback(ws, data: any) {
        const canUse = await this.menuDB.canUseFeature(`getDetailedFeedback-${data.item_name}`);
        if (canUse) {
            await this.menuDB.logMonthlyUsage(`getDetailedFeedback-${data.item_name}`);
            this.notificationDB.createNotification('employee', `Chef has asked you to provide detailed feedback for ${data.item_name}. Select option 5 to provide feedback.`);
            ws.send(JSON.stringify({ status: 'printMessage', message: `Employees have been notified to provide detailed feedback for ${data.item_name}.\n` }));
            ws.send(JSON.stringify({ status: 'menu', message: '\nPlease choose one of the following options:' }));
        } else {
            ws.send(JSON.stringify({ status: 'printMessage', message: `Feedback for ${data.item_name} has been asked already this month. Try again next month.` }));
            ws.send(JSON.stringify({ status: 'menu', message: '\nPlease choose one of the following options:' }));
        }
    }

    async getDetailedFeedback(ws) {
        const itemsForFeedback = await this.menuDB.getFeedbackItems();
        if (itemsForFeedback.length) {
            ws.send(JSON.stringify({ status: 'promptDetailedFeedback', itemsForFeedback }));
        } else {
            ws.send(JSON.stringify({ status: 'printMessage', message: 'Chef has not asked for detailed feedback of any menu item.' }));
            ws.send(JSON.stringify({ status: 'menu', message: '\nPlease choose one of the following options:' }));
        }
    }

    async saveDetailedFeedback(ws, data: any) {
        await this.menuDB.saveDetailedFeedback(data);
    }

    async fetchDetailedFeedback(ws, data: any) {
        const detailedFeedback = await this.menuDB.fetchDetailedFeedback(data.menu_item_name);
        ws.send(JSON.stringify({ status: detailedFeedback ? 'printDetailedFeedback' : 'error', detailedFeedback }));
    }

    private getAttributes(userPreferences) {
        const foodPreference = userPreferences.foodType === 'c' ? 'eggetarian' : userPreferences.foodType === 'b' ? 'non-vegetarian' : 'vegetarian';
        const spiceLevel = userPreferences.spiceLevel === 'a' ? 'high' : userPreferences.spiceLevel === 'b' ? 'medium' : 'low';
        const cuisine = userPreferences.cuisine === 'a' ? 'north-indian' : userPreferences.cuisine === 'b' ? 'south-indian' : 'other';
        const sweetTooth = userPreferences.sweetTooth === 'a' ? 'yes' : 'no';
        return { foodPreference, spiceLevel, cuisine, sweetTooth };
    }

    async savePreferences(ws, data: any) {
        const username = data.username;
        const preferences = this.getAttributes(data.userPreferences);
        await this.menuDB.savePreferences(username, preferences);
    }
}
