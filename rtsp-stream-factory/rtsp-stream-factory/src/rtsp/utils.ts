export function generateStreamUrl(deviceId: string, streamId: string): string {
    return `rtsp://${deviceId}/stream/${streamId}`;
}

export function parseRtspUrl(rtspUrl: string): { deviceId: string; streamId: string } | null {
    const regex = /rtsp:\/\/([^\/]+)\/stream\/([^\/]+)/;
    const match = rtspUrl.match(regex);
    if (match) {
        return {
            deviceId: match[1],
            streamId: match[2],
        };
    }
    return null;
}

export function validateStreamId(streamId: string): boolean {
    const regex = /^[a-zA-Z0-9_-]+$/;
    return regex.test(streamId);
}