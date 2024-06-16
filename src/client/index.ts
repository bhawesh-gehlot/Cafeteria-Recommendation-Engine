import { WebSocketClient } from './websocketClient';

async function main() {
    const wsClient = new WebSocketClient();
    wsClient.connect();
}

main();
