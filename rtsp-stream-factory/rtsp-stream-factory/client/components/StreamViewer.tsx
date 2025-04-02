import React, { useEffect, useRef } from 'react';

const StreamViewer: React.FC<{ streamUrl: string }> = ({ streamUrl }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.src = streamUrl;
            videoRef.current.play();
        }
    }, [streamUrl]);

    return (
        <div>
            <h2>Stream Viewer</h2>
            <video ref={videoRef} controls width="600" />
        </div>
    );
};

export default StreamViewer;