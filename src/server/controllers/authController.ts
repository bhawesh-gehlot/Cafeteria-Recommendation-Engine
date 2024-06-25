import { AuthService } from '../services/authService';

export class AuthController {
    private static authService = new AuthService();

    static async checkUserExists(ws, data) {
        const { username } = data;
        const exists = await AuthController.authService.userExists(username);

        if (exists) {
            ws.send(JSON.stringify({ status: 'exists', message: 'User found. Please enter your password.' }));
        } else {
            ws.send(JSON.stringify({ status: 'not_exists', message: 'User does not exist. Please enter a valid username.' }));
        }
    }

    static async login(ws, data) {
        const { username, password } = data;
        const authenticated = await AuthController.authService.authenticate(username, password);

        if (authenticated) {
            const role = await AuthController.authService.getUserRole(username);
            ws.send(JSON.stringify({ status: 'success', role: role, message: `Welcome ${role}!` }));
            await AuthService.logLogin(username, 'Login');
            AuthController.sendMenuOptions(ws, role);
        } else {
            ws.send(JSON.stringify({ status: 'error', message: 'Invalid password. Please try again.' }));
        }
    }

    static sendMenuOptions(ws, role) {
        let options: Array<string> = [];
        if (role === 'admin') {
            options = [
                '1. Add a food item',
                '2. Remove an existing food item',
                '3. Update the price of a food item',
                '4. Update the availability of a food item',
                '5. Logout',
            ];
        } else if (role === 'chef') {
            options = [
                '1. Check Recommended Food Items',
                '2. See the Menu',
                '3. Rollout Food for tomorrow',
                '4. Check responses for today\'s meals',
                '5. Select today\s meals',
                '6. View notifications',
                '7. Generate Monthly User Feedback report',
                '8. Logout',
            ];
        } else if (role === 'employee') {
            options = [
                '1. Select Food for tomorrow',
                '2. Rate today\'s food',
                '3. View notifications',
                '4. See the Menu',
                '5. Logout',
            ];
        }

        ws.send(JSON.stringify({ status: 'menu', message: 'Please choose one of the following options:', options }));
    }
}
