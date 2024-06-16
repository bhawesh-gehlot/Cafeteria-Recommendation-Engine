import { Application, Request, Response } from 'express';
import { AuthController } from './server/authController';

export const routes = (app: Application) => {
    app.post('/login', AuthController.login);
    // app.post('/logout', AuthController.logout);

    // Add other routes as needed
    app.get('/', (req: Request, res: Response) => {
        res.send('Welcome to the Recommendation Engine API');
    });
};
