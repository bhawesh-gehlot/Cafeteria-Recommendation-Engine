import WebSocket from 'ws';
import { Server } from 'http';
import { AuthController } from './authController';
import { MenuController } from './menuController';
import { NotificationController } from './notificationController';
import { AuthService } from '../services/authService';

export class WebSocketServer {
    private wss: WebSocket.Server;

    constructor(server: Server) {
        this.wss = new WebSocket.Server({ server });
    }

    start() {
        this.wss.on('connection', (ws) => {
            console.log('Client connected');

            ws.on('message', async (message) => {
                const data = JSON.parse(message.toString());

                if (data.action === 'checkUserExists') {
                    await AuthController.checkUserExists(ws, data);
                } else if (data.action === 'login') {
                    await AuthController.login(ws, data);
                } else if (data.action === 'addFoodItem') {
                    MenuController.handleAddFoodItem(ws, data);
                } else if (data.action === 'removeFoodItem') {
                    MenuController.handleRemoveFoodItem(ws, data);
                } else if (data.action === 'updateFoodItemPrice') {
                    MenuController.handleUpdateFoodItemPrice(ws, data);
                } else if (data.action === 'updateFoodItemAvailability') {
                    MenuController.handleUpdateFoodItemAvailability(ws, data);
                } else if (data.action === 'getRecommendation') {
                    MenuController.displayRecommendations(ws);
                } else if (data.action === 'getMenu') {
                    MenuController.displayMenu(ws);
                } else if (data.action === 'getTopRecommendations') {
                    MenuController.getTopRecommendations(ws);
                } else if (data.action === 'rolloutFoodItem') {
                    MenuController.rolloutFoodItems(ws, data);
                } else if (data.action === 'voteFood') {
                    MenuController.voteFoodItem(ws, data);
                } else if (data.action === 'checkResponses') {
                    MenuController.checkResponses(ws);
                } else if (data.action === 'selectTodayMeal') {
                    MenuController.selectTodayMeal(ws);
                } else if (data.action === 'getNotifications') {
                    NotificationController.getNotifications(ws, data);
                } else if (data.action === 'getRolloutItems') {
                    MenuController.getRolloutItems(ws);
                } else if (data.action === 'saveSelectedMeal') {
                    MenuController.saveSelectedMeal(ws, data);
                } else if (data.action === 'giveFeedback') {
                    MenuController.giveFeedback(ws);
                } else if (data.action === 'LogLogout') {
                    AuthService.logLogin(data.username, 'Logout');
                } else if (data.action === 'provideFeedback') {
                    MenuController.saveFeedback(ws, data);
                }
            });

            ws.on('close', () => {
                console.log('Client disconnected');
            });
        });
    }
}
