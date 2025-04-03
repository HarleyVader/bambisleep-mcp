FROM ubuntu:22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies for building FFmpeg and OBS
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    wget \
    tar \
    pkg-config \
    cmake \
    yasm \
    nasm \
    libx264-dev \
    libx265-dev \
    libnuma-dev \
    libvpx-dev \
    libfdk-aac-dev \
    libmp3lame-dev \
    libopus-dev \
    libdav1d-dev \
    libva-dev \
    libdrm-dev \
    libvorbis-dev \
    libass-dev \
    libfreetype6-dev \
    libunistring-dev \
    libaribb24-dev \
    libfontconfig1-dev \
    libfribidi-dev \
    libharfbuzz-dev \
    libjansson-dev \
    libtheora-dev \
    libxcb-shm0-dev \
    libxcb-xfixes0-dev \
    libxcb-shape0-dev \
    zlib1g-dev \
    libgles2-mesa-dev \
    libgl1-mesa-dev \
    libjack-jackd2-dev \
    libpulse-dev \
    libqt5svg5-dev \
    libqt5x11extras5-dev \
    libspeexdsp-dev \
    libudev-dev \
    libv4l-dev \
    libvlc-dev \
    libx11-dev \
    libxcb-randr0-dev \
    libxcb-shm0-dev \
    libxcb-xinerama0-dev \
    libxcomposite-dev \
    libxinerama-dev \
    python3-dev \
    qtbase5-dev \
    swig \
    x11proto-core-dev \
    libcurl4-openssl-dev \
    libluajit-5.1-dev \
    ca-certificates \
    && apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install newer CMake version (3.28+)
RUN cd /tmp && \
    wget https://github.com/Kitware/CMake/releases/download/v3.28.1/cmake-3.28.1-linux-x86_64.tar.gz && \
    tar -xzvf cmake-3.28.1-linux-x86_64.tar.gz && \
    mv cmake-3.28.1-linux-x86_64 /opt/cmake && \
    ln -s /opt/cmake/bin/cmake /usr/local/bin/cmake && \
    ln -s /opt/cmake/bin/ctest /usr/local/bin/ctest && \
    ln -s /opt/cmake/bin/cpack /usr/local/bin/cpack && \
    ln -s /opt/cmake/bin/ccmake /usr/local/bin/ccmake && \
    rm /tmp/cmake-3.28.1-linux-x86_64.tar.gz

# Verify CMake version
RUN cmake --version

# Build FFmpeg 6.1 from source
WORKDIR /src
RUN git clone https://git.ffmpeg.org/ffmpeg.git && \
    cd ffmpeg && \
    git checkout n6.1 && \
    ./configure \
    --prefix=/usr \
    --enable-shared \
    --disable-static \
    --enable-gpl \
    --enable-libx264 \
    --enable-libx265 \
    --enable-libvpx \
    --enable-libfdk-aac \
    --enable-libmp3lame \
    --enable-libopus \
    --enable-libvorbis \
    --enable-libdav1d \
    --enable-libass \
    --enable-libfreetype \
    --disable-debug \
    && \
    make -j$(nproc) && \
    make install && \
    ldconfig

# Verify FFmpeg version
RUN ffmpeg -version

# Clone OBS repository and build it
WORKDIR /obs
RUN git clone --recursive https://github.com/obsproject/obs-studio.git && \
    cd obs-studio && \
    mkdir build && \
    cd build && \
    cmake -DENABLE_WEBSOCKET=ON -DUNIX_STRUCTURE=1 -DCMAKE_INSTALL_PREFIX=/usr .. && \
    make -j$(nproc) && \
    make install

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
