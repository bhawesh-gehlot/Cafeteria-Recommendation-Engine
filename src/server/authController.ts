import { Request, Response } from 'express';

export class AuthController {
    static login(req: Request, res: Response) {
        // Logic for user login
        res.send('User logged in');
    }

    static logout(req: Request, res: Response) {
        // Logic for user logout
        res.send('User logged out');
    }
}
