export class StreamModel {
    id: string;
    name: string;
    status: 'active' | 'inactive';
    createdAt: Date;
    updatedAt: Date;

    constructor(id: string, name: string, status: 'active' | 'inactive') {
        this.id = id;
        this.name = name;
        this.status = status;
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    updateStatus(newStatus: 'active' | 'inactive') {
        this.status = newStatus;
        this.updatedAt = new Date();
    }
}