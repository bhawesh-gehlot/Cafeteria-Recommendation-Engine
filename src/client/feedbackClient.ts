import { WebSocketClient } from './websocketClient';
import { getInput } from '../utils/consoleInput';

export class Feedback {
    private client: WebSocketClient;

    constructor(client: WebSocketClient) {
        this.client = client;
    }

    async giveFeedback(selectedItems) {
        for(const selectedItem of selectedItems) {
            const rating = await getInput(`Please Rate meal for today\'s ${selectedItem.meal_time}: `);
            const comment = await getInput(`Please give a comment for meal for today\'s ${selectedItem.meal_time}: `);
            this.client.send({ action: 'provideFeedback', menu_item_id: selectedItem.menu_item_id, username: this.client.getUsername(), rating, comment });
        }
        console.log('Feedback saved successfully.');
    }
}
