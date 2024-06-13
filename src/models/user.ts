export class User {
    id: number;
    name: string;
    role: 'Admin' | 'Chef' | 'Employee';

    constructor(id: number, name: string, role: 'Admin' | 'Chef' | 'Employee') {
        this.id = id;
        this.name = name;
        this.role = role;
    }
}
