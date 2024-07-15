import { WebSocketClient } from './websocketClient';
import { getInput } from './utils/consoleInput';
import { User } from './userClient';
import { MenuClientService } from './services/menuClientService';

export class Menu {
    private client: WebSocketClient;
    private user: User;
    private menuService: MenuClientService;

    constructor(client: WebSocketClient, user: User) {
        this.client = client;
        this.user = user;
        this.menuService = new MenuClientService(client);
    }

    async handleResponse(options: any) {
        this.client.setOptions(options);
        this.client.getOptions().forEach(option => console.log(option));
        await this.promptForMenuOption();
    }

    async promptForMenuOption() {
        const choice = await getInput('Enter your choice: ');
        const validOptions = this.client.getOptions().map(option => option.split('.')[0].trim());
        if (validOptions.includes(choice)) {
            process.stdout.write('\x1Bc');
            console.log(`You selected option ${choice}`);
            this.handleRoleSpecificOptions(choice);
        } else {
            console.log('Invalid option. Please select a valid option.');
            this.client.getOptions().forEach(option => console.log(option));
            this.promptForMenuOption();
        }
    }

    async handleRoleSpecificOptions(choice: string) {
        switch (this.client.getRole()) {
            case 'admin':
                this.handleAdminOptions(choice);
                break;
            case 'chef':
                this.handleChefOptions(choice);
                break;
            case 'employee':
                this.handleEmployeeOptions(choice);
                break;
            default:
                console.log('Invalid role');
                break;
        }
    }

    async handleAdminOptions(choice: string) {
        switch (choice) {
            case '1':
                this.addFoodItem();
                break;
            case '2':
                this.removeFoodItem();
                break;
            case '3':
                this.updateFoodItemPrice();
                break;
            case '4':
                this.updateFoodItemAvailability();
                break;
            case '5':
                this.user.logoutClient();
                break;
            default:
                console.log('Invalid option. Please select a valid option.');
                this.client.getOptions().forEach(option => console.log(option));
                this.promptForMenuOption();
                break;
        }
    }

    async handleChefOptions(choice: string) {
        switch (choice) {
            case '1':
                this.client.send({ action: 'getRecommendation' });
                break;
            case '2':
                this.client.send({ action: 'getMenu' });
                break;
            case '3':
                this.client.send({ action: 'rolloutMenuItems' });
                break;
            case '4':
                this.client.send({ action: 'checkResponses' });
                break;
            case '5':
                this.client.send({ action: 'selectTodayMeal' });
                break;
            case '6':
                this.client.send({ action: 'getNotifications', userRole: 'chef' });
                break;
            case '7':
                console.log("Coming Soon......................!\n");
                console.log("Please choose one of the following options:");
                this.handleResponse(this.client.getOptions());
                break;
            case '8':
                this.client.send({ action: 'getDiscardMenuItems' });
                break;
            case '9':
                this.user.logoutClient();
                break;
            default:
                console.log('Invalid option. Please select a valid option.\n');
                this.client.getOptions().forEach(option => console.log(option));
                this.promptForMenuOption();
                break;
        }
    }

    async handleEmployeeOptions(choice: string) {
        switch (choice) {
            case '1':
                this.client.send({ action: 'getRolloutItems', username: this.client.getUsername() });
                break;
            case '2':
                this.client.send({ action: 'giveFeedback', username: this.client.getUsername() });
                break;
            case '3':
                this.client.send({ action: 'getNotifications', userRole: 'employee' });
                break;
            case '4':
                this.client.send({ action: 'getMenu' });
                break;
            case '5':
                this.client.send({ action: 'getDetailedFeedback' });
                break;
            case '6':
                this.updateUserProfile();
                break;
            case '7':
                this.user.logoutClient();
                break;
            default:
                console.log('Invalid option. Please select a valid option.');
                this.client.getOptions().forEach(option => console.log(option));
                this.promptForMenuOption();
                break;
        }
    }

    async rolloutFoodItems(menuItemNames: string[]) {
        const mealTimes = ['breakfast', 'lunch', 'dinner'];
        for (const mealTime of mealTimes) {
            const items = await this.menuService.inputRolloutItems(menuItemNames, mealTime);
            this.client.send({ action: 'rolloutFoodItem', mealTime, items });
        }
        process.stdout.write('\x1Bc');
        console.log('Menu items rolled out successfully.\n');
        console.log("Please choose one of the following options:");
        this.handleResponse(this.client.getOptions());
    }

