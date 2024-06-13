import WebSocket from 'ws';
import { Server } from 'http';

export class WebSocketServer {
    private wss: WebSocket.Server;

    constructor(server: Server) {
        this.wss = new WebSocket.Server({ server });
    }

    start() {
        this.wss.on('connection', (ws) => {
            console.log('Client connected');

            ws.on('message', (message) => {
                console.log(`Received message: ${message}`);
            });

            ws.on('close', () => {
                console.log('Client disconnected');
            });
        });
    }
}
