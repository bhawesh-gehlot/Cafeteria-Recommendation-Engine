import { getLatestNotifications } from "../services/notificationService";

export class NotificationController  {
    static async getNotifications(ws, data) {
        const notifications = await getLatestNotifications(data.userRole);
        ws.send(JSON.stringify({ status: notifications ? 'showNotifications' : 'error', notifications }));
    }
}