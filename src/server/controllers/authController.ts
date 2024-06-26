import { AuthDB } from '../dbLayer/authDB';
import { ADMIN_OPTIONS, CHEF_OPTIONS, EMPLOYEE_OPTIONS } from '../definitions/constants';

export class AuthController {
    private authDB: AuthDB;

    constructor(authDB: AuthDB) {
        this.authDB = authDB;
    }

    async checkUserExists(ws, data: any): Promise<void> {
        const { username } = data;
        const exists = await this.authDB.userExists(username);

        const response = exists
            ? { status: 'exists', message: 'User found. Please enter your password.' }
            : { status: 'not_exists', message: 'User does not exist. Please enter a valid username.' };

        ws.send(JSON.stringify(response));
    }

    async login(ws, data: any): Promise<void> {
        const { username, password } = data;
        const authenticated = await this.authDB.authenticate(username, password);

        if (authenticated) {
            const role = await this.authDB.getUserRole(username);
            ws.send(JSON.stringify({ status: 'success', role, message: `Welcome ${role}!` }));
            await this.authDB.logLogin(username, 'Login');
            this.sendMenuOptions(ws, role);
        } else {
            ws.send(JSON.stringify({ status: 'error', message: 'Invalid password. Please try again.' }));
        }
    }

    private sendMenuOptions(ws, role: string | null): void {
        let options: string[] = [];

        switch (role) {
            case 'admin':
                options = ADMIN_OPTIONS;
                break;
            case 'chef':
                options = CHEF_OPTIONS;
                break;
            case 'employee':
                options = EMPLOYEE_OPTIONS;
                break;
        }

        ws.send(JSON.stringify({ status: 'menu', message: 'Please choose one of the following options:', options }));
    }
}
