import { User } from '../models/user';

export class AuthService {
    private users: User[] = [
        new User(1, 'AdminUser', 'Admin'),
        new User(2, 'ChefUser', 'Chef'),
        new User(3, 'EmployeeUser', 'Employee')
    ];

    authenticate(id: number, name: string): User | null {
        return this.users.find(user => user.id === id && user.name === name) || null;
    }
}
