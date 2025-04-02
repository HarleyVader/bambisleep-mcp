export type Stream = {
    id: string;
    name: string;
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;
};

export type Device = {
    id: string;
    name: string;
    type: string;
    status: 'online' | 'offline';
    lastSeen: Date;
};

export type User = {
    id: string;
    username: string;
    email: string;
    role: 'admin' | 'user';
    createdAt: Date;
    updatedAt: Date;
};