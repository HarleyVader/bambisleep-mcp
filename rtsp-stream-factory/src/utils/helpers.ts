export const generateStreamId = (): string => {
    return `stream_${Date.now()}`;
};

export const isValidStreamUrl = (url: string): boolean => {
    const regex = /^(rtsp:\/\/|http:\/\/|https:\/\/)/;
    return regex.test(url);
};

export const parseControlSequence = (sequence: string): any => {
    try {
        return JSON.parse(sequence);
    } catch (error) {
        throw new Error('Invalid control sequence format');
    }
};