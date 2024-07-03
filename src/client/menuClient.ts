import { WebSocketClient } from './websocketClient';
import { getInput } from './utils/consoleInput';

export class Menu {
    private client: WebSocketClient;

    constructor(client: WebSocketClient) {
        this.client = client;
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
                this.client.send({ action: 'LogLogout', username: this.client.getUsername() });
                process.stdout.write('\x1Bc');
                this.printThankYouMessage();
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
                console.log("Coming Soon......................!\n");
                console.log("Please choose one of the following options:");
                this.handleResponse(this.client.getOptions());
                break;
            case '8':
                this.client.send({ action: 'getDiscardMenuItems' });
                break;
            case '9':
                this.client.send({ action: 'LogLogout', username: this.client.getUsername() });
                process.stdout.write('\x1Bc');
                this.printThankYouMessage();
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
                this.client.send({ action: 'getRolloutItems', username: this.client.getUsername() });
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
                this.client.send({ action: 'getDetailedFeedback' });
                break;
            case '6':
                this.updateUserProfile();
                break;
            case '7':
                this.client.send({ action: 'LogLogout', username: this.client.getUsername() });
                process.stdout.write('\x1Bc');
                this.printThankYouMessage();
                process.exit(0);
                break;
            default:
                console.log('Invalid option. Please select a valid option.');
                this.client.getOptions().forEach(option => console.log(option));
                this.promptForMenuOption();
                break;
        }
    }

    private printThankYouMessage() {
        console.log("*****************************");
        console.log("*                           *");
        console.log("*   Thank You for using     *");
        console.log("* Cafeteria Recommendation  *");
        console.log("*        System....         *");
        console.log("*                           *");
        console.log("*****************************");
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
        process.stdout.write('\x1Bc');
        console.log('Menu items rolled out successfully.\n');
        console.log("Please choose one of the following options:");
        this.handleResponse(this.client.getOptions());
    }

    async voteTomorrowFood() {
        const mealTimes = ['breakfast', 'lunch', 'dinner'];
        for (const mealTime of mealTimes) {
            console.log(`Please select one item for ${mealTime}:`);
            const item = await getInput('Enter item: ');
            this.client.send({ action: 'voteFood', username: this.client.getUsername(), item, mealTime });
        }
        console.log('Your responses have been recorded successfully.\n');
        console.log("Please choose one of the following options:");
        this.handleResponse(this.client.getOptions());
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

    private async handleDiscardOptions(discardedItems, discardedItemNames) {
        const discardOption = await getInput('1. Remove the Food Item from Menu List.\n2. Get Detailed Feedback.\n3. Check Feedback.\nEnter your choice: ');
        switch (discardOption) {
            case '1':
                this.getItemToDiscard(discardedItems, discardedItemNames);
                break;
            case '2':
                this.askDetailedFeedback(discardedItemNames);
                break;
            case '3':
                this.fetchDetailedFeedback();
                break;
            default:
                console.log('Invalid option. Please select a valid option.');
                this.handleDiscardOptions(discardedItems, discardedItemNames);
                break;
        }
    }

    private async getItemToDiscard(discardedItems, discardedItemNames) {
        const itemToDiscard = await getInput('\nEnter name of the item to discard: ');
        if (discardedItemNames.includes(itemToDiscard)) {
            this.client.send({ action: 'discardMenuItem', item_name: itemToDiscard });
        } else {
            console.log('Invalid item name. Please enter a valid item name.');
            this.getItemToDiscard(discardedItems, discardedItemNames);
        }
    }

    private async askDetailedFeedback(discardedItemNames) {
        const itemToGetFeedback = await getInput('Enter the name of the item to get detailed feedback for: ');
        if (discardedItemNames.includes(itemToGetFeedback)) {
            this.client.send({ action: 'askDetailedFeedback', item_name: itemToGetFeedback });
        } else {
            console.log('Invalid item name. Please enter a valid item name.');
            this.askDetailedFeedback(discardedItemNames);
        }
    }

    private async fetchDetailedFeedback() {
        process.stdout.write('\x1Bc');
        const menu_item_name = await getInput('Enter the name of the menu item to fetch detailed feedback: ');
        this.client.send({ action: 'fetchDetailedFeedback', menu_item_name });
    }

    handleDiscardMenuItems(discardedItems) {
        let discardedItemNames: Array<string> = [];
        process.stdout.write('\x1Bc');
        console.log('Menu Items to be discarded:');
        discardedItems.forEach(item => {
            discardedItemNames.push(item.item_name);
            console.log(`Menu Item: ${item.item_name}, Average Rating: ${item.average_rating}, Sentiment Score: ${item.sentiment_score}`);
        });
        this.handleDiscardOptions(discardedItems, discardedItemNames);
    }

    async promptDetailedFeedback(itemsForFeedback) {
        console.log('Please provide detailed feedback for the following menu items:');
        for (const item of itemsForFeedback) {
            const question1 = `What you did not like about ${item.item_name}?`;
            const question2 = `How would you like ${item.item_name} to taste?`;
            const question3 = `Share your mom's recipe if you want.`;
            console.log(`\n${item.item_name}: `);
            const inputQ1 = await getInput(question1+' : ');
            const inputQ2 = await getInput(question2+' : ');
            const inputQ3 = await getInput(question3+' : ');
            this.client.send({ 
                action: 'saveDetailedFeedback', 
                username: this.client.getUsername(), 
                item_name: item.item_name, 
                question: [question1, question2, question3], 
                feedback: [inputQ1, inputQ2, inputQ3] 
            });
        }
        console.log("\nYour feedback has been recorded successfully.\n");
        console.log("Please choose one of the following options:");
        this.handleResponse(this.client.getOptions());
    }

    printDetailedFeedback(detailedFeedback) {
        console.log('Detailed Feedback:');
        console.log('----------------------------------------------------------------------------');
        detailedFeedback.forEach((feedback: any) => {
            console.log('Question: ' + feedback.question);
            console.log('Feedback: ' + feedback.response);
            console.log('----------------------------------------------------------------------------');
        });
        console.log("\nPlease choose one of the following options:");
        this.handleResponse(this.client.getOptions());
    }

    private async getAttributes() {
        const foodType = await getInput('1) Please select one-\n a) Vegetarian\n b) Non-Vegetarian\n c) Eggetarian\nEnter your choice (a/b/c): ');
        const spiceLevel = await getInput('2) Please select spice level-\n a) High\n b) Medium\n c) Low\nEnter your choice (a/b/c): ');
        const cuisine = await getInput('3) Which cuisine?-\n a) North Indian\n b) South Indian\n c) Other\nEnter your choice (a/b/c): ');
        const sweetTooth = await getInput('4) Sweet tooth?-\n a) Yes\n b) No\nEnter your choice (a/b): ');
        return { foodType, spiceLevel, cuisine, sweetTooth };
    }

    async updateUserProfile() {
        process.stdout.write('\x1Bc');
        console.log('Please answer these questions to update your preferences....');
        const userPreferences = await this.getAttributes();
        this.client.send({ action: 'updateUserProfile', username: this.client.getUsername(), userPreferences });
        console.log("\nYour profile has been updated successfully.\n");
        console.log("Please choose one of the following options:");
        this.handleResponse(this.client.getOptions());
    }

    async addFoodItem() {
        const name = await getInput('Enter food item name: ');
        const price = await getInput('Enter food item price: ');
        const mealTime = await getInput('Enter meal time (breakfast/lunch/dinner): ');
        const availabilityStatus = await getInput('Enter availability status (0/1): ');
        const itemAttributes = await this.getAttributes();
        this.client.send({ action: 'addFoodItem', name, price, mealTime, availabilityStatus, itemAttributes });
    }
}
