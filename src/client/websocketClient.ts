import WebSocket from 'ws';
import { getInput } from '../utils/consoleInput';

export class WebSocketClient {
    private ws: WebSocket;
    private username: string;
    private retries: number = 0;
    private maxRetries: number = 3;
    private options: string[] = [];
    private role: string;

    connect() {
        this.ws = new WebSocket('ws://localhost:8080');

        this.ws.on('open', () => {
            console.log('Connected to the server');
            this.promptForUsername();
        });

        this.ws.on('message', (data) => {
            const response = JSON.parse(data.toString());
            this.handleResponse(response);
        });

        this.ws.on('close', () => {
            console.log('Disconnected from the server');
        });

        this.ws.on('error', (error) => {
            console.error(`WebSocket error: ${error}`);
        });
    }

    handleResponse(response: any) {
        if (response.status === 'not_exists') {
            console.log(response.message);
            this.promptForUsername();
        } else if (response.status === 'exists') {
            console.log(response.message);
            this.promptForPassword();
        } else if (response.status === 'error') {
            console.log(response?.message ? response.message : response);
            this.retries++;
            if (this.retries < this.maxRetries) {
                this.promptForPassword();
            } else {
                console.log('Max retries reached. Terminating client.');
                this.ws.close();
            }
        } else if (response.status === 'success') {
            process.stdout.write('\x1Bc');
            console.log(response.message);
            this.role = response.role;
        } else if (response.status === 'menu') {
            console.log(response.message);
            this.options = response.options;
            this.options.forEach(option => console.log(option));
            this.promptForMenuOption();
        } else if (response.status === 'showRecommendations') {
            this.showRecommendations(response.recommendedItems);
        } else if (response.status === 'displayMenu') {
            this.displayMenu(response.menuItems);
        } else if (response.status === 'printMessage') {
            console.log(response.message);
        } else if (response.status === 'showNotifications') {
            this.showNotifications(response.notifications);
        } else if (response.status === 'selectMeal') {
            this.selectMeal();
        } else if (response.status === 'selectedMenuItems') {
            this.giveFeedback(response.selectedItems);
        }
    }

    promptForUsername() {
        getInput('Enter your username: ').then((username) => {
            this.username = username;
            this.checkUserExists(username);
        });
    }

    promptForPassword() {
        getInput('Enter your password: ').then((password) => {
            this.login(this.username, password);
        });
    }

    async promptForMenuOption() {
        const choice = await getInput('Enter your choice: ');

        const validOptions = this.options.map(option => option.split('.')[0].trim());
        if (validOptions.includes(choice)) {
            process.stdout.write('\x1Bc');
            console.log(`You selected option ${choice}`);
            if (this.role === 'admin') {
                this.handleAdminOptions(choice);
            } else if (this.role === 'chef') {
                this.handleChefOptions(choice);
            } else if (this.role === 'employee') {
                this.handleEmployeeOptions(choice);
            }
        } else {
            console.log('Invalid option. Please select a valid option.');
            this.options.forEach(option => console.log(option));
            this.promptForMenuOption();
        }
    }

    async handleAdminOptions(choice: string) {
        if (choice === '1') {
            const name = await getInput('Enter food item name: ');
            const price = await getInput('Enter food item price: ');
            const mealTime = await getInput('Enter meal time (breakfast/lunch/dinner): ');
            const availabilityStatus = await getInput('Enter availability status (0/1): ');

            this.ws.send(JSON.stringify({ action: 'addFoodItem', name, price, mealTime, availabilityStatus }));
        } else if (choice === '2') {
            const name = await getInput('Enter the name of the food item to remove: ');
            this.ws.send(JSON.stringify({ action: 'removeFoodItem', name }));
        } else if (choice === '3') {
            const name = await getInput('Enter the name of the food item to update the price: ');
            const price = await getInput('Enter the new price: ');
            this.ws.send(JSON.stringify({ action: 'updateFoodItemPrice', name, price }));
        } else if (choice === '4') {
            const name = await getInput('Enter the name of the food item to update the availability: ');
            const availabilityStatus = await getInput('Enter new availability status (0/1): ');
            this.ws.send(JSON.stringify({ action: 'updateFoodItemAvailability', name, availabilityStatus }));
        } else if (choice === '5') {
            process.stdout.write('\x1Bc');
            this.ws.send(JSON.stringify({ action: 'LogLogout' }));
            console.log("Thank You for using Cafeteria Recommendation System....");
            process.exit(0);
        }
    }

