import React from 'react';
import ReactDOM from 'react-dom';
import StreamViewer from './components/StreamViewer';
import AdminPanel from './components/AdminPanel';
import DeviceManager from './components/DeviceManager';

const App = () => {
    return (
        <div>
            <h1>RTSP Stream Factory</h1>
            <StreamViewer />
            <AdminPanel />
            <DeviceManager />
        </div>
    );
};

ReactDOM.render(<App />, document.getElementById('root'));