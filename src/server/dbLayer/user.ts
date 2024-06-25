export class User {
    emp_id: number;
    username: string;
    role: 'admin' | 'chef' | 'employee';
    password: string;

    constructor(emp_id: number, username: string, role: 'admin' | 'chef' | 'employee', password: string) {
        this.emp_id = emp_id;
        this.username = username;
        this.role = role;
        this.password = password;
    }
}
