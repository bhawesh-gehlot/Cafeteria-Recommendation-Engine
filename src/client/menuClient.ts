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
                this.removeFoodItem();
                break;
            case '3':
                this.updateFoodItemPrice();
                break;
            case '4':
                this.updateFoodItemAvailability();
                break;
            case '5':
                this.logoutClient();
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
                this.logoutClient();
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
                this.logoutClient();
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

    async rolloutFoodItems(menuItemNames: string[]) {
        const mealTimes = ['breakfast', 'lunch', 'dinner'];
        for (const mealTime of mealTimes) {
            const items = await this.inputRolloutItems(menuItemNames, mealTime);
            this.client.send({ action: 'rolloutFoodItem', mealTime, items });
        }
        process.stdout.write('\x1Bc');
        console.log('Menu items rolled out successfully.\n');
        console.log("Please choose one of the following options:");
        this.handleResponse(this.client.getOptions());
    }

    private async inputRolloutItems(menuItemNames: string[], mealTime: string) {
        const noOfItems = await this.getNumberOfItems(`Please enter the number of items to rollout for ${mealTime}: `);
        console.log(`Please enter the names of ${noOfItems} items for ${mealTime}:`);
        const items: string[] = [];
        for (let i = 0; i < noOfItems; i++) {
            let validItem = false;
            while (!validItem) {
                const item = (await getInput(`Enter item ${i + 1}: `)).toLowerCase();
                if (items.includes(item)) {
                    console.log('Item already selected. Please enter a different menu item.');
                } else if (menuItemNames.includes(item)) {
                    items.push(item);
                    validItem = true;
                } else {
                    console.log('Invalid item name. Please enter a valid item name.');
                }
            }
        }
        return items;
    }

    private async getNumberOfItems(displayString: string) {
        const noOfItems = await getInput(displayString);
        if(!isNaN(Number(noOfItems))) {
            return noOfItems;
        } else {
            console.log('Please enter a valid number.');
            return this.getNumberOfItems(displayString);
        }
    }

    async voteTomorrowFood(allRolledOutItems) {
        const isResponseTaken: boolean = false;
        const mealTimes = ['breakfast', 'lunch', 'dinner'];
        for (const mealTime of mealTimes) {
            if (!allRolledOutItems[mealTime]) {
                console.log(`No items rolled out for ${mealTime}. Please wait for the chef to rollout items.`);
                continue;
            }
            await this.getVoteFromEmployee(allRolledOutItems, mealTime, isResponseTaken);
        }
        if (isResponseTaken) {
            console.log('Your responses have been recorded successfully.');
        }
        console.log("\nPlease choose one of the following options:");
        this.handleResponse(this.client.getOptions());
    }

    private async getVoteFromEmployee(allRolledOutItems, mealTime, isResponseTaken) {
        let validItem = false;
        while (!validItem) {
            console.log(`Please select one item for ${mealTime}:`);
            const item = (await getInput('Enter item: ')).toLowerCase();
            if (allRolledOutItems[mealTime].includes(item)) {
                this.client.send({ action: 'voteFood', username: this.client.getUsername(), item, mealTime });
                validItem = true;
                isResponseTaken = true;
            } else {
                console.log(`Invalid item. Please select an item from the following list for ${mealTime}: ${allRolledOutItems[mealTime].join(', ')}`);
            }
        }
    }

    async selectMeal(menuItemNames) {
        const mealForBreakfast = await this.getInputForMeal('Enter Meal to be cooked for breakfast: ', menuItemNames);
        const mealForLunch = await this.getInputForMeal('Enter Meal to be cooked for lunch: ', menuItemNames);
        const mealForDinner = await this.getInputForMeal('Enter Meal to be cooked for dinner: ', menuItemNames);
        this.client.send({ action: 'saveSelectedMeal', mealForBreakfast, mealForLunch, mealForDinner });
    }

    private async getInputForMeal(displayString: string, menuItemNames: string[]) {
        const meal = (await getInput(displayString)).toLowerCase();
        if (menuItemNames.includes(meal)) {
            return meal;
        } else {
            console.log('Invalid item name. Please enter an item present in menu.');
            return this.getInputForMeal(displayString, menuItemNames);
        }
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
        const foodType = await this.getValidAttributeInput('1) Please select one-\n a) Vegetarian\n b) Non-Vegetarian\n c) Eggetarian\nEnter your choice (a/b/c): ', 3);
        const spiceLevel = await this.getValidAttributeInput('2) Please select spice level-\n a) High\n b) Medium\n c) Low\nEnter your choice (a/b/c): ', 3);
        const cuisine = await this.getValidAttributeInput('3) Which cuisine?-\n a) North Indian\n b) South Indian\n c) Other\nEnter your choice (a/b/c): ', 3);
        const sweetTooth = await this.getValidAttributeInput('4) Sweet tooth?-\n a) Yes\n b) No\nEnter your choice (a/b): ', 2);
        return { foodType, spiceLevel, cuisine, sweetTooth };
    }

    async getValidAttributeInput(displayString: string, noOfOptions: number) {
        const validOptions = noOfOptions === 3 ? ['a', 'b', 'c'] : ['a', 'b'];
        const attribute = (await getInput(displayString)).toLowerCase();
    
        if (validOptions.includes(attribute)) {
            return attribute;
        } else {
            console.log(`Invalid input. Please enter either ${validOptions.join(', ')}.`);
            return this.getValidAttributeInput(displayString, noOfOptions);
        }
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
        const price = await this.getFoodItemPrice('Enter food item price: ');
        const mealTime = await this.getFoodItemMealTime();
        const availabilityStatus = await this.getAvailabilityStatus();
        const itemAttributes = await this.getAttributes();
        this.client.send({ action: 'addFoodItem', name: name.toLowerCase(), price, mealTime, availabilityStatus, itemAttributes });
    }

    async getFoodItemPrice(displayString: string) {
        const price = await getInput(displayString);
        if(!isNaN(Number(price))) {
            return price;
        } else {
            console.log('Invalid price. Please enter a valid price.');
            return this.getFoodItemPrice(displayString);
        }
    }

    async getFoodItemMealTime() {
        const mealTime = await getInput('Enter meal time (breakfast/lunch/dinner): ');
        if (['breakfast', 'lunch', 'dinner'].includes(mealTime.toLowerCase())) {
            return mealTime.toLowerCase();
        } else {
            console.log('Invalid meal time. Please enter either breakfast, lunch, or dinner.');
            return this.getFoodItemMealTime();
        }
    }

    async getAvailabilityStatus() {
        const availabilityStatus = await getInput('Enter availability status (0/1): ');
        if (['0', '1'].includes(availabilityStatus)) {
            return availabilityStatus;
        } else {
            console.log('Invalid availability status. Please enter either 0 or 1.');
            return this.getAvailabilityStatus();
        }
    }

    async removeFoodItem() {
        const removeName = await getInput('Enter the name of the food item to remove: ');
        this.client.send({ action: 'removeFoodItem', name: removeName.toLowerCase() });
    }

    async updateFoodItemPrice() {
        const updatePriceName = await getInput('Enter the name of the food item to update the price: ');
        const newPrice = await this.getFoodItemPrice('Enter new price: ');
        this.client.send({ action: 'updateFoodItemPrice', name: updatePriceName.toLowerCase(), price: newPrice });
    }

    async updateFoodItemAvailability() {
        const updateAvailabilityName = await getInput('Enter the name of the food item to update the availability: ');
        const newAvailabilityStatus = await getInput('Enter new availability status (0/1): ');
        this.client.send({ action: 'updateFoodItemAvailability', name: updateAvailabilityName, availabilityStatus: newAvailabilityStatus });
    }

    logoutClient() {
        this.client.send({ action: 'LogLogout', username: this.client.getUsername() });
        process.stdout.write('\x1Bc');
        this.printThankYouMessage();
        process.exit(0);
    }
}
