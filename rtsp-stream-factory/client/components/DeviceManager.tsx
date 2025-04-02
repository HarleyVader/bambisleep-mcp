import React, { useEffect, useState } from 'react';
import { fetchDevices, startDeviceStream, stopDeviceStream } from '../services/api.service';

const DeviceManager = () => {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadDevices = async () => {
            const deviceData = await fetchDevices();
            setDevices(deviceData);
            setLoading(false);
        };

        loadDevices();
    }, []);

    const handleStartStream = async (deviceId) => {
        await startDeviceStream(deviceId);
        // Optionally refresh the device list or update UI
    };

    const handleStopStream = async (deviceId) => {
        await stopDeviceStream(deviceId);
        // Optionally refresh the device list or update UI
    };

    if (loading) {
        return <div>Loading devices...</div>;
    }

    return (
        <div>
            <h2>Device Manager</h2>
            <ul>
                {devices.map(device => (
                    <li key={device.id}>
                        {device.name}
                        <button onClick={() => handleStartStream(device.id)}>Start Stream</button>
                        <button onClick={() => handleStopStream(device.id)}>Stop Stream</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default DeviceManager;