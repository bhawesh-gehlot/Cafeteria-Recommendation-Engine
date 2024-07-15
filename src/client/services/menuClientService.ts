import { getInput } from "../utils/consoleInput";
import { WebSocketClient } from "../websocketClient";

export class MenuClientService {
    private client: WebSocketClient;

    constructor(client: WebSocketClient) {
        this.client = client;
    }

    async inputRolloutItems(menuItemNames: string[], mealTime: string) {
        const noOfItems = await this.getNumberOfItems(`\nPlease enter the number of items to rollout for ${mealTime}: `);
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

    async getVoteFromEmployee(allRolledOutItems, mealTime, isResponseTaken) {
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

    async getInputForMeal(displayString: string, menuItemNames: string[]) {
        const meal = (await getInput(displayString)).toLowerCase();
        if (menuItemNames.includes(meal)) {
            return meal;
        } else {
            console.log('Invalid item name. Please enter an item present in menu.');
            return this.getInputForMeal(displayString, menuItemNames);
        }
    }

    async handleDiscardOptions(discardedItems, discardedItemNames) {
        const discardOption = await getInput('\n1. Remove the Food Item from Menu List.\n2. Get Detailed Feedback.\n3. Check Feedback.\nEnter your choice: ');
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

    async getAttributes() {
        const foodType = await this.getValidAttributeInput('1) Please select one-\n a) Vegetarian\n b) Non-Vegetarian\n c) Eggetarian\nEnter your choice (a/b/c): ', 3);
        const spiceLevel = await this.getValidAttributeInput('2) Please select spice level-\n a) High\n b) Medium\n c) Low\nEnter your choice (a/b/c): ', 3);
        const cuisine = await this.getValidAttributeInput('3) Which cuisine?-\n a) North Indian\n b) South Indian\n c) Other\nEnter your choice (a/b/c): ', 3);
        const sweetTooth = await this.getValidAttributeInput('4) Sweet tooth?-\n a) Yes\n b) No\nEnter your choice (a/b): ', 2);
        return { foodType, spiceLevel, cuisine, sweetTooth };
    }

    private async getValidAttributeInput(displayString: string, noOfOptions: number) {
        const validOptions = noOfOptions === 3 ? ['a', 'b', 'c'] : ['a', 'b'];
        const attribute = (await getInput(displayString)).toLowerCase();
    
        if (validOptions.includes(attribute)) {
            return attribute;
        } else {
            console.log(`Invalid input. Please enter either ${validOptions.join(', ')}.`);
            return this.getValidAttributeInput(displayString, noOfOptions);
        }
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

    async inputDetailedFeedback(itemsForFeedback) {
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
    }

    logDetailedFeedback(detailedFeedback) {
        console.log('Detailed Feedback:');
        console.log('----------------------------------------------------------------------------');
        detailedFeedback.forEach((feedback: any) => {
            console.log('Question: ' + feedback.question);
            console.log('Feedback: ' + feedback.response);
            console.log('----------------------------------------------------------------------------');
        });
    }

    async getVoteForTomorrow(allRolledOutItems) {
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
    }
}