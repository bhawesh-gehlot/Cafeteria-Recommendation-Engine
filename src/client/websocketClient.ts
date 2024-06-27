import WebSocket from 'ws';
import { Authentication } from './authClient';
import { Menu } from './menuClient';
import { Notification } from './notificationClient';
import { Feedback } from './feedbackClient';

export class WebSocketClient {
    private ws: WebSocket;
    private username: string;
    private retries: number = 0;
    private maxRetries: number = 3;
    private options: string[] = [];
    private role: string;

    private auth: Authentication;
    private menu: Menu;
    private notification: Notification;
    private feedback: Feedback;

    constructor() {
        this.auth = new Authentication(this);
        this.menu = new Menu(this);
        this.notification = new Notification(this);
        this.feedback = new Feedback(this, this.menu);
    }

    connect() {
        this.ws = new WebSocket('ws://localhost:8080');

        this.ws.on('open', () => {
            console.log('Connected to the server');
            this.auth.promptForUsername();
        });

        this.ws.on('message', (data) => {
            const response = JSON.parse(data.toString());
            this.handleResponse(response);
        });

        this.ws.on('close', () => {
            console.log('Disconnected from the server');
        });

        this.ws.on('error', (error) => {
            console.error(`WebSocket error: ${error}`);
        });
    }

    handleResponse(response: any) {
        switch(response.status) {
            case 'not_exists':
            case 'exists':
            case 'error':
            case 'success':
                this.auth.handleResponse(response);
                break;
            case 'menu':
                console.log(response.message);
                response.options ? this.menu.handleResponse(response.options) : this.menu.handleResponse(this.options);
                break;
            case 'showRecommendations':
                this.menu.showRecommendations(response.menuItems);
                break;
            case 'displayMenu':
                this.menu.displayMenu(response.menuItems);
                break;
            case 'printMessage':
                console.log(response.message);
                break;
            case 'showNotifications':
                this.notification.showNotifications(response.notifications);
                break;
            case 'selectMeal':
                this.menu.selectMeal();
                break;
            case 'selectedMenuItems':
                this.feedback.giveFeedback(response.selectedItems);
                break;
            default:
                console.log('Unknown response status:', response.status);
        }
    }

    send(data: any) {
        this.ws.send(JSON.stringify(data));
    }

    setUsername(username: string) {
        this.username = username;
    }

    getUsername(): string {
        return this.username;
    }

    setRole(role: string) {
        if (!this.role) {
            this.role = role;
        }
    }

    getRole(): string {
        return this.role;
    }

    setOptions(options: string[]) {
        this.options = options;
    }

    getOptions(): string[] {
        return this.options;
    }

    incrementRetries() {
        this.retries++;
    }

    getRetries(): number {
        return this.retries;
    }

    getMaxRetries(): number {
        return this.maxRetries;
    }

    resetRetries() {
        this.retries = 0;
    }
}
