import WebSocket from 'ws';
import { Server } from 'http';
import { AuthController } from './controllers/authController';
import { MenuController } from './controllers/menuController';
import { NotificationController } from './controllers/notificationController';
import { AuthDB } from './dbLayer/authDB';

export class WebSocketServer {
    private wss: WebSocket.Server;
    private menuController: MenuController;
    private notificationController: NotificationController;
    private authController: AuthController;
    private authDB: AuthDB;

    constructor(server: Server) {
        this.wss = new WebSocket.Server({ server });
        this.menuController = new MenuController();
        this.notificationController = new NotificationController();
        this.authController = new AuthController(new AuthDB());
        this.authDB = new AuthDB();
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
                await this.authController.checkUserExists(ws, data);
                break;
            case 'login':
                await this.authController.login(ws, data);
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
            case 'getTopRecommendations':
                await this.menuController.getTopRecommendations(ws);
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
                await this.menuController.getRolloutItems(ws);
                break;
            case 'saveSelectedMeal':
                await this.menuController.saveSelectedMeal(ws, data);
                break;
            case 'giveFeedback':
                await this.menuController.giveFeedback(ws);
                break;
            case 'LogLogout':
                await this.authDB.logLogin(data.username, 'Logout');
                break;
            case 'provideFeedback':
                await this.menuController.saveFeedback(ws, data);
                break;
            default:
                console.warn(`Unknown action: ${data.action}`);
                break;
        }
    }
}
