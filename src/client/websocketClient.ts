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
            this.handleAdminOption(choice);
        } else {
            console.log('Invalid option. Please select a valid option.');
            this.options.forEach(option => console.log(option));
            this.promptForMenuOption();
        }
    }

    async handleAdminOption(choice: string) {
        if (choice === '1') {
            const name = await getInput('Enter food item name: ');
            const price = await getInput('Enter food item price: ');
            const mealTime = await getInput('Enter meal time (Breakfast/Lunch/Dinner): ');
            const availabilityStatus = await getInput('Enter availability status (0/1): ');

            this.ws.send(JSON.stringify({ action: 'addFoodItem', name, price, mealTime, availabilityStatus }));
        } else if (choice === '2') {
            const name = await getInput('Enter the name of the food item to remove: ');
            this.ws.send(JSON.stringify({ action: 'removeFoodItem', name }));
        } else if (choice === '3') {
            const name = await getInput('Enter the name of the food item to update the price: ');
            const price = await getInput('Enter the new price: ');
            this.ws.send(JSON.stringify({ action: 'updateFoodItemPrice', name, price }));
        } else if (choice === '4') {
            const name = await getInput('Enter the name of the food item to update the availability: ');
            const availabilityStatus = await getInput('Enter new availability status (0/1): ');
            this.ws.send(JSON.stringify({ action: 'updateFoodItemAvailability', name, availabilityStatus }));
        } else if (choice === '5') {
            process.stdout.write('\x1Bc')
            console.log("Thank You for using Cafeteria Recommendation System....");
            process.exit(0);
        }
    }

    checkUserExists(username: string) {
        this.ws.send(JSON.stringify({ action: 'checkUserExists', username }));
    }

    login(username: string, password: string) {
        this.ws.send(JSON.stringify({ action: 'login', username, password }));
    }
}
