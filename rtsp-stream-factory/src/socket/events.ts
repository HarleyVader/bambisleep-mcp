export const SOCKET_EVENTS = {
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    STREAM_START: 'stream_start',
    STREAM_STOP: 'stream_stop',
    ADMIN_COMMAND: 'admin_command',
    CLIENT_REQUEST: 'client_request',
    ERROR: 'error',
};

export const ADMIN_EVENTS = {
    USER_LOGIN: 'user_login',
    USER_LOGOUT: 'user_logout',
    STREAM_CONTROL: 'stream_control',
    ERROR: 'error',
};

export const CLIENT_EVENTS = {
    REQUEST_STREAM: 'request_stream',
    RECEIVE_STREAM: 'receive_stream',
    PLAY: 'play_stream',
    PAUSE: 'pause_stream',
    ERROR: 'error',
};