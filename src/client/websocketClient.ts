import WebSocket from 'ws';

export class WebSocketClient {
    private ws: WebSocket;

    connect() {
        this.ws = new WebSocket('ws://localhost:8080');

        this.ws.on('open', () => {
            console.log('Connected to the server');
        });

        this.ws.on('message', (data) => {
            console.log(`Received message: ${data}`);
        });

        this.ws.on('close', () => {
            console.log('Disconnected from the server');
        });

        this.ws.on('error', (error) => {
            console.error(`WebSocket error: ${error}`);
        });
    }
}
