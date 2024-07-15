import { MenuDB } from "../dbLayer/menuDB";
import { NotificationDB } from "../dbLayer/notificationDB";

export class MenuService {
    private notificationDB: NotificationDB;
    private menuDB: MenuDB;

    constructor(menuDB, notificationDB) {
        this.menuDB = menuDB;
        this.notificationDB = notificationDB;
    }

    async handleAction(
        ws: WebSocket,
        action: () => Promise<boolean>,
        successMessage: string,
        errorMessage: string,
        notifications: { role: string, message: string }[] = []
    ) {
        const success = await action();
        ws.send(JSON.stringify({ status: success ? 'success' : 'failure', message: success ? successMessage : errorMessage }));

        if (success) {
            notifications.forEach((notification) => this.notificationDB.createNotification(notification.role, notification.message));
        }
    }

    async getTopRecommendations(ws) {
        const mealTimes = ['breakfast', 'lunch', 'dinner'];
        for (const mealTime of mealTimes) {
            const recommendedItems = await this.menuDB.getRecommendedItems(mealTime);
            const message = `Top recommended items for ${mealTime}: ${recommendedItems}`;
            ws.send(JSON.stringify({ status: message ? 'printMessage' : 'failure', message }));
        }
    }

    getAttributes(userPreferences) {
        const foodPreference = userPreferences.foodType === 'c' ? 'eggetarian' : userPreferences.foodType === 'b' ? 'non-vegetarian' : 'vegetarian';
        const spiceLevel = userPreferences.spiceLevel === 'a' ? 'high' : userPreferences.spiceLevel === 'b' ? 'medium' : 'low';
        const cuisine = userPreferences.cuisine === 'a' ? 'north-indian' : userPreferences.cuisine === 'b' ? 'south-indian' : 'other';
        const sweetTooth = userPreferences.sweetTooth === 'a' ? 'yes' : 'no';
        return { foodPreference, spiceLevel, cuisine, sweetTooth };
    }

    async getEmployeeVotes(ws) {
        const today = new Date().toISOString().slice(0, 10);
        const mealTimes = ['breakfast', 'lunch', 'dinner'];
        for (const mealTime of mealTimes) {
            const responses = await this.menuDB.selectFoodToPrepare(today, mealTime);
            responses.forEach((response: any) => {
                const message = `Item: ${response.item_name}, Votes: ${response.vote_count}`;
                ws.send(JSON.stringify({ status: message ? 'printMessage' : 'failure', message }));
            });
        }
    }

    async checkResponses(ws) {
        const mealTimes = ['breakfast', 'lunch', 'dinner'];
        for (const mealTime of mealTimes) {
            const message = await this.menuDB.checkResponses(mealTime);
            ws.send(JSON.stringify({ status: message ? 'printMessage' : 'failure', message }));
        }
    }

    async getAllRolledOutItems(ws, data) {
        let allRolledOutItems: any = [];
        const mealTimes = ['breakfast', 'lunch', 'dinner'];
        for (const mealTime of mealTimes) {
            const rolledOutItems = await this.menuDB.getRolledOutItems(mealTime, data.username);
            allRolledOutItems[mealTime] = rolledOutItems;
            const message = `Rolled out items for ${mealTime}: ${rolledOutItems}`;
            ws.send(JSON.stringify({ status: message ? 'printMessage' : 'failure', message }));
        }
        return allRolledOutItems;
    }
}