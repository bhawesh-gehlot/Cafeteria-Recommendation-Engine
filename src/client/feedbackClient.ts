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

    async giveFeedback(selectedItems) {
        for(const selectedItem of selectedItems) {
            const rating = await getInput(`Please Rate meal for today\'s ${selectedItem.meal_time}: `);
            const comment = await getInput(`Please give a comment for meal for today\'s ${selectedItem.meal_time}: `);
            this.client.send({ action: 'provideFeedback', menu_item_id: selectedItem.menu_item_id, username: this.client.getUsername(), rating, comment });
        }
        console.log('Feedback saved successfully.\n');
        console.log("Please choose one of the following options:");
        this.menu.handleResponse(this.client.getOptions());
    }
}
