export class DeviceModel {
    id: string;
    name: string;
    type: string;
    status: string;
    lastActive: Date;

    constructor(id: string, name: string, type: string, status: string, lastActive: Date) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.status = status;
        this.lastActive = lastActive;
    }
}