    async voteTomorrowFood(allRolledOutItems) {
        await this.menuService.getVoteForTomorrow(allRolledOutItems);
        console.log("\nPlease choose one of the following options:");
        this.handleResponse(this.client.getOptions());
    }

    async selectMeal(menuItemNames) {
        const mealForBreakfast = await this.menuService.getInputForMeal('Enter Meal to be cooked for breakfast: ', menuItemNames);
        const mealForLunch = await this.menuService.getInputForMeal('Enter Meal to be cooked for lunch: ', menuItemNames);
        const mealForDinner = await this.menuService.getInputForMeal('Enter Meal to be cooked for dinner: ', menuItemNames);
        this.client.send({ action: 'saveSelectedMeal', mealForBreakfast, mealForLunch, mealForDinner });
    }

    showRecommendations(recommendedItems) {
        console.log('Recommended Items:');
        recommendedItems.forEach((item: any) => {
            console.log(`Name: ${item.item_name}, Price: ${item.price}, Meal Time: ${item.meal_time}, Availablility: ${item.availability_status ? 'Available' : 'Unavailable'}`);
            console.log(`Rating: ${item.average_rating}, Sentiment: ${item.sentiment} (Score: ${item.sentiment_score})`);
            console.log('----------------------------------------------------------------------------');
        });
    }

    displayMenu(menuItems) {
        console.log('------------------------------------Menu------------------------------------');
        menuItems.forEach((item: any) => {
            console.log(`Name: ${item.item_name}, Price: ${item.price}, Meal Time: ${item.meal_time}, Availablility: ${item.availability_status ? 'Available' : 'Unavailable'}`);
            console.log(`Rating: ${item.average_rating}, Sentiment: ${item.sentiment} (Score: ${item.sentiment_score})`);
            console.log('----------------------------------------------------------------------------');
        });
    }

    handleDiscardMenuItems(discardedItems) {
        let discardedItemNames: Array<string> = [];
        process.stdout.write('\x1Bc');
        console.log('Menu Items to be discarded:');
        discardedItems.forEach(item => {
            discardedItemNames.push(item.item_name);
            console.log(`Menu Item: ${item.item_name}, Average Rating: ${item.average_rating}, Sentiment Score: ${item.sentiment_score}`);
        });
        this.menuService.handleDiscardOptions(discardedItems, discardedItemNames);
    }

    async promptDetailedFeedback(itemsForFeedback) {
        await this.menuService.inputDetailedFeedback(itemsForFeedback);
        console.log("Please choose one of the following options:");
        this.handleResponse(this.client.getOptions());
    }

    printDetailedFeedback(detailedFeedback) {
        this.menuService.logDetailedFeedback(detailedFeedback);
        console.log("\nPlease choose one of the following options:");
        this.handleResponse(this.client.getOptions());
    }

    async updateUserProfile() {
        process.stdout.write('\x1Bc');
        console.log('Please answer these questions to update your preferences....');
        const userPreferences = await this.menuService.getAttributes();
        this.client.send({ action: 'updateUserProfile', username: this.client.getUsername(), userPreferences });
        console.log("\nYour profile has been updated successfully.\n");
        console.log("Please choose one of the following options:");
        this.handleResponse(this.client.getOptions());
    }

    async addFoodItem() {
        const name = await getInput('Enter food item name: ');
        const price = await this.menuService.getFoodItemPrice('Enter food item price: ');
        const mealTime = await this.menuService.getFoodItemMealTime();
        const availabilityStatus = await this.menuService.getAvailabilityStatus();
        const itemAttributes = await this.menuService.getAttributes();
        this.client.send({ action: 'addFoodItem', name: name.toLowerCase(), price, mealTime, availabilityStatus, itemAttributes });
    }

    async removeFoodItem() {
        const removeName = await getInput('Enter the name of the food item to remove: ');
        this.client.send({ action: 'removeFoodItem', name: removeName.toLowerCase() });
    }

    async updateFoodItemPrice() {
        const updatePriceName = await getInput('Enter the name of the food item to update the price: ');
        const newPrice = await this.menuService.getFoodItemPrice('Enter new price: ');
        this.client.send({ action: 'updateFoodItemPrice', name: updatePriceName.toLowerCase(), price: newPrice });
    }

    async updateFoodItemAvailability() {
        const updateAvailabilityName = await getInput('Enter the name of the food item to update the availability: ');
        const newAvailabilityStatus = await getInput('Enter new availability status (0/1): ');
        this.client.send({ action: 'updateFoodItemAvailability', name: updateAvailabilityName, availabilityStatus: newAvailabilityStatus });
    }
}
