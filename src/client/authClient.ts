import { WebSocketClient } from './websocketClient';
import { getInput } from '../utils/consoleInput';

export class Authentication {
    private client: WebSocketClient;

    constructor(client: WebSocketClient) {
        this.client = client;
    }

    promptForUsername() {
        getInput('Enter your username: ').then((username) => {
            this.client.setUsername(username);
            this.checkUserExists(username);
        });
    }

    promptForPassword() {
        getInput('Enter your password: ').then((password) => {
            this.login(this.client.getUsername(), password);
        });
    }

    handleResponse(response: any) {
        switch(response.status) {
            case 'not_exists':
                console.log(response.message);
                this.promptForUsername();
                break;
            case 'exists':
                console.log(response.message);
                this.promptForPassword();
                break;
            case 'error':
                console.log(response.message);
                this.client.incrementRetries();
                if (this.client.getRetries() < this.client.getMaxRetries()) {
                    this.promptForPassword();
                } else {
                    console.log('Max retries reached. Terminating client.');
                    this.client.send({ action: 'close' });
                }
                break;
            case 'success':
                process.stdout.write('\x1Bc');
                console.log(response.message);
                this.client.setRole(response.role);
                break;
        }
    }

    checkUserExists(username: string) {
        this.client.send({ action: 'checkUserExists', username });
    }

    login(username: string, password: string) {
        this.client.send({ action: 'login', username, password });
    }
}
