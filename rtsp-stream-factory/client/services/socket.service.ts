import { io } from 'socket.io-client';

class SocketService {
    private socket: SocketIOClient.Socket;

    constructor(serverUrl: string) {
        this.socket = io(serverUrl);
    }

    public connect() {
        this.socket.connect();
    }

    public disconnect() {
        this.socket.disconnect();
    }

    public on(event: string, callback: (...args: any[]) => void) {
        this.socket.on(event, callback);
    }

    public emit(event: string, data: any) {
        this.socket.emit(event, data);
    }
}

export default SocketService;