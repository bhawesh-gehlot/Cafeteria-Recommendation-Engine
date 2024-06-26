import { NotificationDB } from '../dbLayer/notificationDB';

export class NotificationController {
    private notificationDB: NotificationDB;

    constructor() {
        this.notificationDB = new NotificationDB();
    }

    async getNotifications(ws, data: any): Promise<void> {
        try {
            const notifications = await this.notificationDB.getLatestNotifications(data.userRole);
            ws.send(JSON.stringify({ status: notifications ? 'showNotifications' : 'error', notifications }));
            ws.send(JSON.stringify({ status: 'menu', message: '\nPlease choose one of the following options:' }));
        } catch (error: any) {
            ws.send(JSON.stringify({ status: 'error', message: 'Failed to fetch notifications.' }));
            console.error(`Error while getting Notifications: ${error.message}`);
            ws.send(JSON.stringify({ status: 'menu', message: '\nPlease choose one of the following options:' }));
        }
    }
}