    async handleChefOptions(choice: string) {
        if (choice === '1') {
            this.ws.send(JSON.stringify({ action: 'getRecommendation' }));
        } else if (choice === '2') {
            this.ws.send(JSON.stringify({ action: 'getMenu' }));
        } else if (choice === '3') {
            this.ws.send(JSON.stringify({ action: 'getTopRecommendations' }));
            setTimeout(async () => {
                await this.rolloutFoodItems();
            }, 200);
        } else if (choice === '4') {
            this.ws.send(JSON.stringify({ action: 'checkResponses' }));
        } else if (choice === '5') {
            this.ws.send(JSON.stringify({ action: 'selectTodayMeal' }));
        } else if (choice === '6') {
            this.ws.send(JSON.stringify({ action: 'getNotifications', userRole: 'chef' }));
        } else if (choice === '7') {
            console.log("Coming Soon......................!");
        } else if (choice === '8') {
            process.stdout.write('\x1Bc');
            this.ws.send(JSON.stringify({ action: 'LogLogout' , username: this.username}));
            console.log("Thank You for using Cafeteria Recommendation System....");
            process.exit(0);
        }
    }

    async handleEmployeeOptions(choice: string) {
        if (choice === '1') {
            this.ws.send(JSON.stringify({ action: 'getRolloutItems' }));
            setTimeout(async () => {
                await this.voteTomorrowFood();
            }, 200);
        } else if (choice === '2') {
            this.ws.send(JSON.stringify({ action: 'giveFeedback', username: this.username }));
        } else if (choice === '3') {
            this.ws.send(JSON.stringify({ action: 'getNotifications', userRole: 'employee' }));
        } else if (choice === '4') {
            this.ws.send(JSON.stringify({ action: 'getMenu' }));
        } else if (choice === '5') {
            process.stdout.write('\x1Bc');
            this.ws.send(JSON.stringify({ action: 'LogLogout' }));
            console.log("Thank You for using Cafeteria Recommendation System....");
            process.exit(0);
        }
    }

    checkUserExists(username: string) {
        this.ws.send(JSON.stringify({ action: 'checkUserExists', username }));
    }

    login(username: string, password: string) {
        this.ws.send(JSON.stringify({ action: 'login', username, password }));
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

    async rolloutFoodItems() {
        const mealTimes = ['breakfast', 'lunch', 'dinner'];
        for (const mealTime of mealTimes) {
            console.log(`Please enter the names of three items for ${mealTime}:`);
            const items: Array<string> = [];
            for (let i = 0; i < 3; i++) {
                const item = await getInput(`Enter item ${i + 1}: `);
                items.push(item);
            }
            this.ws.send(JSON.stringify({ action: 'rolloutFoodItem', mealTime, items }));
        }
        console.log('Menu items rolled out successfully.');
    }

    async voteTomorrowFood() {
        const mealTimes = ['breakfast', 'lunch', 'dinner'];
        for (const mealTime of mealTimes) {
            console.log(`Please select one item for ${mealTime}:`);
            const item = await getInput('Enter item: ');
            this.ws.send(JSON.stringify({ action: 'voteFood', username: this.username, item, mealTime }));
        }
        console.log('Your responses have been recorded successfully.');
    }

    async showNotifications(notifications) {
        console.log(`Latest Notifications for ${this.username}:`);
        notifications.forEach((notification: any) => {
            notification.date_created = (new Date(notification.date_created)).toISOString();
            console.log(`${notification.date_created}: ${notification.message}`);
        });
    }

    async selectMeal() {
        const mealForBreakfast = await getInput('Enter Meal to be cooked for breakfast: ');
        const mealForLunch = await getInput('Enter Meal to be cooked for lunch: ');
        const mealForDinner = await getInput('Enter Meal to be cooked for dinner: ');
        this.ws.send(JSON.stringify({ action: 'saveSelectedMeal', mealForBreakfast, mealForLunch, mealForDinner }));
    }

    async giveFeedback(selectedItems) {
        for(const selectedItem of selectedItems) {
            const rating = await getInput(`Please Rate meal for today\'s ${selectedItem.meal_time}: `);
            const comment = await getInput(`Please give a comment for meal for today\'s ${selectedItem.meal_time}: `);
            this.ws.send(JSON.stringify({ action: 'provideFeedback', menu_item_id: selectedItem.menu_item_id, username: this.username, rating, comment }));
        }
        console.log('Feedback saved successfully.');
    }
}
