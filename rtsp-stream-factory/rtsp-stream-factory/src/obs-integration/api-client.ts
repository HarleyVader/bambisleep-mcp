import axios from 'axios';

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async startStream(streamId: string) {
        const response = await axios.post(`${this.baseUrl}/streams/${streamId}/start`);
        return response.data;
    }

    async stopStream(streamId: string) {
        const response = await axios.post(`${this.baseUrl}/streams/${streamId}/stop`);
        return response.data;
    }

    async getStreamStatus(streamId: string) {
        const response = await axios.get(`${this.baseUrl}/streams/${streamId}/status`);
        return response.data;
    }

    async getAllStreams() {
        const response = await axios.get(`${this.baseUrl}/streams`);
        return response.data;
    }
}

export default ApiClient;