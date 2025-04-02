import { config as dotenvConfig } from 'dotenv';

dotenvConfig();

const config = {
    port: process.env.PORT || 3000,
    db: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'user',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'database',
    },
    rtsp: {
        streamUrl: process.env.RTSP_STREAM_URL || 'rtsp://localhost:8554/stream',
        timeout: process.env.RTSP_TIMEOUT || 30,
    },
    socket: {
        path: process.env.SOCKET_PATH || '/socket.io',
    },
    logLevel: process.env.LOG_LEVEL || 'info',
};

export default config;