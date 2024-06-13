import { WebSocketServer } from './websocketServer';
import express from 'express';
import { createServer } from 'http';

const app = express();
const server = createServer(app);

const wsServer = new WebSocketServer(server);
wsServer.start();

server.listen(8080, () => {
    console.log('Server is listening on port 8080');
});
