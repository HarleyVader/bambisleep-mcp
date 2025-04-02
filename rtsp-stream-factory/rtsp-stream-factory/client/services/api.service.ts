import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api'; // Adjust the base URL as needed

export const getStreams = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/streams`);
        return response.data;
    } catch (error) {
        console.error('Error fetching streams:', error);
        throw error;
    }
};

export const startStream = async (streamId) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/streams/start`, { streamId });
        return response.data;
    } catch (error) {
        console.error('Error starting stream:', error);
        throw error;
    }
};

export const stopStream = async (streamId) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/streams/stop`, { streamId });
        return response.data;
    } catch (error) {
        console.error('Error stopping stream:', error);
        throw error;
    }
};

export const getDevices = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/devices`);
        return response.data;
    } catch (error) {
        console.error('Error fetching devices:', error);
        throw error;
    }
};