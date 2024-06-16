import WebSocket from 'ws';
import { Server } from 'http';
import { AuthController } from './authController';

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
                }
            });

            ws.on('close', () => {
                console.log('Client disconnected');
            });
        });
    }
}
