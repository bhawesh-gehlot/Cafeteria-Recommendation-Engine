import WebSocket from 'ws';
import { Server } from 'http';
import { UserController } from './controllers/userController';
import { MenuController } from './controllers/menuController';
import { NotificationController } from './controllers/notificationController';
import { UserDB } from './dbLayer/userDB';

export class WebSocketServer {
    private wss: WebSocket.Server;
    private menuController: MenuController;
    private notificationController: NotificationController;
    private userController: UserController;
    private userDB: UserDB;

    constructor(server: Server) {
        this.wss = new WebSocket.Server({ server });
        this.menuController = new MenuController();
        this.notificationController = new NotificationController();
        this.userController = new UserController(new UserDB());
        this.userDB = new UserDB();
    }

    start() {
        this.wss.on('connection', (ws) => {
            console.log('Client connected');

            ws.on('message', async (message) => {
                const data = JSON.parse(message.toString());
                await this.handleMessage(ws, data);
            });

            ws.on('close', () => {
                console.log('Client disconnected');
            });
        });
    }

    private async handleMessage(ws: WebSocket, data: any) {
        switch (data.action) {
            case 'checkUserExists':
                await this.userController.checkUserExists(ws, data);
                break;
            case 'login':
                await this.userController.login(ws, data);
                break;
            case 'addFoodItem':
                await this.menuController.handleAddFoodItem(ws, data);
                break;
            case 'removeFoodItem':
                await this.menuController.handleRemoveFoodItem(ws, data);
                break;
            case 'updateFoodItemPrice':
                await this.menuController.handleUpdateFoodItemPrice(ws, data);
                break;
            case 'updateFoodItemAvailability':
                await this.menuController.handleUpdateFoodItemAvailability(ws, data);
                break;
            case 'getRecommendation':
                await this.menuController.displayRecommendations(ws);
                break;
            case 'getMenu':
                await this.menuController.displayMenu(ws);
                break;
            case 'rolloutMenuItems':
                await this.menuController.preRolloutOperations(ws);
                break;
            case 'rolloutFoodItem':
                await this.menuController.rolloutFoodItems(ws, data);
                break;
            case 'voteFood':
                await this.menuController.voteFoodItem(ws, data);
                break;
            case 'checkResponses':
                await this.menuController.checkResponses(ws);
                break;
            case 'selectTodayMeal':
                await this.menuController.selectTodayMeal(ws);
                break;
            case 'getNotifications':
                await this.notificationController.getNotifications(ws, data);
                break;
            case 'getRolloutItems':
                await this.menuController.getRolloutItems(ws, data);
                break;
            case 'saveSelectedMeal':
                await this.menuController.saveSelectedMeal(ws, data);
                break;
            case 'giveFeedback':
                await this.menuController.giveFeedback(ws);
                break;
            case 'LogLogout':
                await this.userDB.logLogin(data.username, 'Logout');
                break;
            case 'provideFeedback':
                await this.menuController.saveFeedback(ws, data);
                break;
            case 'getDiscardMenuItems':
                await this.menuController.getDiscardedMenuItems(ws);
                break;
            case 'discardMenuItem':
                await this.menuController.discardMenuItem(ws, data);
                break;
            case 'askDetailedFeedback':
                await this.menuController.askDetailedFeedback(ws, data);
                break;
            case 'getDetailedFeedback':
                await this.menuController.getDetailedFeedback(ws);
                break;
            case 'saveDetailedFeedback':
                await this.menuController.saveDetailedFeedback(ws, data);
                break;
            case 'fetchDetailedFeedback':
                await this.menuController.fetchDetailedFeedback(ws, data);
                break;
            case 'updateUserProfile':
                await this.menuController.savePreferences(ws, data);
                break;
            default:
                console.warn(`Unknown action: ${data.action}`);
                break;
        }
    }
}
