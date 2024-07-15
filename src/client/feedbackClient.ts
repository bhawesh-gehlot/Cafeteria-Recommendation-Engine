import { WebSocketClient } from './websocketClient';
import { getInput } from './utils/consoleInput';
import { Menu } from './menuClient';

export class Feedback {
    private client: WebSocketClient;
    private menu: Menu;

    constructor(client: WebSocketClient, menu: Menu) {
        this.client = client;
        this.menu = menu;
    }

    private async getRating(selectedItem) {
        const rating = await getInput(`Please Rate meal for today\'s ${selectedItem.meal_time} (0-5): `);
        if(!isNaN(Number(rating)) && Number(rating) >= 0 && Number(rating) <= 5) {
            return rating;
        } else {
            console.log('Please enter a valid rating between 0 and 5.');
            return this.getRating(selectedItem);
        }
    }

    async giveFeedback(selectedItems) {
        if (selectedItems.length > 0) {
            for(const selectedItem of selectedItems) {
                const rating = await this.getRating(selectedItem);
                const comment = await getInput(`Please give a comment for meal for today\'s ${selectedItem.meal_time}: `);
                this.client.send({ action: 'provideFeedback', menu_item_id: selectedItem.menu_item_id, username: this.client.getUsername(), rating, comment });
            }
            console.log('Feedback saved successfully.\n');
        } else {
            console.log('Chef has not selected any meal to cook for today. Please try again later.\n')
        }
        console.log("Please choose one of the following options:");
        this.menu.handleResponse(this.client.getOptions());
    }
}
