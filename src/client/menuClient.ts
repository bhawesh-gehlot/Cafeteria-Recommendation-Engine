import { WebSocketClient } from './websocketClient';
import { getInput } from '../utils/consoleInput';

export class Menu {
    private client: WebSocketClient;

    constructor(client: WebSocketClient) {
        this.client = client;
    }

    handleResponse(response: any) {
        console.log(response.message);
        this.client.setOptions(response.options);
        this.client.getOptions().forEach(option => console.log(option));
        this.promptForMenuOption();
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
                const name = await getInput('Enter food item name: ');
                const price = await getInput('Enter food item price: ');
                const mealTime = await getInput('Enter meal time (breakfast/lunch/dinner): ');
                const availabilityStatus = await getInput('Enter availability status (0/1): ');
                this.client.send({ action: 'addFoodItem', name, price, mealTime, availabilityStatus });
                break;
            case '2':
                const removeName = await getInput('Enter the name of the food item to remove: ');
                this.client.send({ action: 'removeFoodItem', name: removeName });
                break;
            case '3':
                const updatePriceName = await getInput('Enter the name of the food item to update the price: ');
                const newPrice = await getInput('Enter the new price: ');
                this.client.send({ action: 'updateFoodItemPrice', name: updatePriceName, price: newPrice });
                break;
            case '4':
                const updateAvailabilityName = await getInput('Enter the name of the food item to update the availability: ');
                const newAvailabilityStatus = await getInput('Enter new availability status (0/1): ');
                this.client.send({ action: 'updateFoodItemAvailability', name: updateAvailabilityName, availabilityStatus: newAvailabilityStatus });
                break;
            case '5':
                process.stdout.write('\x1Bc');
                this.client.send({ action: 'LogLogout' });
                console.log("Thank You for using Cafeteria Recommendation System....");
                process.exit(0);
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
                this.client.send({ action: 'getTopRecommendations' });
                setTimeout(async () => {
                    await this.rolloutFoodItems();
                }, 200);
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
                console.log("Coming Soon......................!");
                break;
            case '8':
                process.stdout.write('\x1Bc');
                this.client.send({ action: 'LogLogout', username: this.client.getUsername() });
                console.log("Thank You for using Cafeteria Recommendation System....");
                process.exit(0);
                break;
            default:
                console.log('Invalid option. Please select a valid option.');
                this.client.getOptions().forEach(option => console.log(option));
                this.promptForMenuOption();
                break;
        }
    }

    async handleEmployeeOptions(choice: string) {
        switch (choice) {
            case '1':
                this.client.send({ action: 'getRolloutItems' });
                setTimeout(async () => {
                    await this.voteTomorrowFood();
                }, 200);
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
                process.stdout.write('\x1Bc');
                this.client.send({ action: 'LogLogout' });
                console.log("Thank You for using Cafeteria Recommendation System....");
                process.exit(0);
                break;
            default:
                console.log('Invalid option. Please select a valid option.');
                this.client.getOptions().forEach(option => console.log(option));
                this.promptForMenuOption();
                break;
        }
    }

    async rolloutFoodItems() {
        const mealTimes = ['breakfast', 'lunch', 'dinner'];
        for (const mealTime of mealTimes) {
            console.log(`Please enter the names of three items for ${mealTime}:`);
            const items: Array<string> = [];
            for (let i = 0; i < 3; i++) {
                const item = await getInput(`Enter item ${i + 1}: `);
                items.push(item);
            }
            this.client.send({ action: 'rolloutFoodItem', mealTime, items });
        }
        console.log('Menu items rolled out successfully.');
    }

    async voteTomorrowFood() {
        const mealTimes = ['breakfast', 'lunch', 'dinner'];
        for (const mealTime of mealTimes) {
            console.log(`Please select one item for ${mealTime}:`);
            const item = await getInput('Enter item: ');
            this.client.send({ action: 'voteFood', username: this.client.getUsername(), item, mealTime });
        }
        console.log('Your responses have been recorded successfully.');
    }

    async selectMeal() {
        const mealForBreakfast = await getInput('Enter Meal to be cooked for breakfast: ');
        const mealForLunch = await getInput('Enter Meal to be cooked for lunch: ');
        const mealForDinner = await getInput('Enter Meal to be cooked for dinner: ');
        this.client.send({ action: 'saveSelectedMeal', mealForBreakfast, mealForLunch, mealForDinner });
    }

    showRecommendations(recommendedItems) {
        console.log('Recommended Items:');
        recommendedItems.forEach((item: any) => {
            console.log(`Name: ${item.item_name}, Price: ${item.price}, Meal Time: ${item.meal_time}, Availablility: ${item.availability_status ? 'Available' : 'Unavailable'}`);
            console.log(`Rating: ${item.average_rating}, Sentiment: ${item.sentiment} (Score: ${item.sentiment_score})`);
            console.log('---');
        });
    }

    displayMenu(menuItems) {
        console.log('----------Menu----------');
        menuItems.forEach((item: any) => {
            console.log(`Name: ${item.item_name}, Price: ${item.price}, Meal Time: ${item.meal_time}, Availablility: ${item.availability_status ? 'Available' : 'Unavailable'}`);
            console.log(`Rating: ${item.average_rating}, Sentiment: ${item.sentiment} (Score: ${item.sentiment_score})`);
            console.log('---------------------------');
        });
    }
}
