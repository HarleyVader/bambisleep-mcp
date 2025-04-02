import React, { useEffect, useState } from 'react';
import { fetchAdminData, controlStream } from '../services/api.service';

const AdminPanel = () => {
    const [adminData, setAdminData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadAdminData = async () => {
            try {
                const data = await fetchAdminData();
                setAdminData(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadAdminData();
    }, []);

    const handleStreamControl = async (action) => {
        try {
            await controlStream(action);
            // Optionally refresh data or update state
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            <h1>Admin Panel</h1>
            <div>
                <h2>Stream Control</h2>
                <button onClick={() => handleStreamControl('start')}>Start Stream</button>
                <button onClick={() => handleStreamControl('stop')}>Stop Stream</button>
            </div>
            <div>
                <h2>Admin Data</h2>
                <pre>{JSON.stringify(adminData, null, 2)}</pre>
            </div>
        </div>
    );
};

export default AdminPanel;