import WebSocket from 'ws';
import { getInput } from '../utils/consoleInput';

export class WebSocketClient {
    private ws: WebSocket;
    private username: string;
    private retries: number = 0;
    private maxRetries: number = 3;
    private options: string[] = [];

    connect() {
        this.ws = new WebSocket('ws://localhost:8080');

        this.ws.on('open', () => {
            console.log('Connected to the server');
            this.promptForUsername();
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
        if (response.status === 'not_exists') {
            console.log(response.message);
            this.promptForUsername();
        } else if (response.status === 'exists') {
            console.log(response.message);
            this.promptForPassword();
        } else if (response.status === 'error') {
            console.log(response.message);
            this.retries++;
            if (this.retries < this.maxRetries) {
                this.promptForPassword();
            } else {
                console.log('Max retries reached. Terminating client.');
                this.ws.close();
            }
        } else if (response.status === 'success') {
            console.log(response.message);
        } else if (response.status === 'menu') {
            console.log(response.message);
            this.options = response.options;
            this.options.forEach(option => console.log(option));
            this.promptForMenuOption();
        }
    }

    promptForUsername() {
        getInput('Enter your username: ').then((username) => {
            this.username = username;
            this.checkUserExists(username);
        });
    }

    promptForPassword() {
        getInput('Enter your password: ').then((password) => {
            this.login(this.username, password);
        });
    }

    async promptForMenuOption() {
        const choice = await getInput('Enter your choice: ');

        const validOptions = this.options.map(option => option.split('.')[0].trim());
        if (validOptions.includes(choice)) {
            console.log(`You selected option ${choice}`);
            // Handle the selected option logic here.
        } else {
            console.log('Invalid option. Please select a valid option.');
            this.options.forEach(option => console.log(option));
            this.promptForMenuOption();
        }
    }

    checkUserExists(username: string) {
        this.ws.send(JSON.stringify({ action: 'checkUserExists', username }));
    }

    login(username: string, password: string) {
        this.ws.send(JSON.stringify({ action: 'login', username, password }));
    }
}
