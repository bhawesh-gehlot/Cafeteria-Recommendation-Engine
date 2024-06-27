import { WebSocketClient } from './websocketClient';

export class Notification {
    private client: WebSocketClient;

    constructor(client: WebSocketClient) {
        this.client = client;
    }

    async showNotifications(notifications) {
        console.log(`Latest Notifications for ${this.client.getUsername()}:`);
        notifications.forEach((notification: any) => {
            notification.date_created = (new Date(notification.date_created)).toISOString();
            console.log(`${notification.date_created}: ${notification.message}`);
        });
    }
}
