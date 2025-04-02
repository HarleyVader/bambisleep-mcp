export class UserModel {
    id: string;
    username: string;
    password: string;
    email: string;
    role: 'admin' | 'client';

    constructor(id: string, username: string, password: string, email: string, role: 'admin' | 'client') {
        this.id = id;
        this.username = username;
        this.password = password;
        this.email = email;
        this.role = role;
    }
}