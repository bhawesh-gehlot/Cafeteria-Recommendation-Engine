import { MenuDB } from '../dbLayer/menuDB';
import { RecommendationController } from './recommendationController';
import { NotificationDB } from '../dbLayer/notificationDB';
import { MenuService } from '../services/menuService';

export class MenuController {
    private menuService: MenuService;
    private menuDB: MenuDB;
    private notificationDB: NotificationDB;
    private recommendationController: RecommendationController;

    constructor() {
        this.menuDB = new MenuDB();
        this.notificationDB = new NotificationDB();
        this.recommendationController = new RecommendationController();
        this.menuService = new MenuService(this.menuDB, this.notificationDB);
    }

    async handleAddFoodItem(ws, data: any) {
        const { name, price, mealTime, availabilityStatus, itemAttributes } = data;
        const attributes = this.menuService.getAttributes(itemAttributes);
        await this.menuService.handleAction(
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
        await this.menuService.handleAction(
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
        await this.menuService.handleAction(
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
        await this.menuService.handleAction(
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
        ws.send(JSON.stringify({ status: menuItems ? 'displayMenu' : 'failure', menuItems }));
        ws.send(JSON.stringify({ status: 'menu', message: '\nPlease choose one of the following options:' }));
    }

    async displayRecommendations(ws) {
        await this.recommendationController.calculateSentiments();
        const menuItems = await this.menuDB.getRecommendations();
        ws.send(JSON.stringify({ status: menuItems ? 'showRecommendations' : 'failure', menuItems }));
        ws.send(JSON.stringify({ status: 'menu', message: '\nPlease choose one of the following options:' }));
    }

    async preRolloutOperations(ws) {
        await this.menuService.getTopRecommendations(ws);
        const menuItemNames = await this.menuDB.getMenuItemNames();
        ws.send(JSON.stringify({ status: menuItemNames ? 'getItemsToRollout' : 'failure', menuItemNames }));
    }

    async rolloutFoodItems(ws, data: any) {
        const { mealTime, items } = data;
        const message = await this.menuDB.rolloutMenuItems(mealTime, items, ws);
        if (message === `Menu items for ${mealTime} rolled out successfully.`) {
            this.notificationDB.createNotification('employee', `Chef has rolled out ${items} for tomorrow's ${mealTime}.`);
        }
    }

    async getRolloutItems(ws, data) {
        const allRolledOutItems = await this.menuService.getAllRolledOutItems(ws, data);
        ws.send(JSON.stringify({ status: allRolledOutItems ? 'getVotesForTomorrowFood' : 'failure', allRolledOutItems }));
    }

    async voteFoodItem(ws, data: any) {
        const { username, item, mealTime } = data;
        await this.menuDB.selectMenuItem(username, item, mealTime, ws);
    }

    async checkResponses(ws) {
        await this.menuService.checkResponses(ws);
        ws.send(JSON.stringify({ status: 'menu', message: '\nPlease choose one of the following options:' }));
    }

    async selectTodayMeal(ws) {
        await this.menuService.getEmployeeVotes(ws);
        setTimeout(async () => {
            const menuItemNames = await this.menuDB.getMenuItemNames();
            ws.send(JSON.stringify({ status: 'selectMeal', menuItemNames }));
        }, 200);
    }

    async saveSelectedMeal(ws, data: any) {
        const message = await this.menuDB.saveSelectedMeal(data);
        ws.send(JSON.stringify({ status: message ? 'printMessage' : 'failure', message }));
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
        ws.send(JSON.stringify({ status: discardedItems ? 'discardedItems' : 'failure', discardedItems }));
    }

    async discardMenuItem(ws, data: any) {
        const canUse = await this.menuDB.canUseFeature('discardMenuItem');
        if (canUse) {
            const isDiscarded = await this.menuDB.removeMenuItem(data.item_name);
            await this.menuDB.logMonthlyUsage('discardMenuItem');
            isDiscarded && this.notificationDB.createNotification('employee', `Chef has removed ${data.item_name} from Menu because of poor reviews.`);
            ws.send(JSON.stringify({ status: isDiscarded ? 'printMessage' : 'failure', message: `${data.item_name} successfully removed from the Menu.` }));
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
        ws.send(JSON.stringify({ status: detailedFeedback ? 'printDetailedFeedback' : 'failure', detailedFeedback }));
    }

    async savePreferences(ws, data: any) {
        const username = data.username;
        const preferences = this.menuService.getAttributes(data.userPreferences);
        await this.menuDB.savePreferences(username, preferences);
    }
}
