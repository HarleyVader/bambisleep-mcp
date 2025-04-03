FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies for building OBS
RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    git \
    libavcodec-dev \
    libavdevice-dev \
    libavfilter-dev \
    libavformat-dev \
    libavutil-dev \
    libcurl4-openssl-dev \
    libfontconfig1-dev \
    libfreetype6-dev \
    libgl1-mesa-dev \
    libjack-jackd2-dev \
    libjansson-dev \
    libluajit-5.1-dev \
    libpulse-dev \
    libqt5svg5-dev \
    libqt5x11extras5-dev \
    libspeexdsp-dev \
    libswresample-dev \
    libswscale-dev \
    libudev-dev \
    libv4l-dev \
    libvlc-dev \
    libx11-dev \
    libx264-dev \
    libxcb-randr0-dev \
    libxcb-shm0-dev \
    libxcb-xinerama0-dev \
    libxcomposite-dev \
    libxinerama-dev \
    pkg-config \
    python3-dev \
    qtbase5-dev \
    libqt5x11extras5-dev \
    swig \
    x11proto-core-dev

# Clone OBS repository and build it
WORKDIR /obs
RUN git clone --recursive https://github.com/obsproject/obs-studio.git && \
    cd obs-studio && \
    mkdir build && \
    cd build && \
    cmake -DENABLE_WEBSOCKET=ON -DUNIX_STRUCTURE=1 -DCMAKE_INSTALL_PREFIX=/usr .. && \
    make -j$(nproc) && \
    make install

# Install obs-websocket plugin if it's not already part of the build
RUN if [ ! -f /usr/lib/obs-plugins/obs-websocket.so ]; then \
    git clone https://github.com/obsproject/obs-websocket.git && \
    cd obs-websocket && \
    mkdir build && cd build && \
    cmake -DLIBOBS_INCLUDE_DIR="/obs/obs-studio/libobs" -DCMAKE_INSTALL_PREFIX=/usr .. && \
    make -j$(nproc) && \
    make install; \
    fi

# Set up a script to run OBS headlessly with WebSocket server enabled
RUN echo '#!/bin/bash\n\
mkdir -p /config\n\
export HOME=/config\n\
obs --websocket_port=4444 --websocket_password="$OBS_PASSWORD" --studio-mode --minimize-to-tray\n\
' > /usr/local/bin/run-obs.sh && \
chmod +x /usr/local/bin/run-obs.sh

# Expose OBS WebSocket port
EXPOSE 4444

# Set up environment variables
ENV OBS_PASSWORD=""

# Set up volume for OBS configuration
VOLUME /config

# Set the entrypoint
ENTRYPOINT ["/usr/local/bin/run-obs.sh"]
