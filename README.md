bambisleep-mcp/
├── models/ # Data models
│ ├── resourceModel.js # Tracks node resources
│ ├── taskModel.js # Defines tasks for nodes
│ ├── streamModel.js # RTSP stream metadata
│ ├── deviceModel.js # Connected devices
│ └── userModel.js # User accounts
├── services/
│ ├── nodeService.js # Node management logic
│ ├── resourceService.js # Resource allocation
│ ├── streamService.js # Stream processing
│ └── obsService.js # OBS integration
├── controllers/
│ ├── streamController.js # Stream handling
│ ├── nodeController.js # Node management
│ └── adminController.js # Admin operations
├── routes/ # API endpoints
├── socket/ # WebSocket communication
│ ├── events.js # Event definitions
│ ├── handlers/
│ │ ├── headNode.js # Head node handlers
│ │ ├── swapNode.js # Swap node handlers
│ │ ├── dataNode.js # Data node handlers
│ │ └── managerNode.js # Manager node handlers
│ └── socket-server.js # Socket.io server setup
├── rtsp/ # RTSP functionality
│ ├── stream-manager.js # Stream lifecycle
│ ├── stream-processor.js # Stream processing
│ └── particle-transport.js # Data particle movement
└── server.js # Main application entry

HarleyVader: #file:README.md remove all code pieces that are not for the instalation or configuration

GitHub Copilot: # Comprehensive Setup Guide: RTSP Stream Factory with Distributed Node Architecture

I've reviewed the README.md file and removed all code pieces that aren't related to installation or configuration. Here's the cleaned-up version focusing only on setup instructions:

## Prerequisites

- **Operating System**: Windows 10/11 or Linux (Ubuntu 20.04+ recommended)
- **Node.js**: v16.x or higher
- **MongoDB**: v5.0 or higher
- **Git**: Latest version
- **OBS Studio**: v28.0 or higher (for RTSP stream generation)
- **FFmpeg**: Latest version
- **Minimum Hardware**:
  - 8GB RAM
  - Quad-core CPU
  - 50GB free disk space

## 1. Base System Setup

### 1.1. Install Node.js and npm

**Using cURL**:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash
```

**Using Wget**:

```bash
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash
```

This script clones the nvm repository to `~/.nvm` and adds the following lines to your shell profile:

```bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
```

After installation, restart your terminal or run:

```bash
source ~/.nvm/nvm.sh
```

**Verify Installation**:

```bash
nvm --version
```

**Install Node.js using nvm**:

```bash
nvm install --lts
node --version
npm --version
```

### 1.2. Install MongoDB

**Windows**:
Download and install from https://www.mongodb.com/try/download/community

**Linux** - debian:
```bash
# dependencies
sudo apt-get install gnupg curl
# get mongodb keyring
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg \
   --dearmor

# echo keyring
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/8.0 main" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
# update
sudo apt-get update
# install mongodb
sudo apt-get install -y mongodb-org
# enable & start mongod
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 1.3. Install FFmpeg

**Windows**:
Download from https://ffmpeg.org/download.html and add bin directory to PATH

**Linux**:
```bash
sudo apt update
sudo apt install ffmpeg
ffmpeg -version
```

### 1.4. Install OBS Studio

**Windows/Linux**:
Download and install from https://obsproject.com/

Enable WebSocket server in OBS:
1. Go to Tools > WebSocket Server Settings
2. Check "Enable WebSocket server"
3. Set port to 4444
4. Set a password if desired (note it for later configuration)
5. Click OK

## 2. Project Setup

### 2.1. Clone the Repository

```bash
mkdir -p f:/projects
cd f:/projects
git clone https://github.com/yourusername/bambisleep-mcp.git
cd bambisleep-mcp
```

### 2.2. Install Dependencies

```bash
npm install
```

### 2.3. Create Environment Configuration

Create a .env file in the project root:

```
# .env file
PORT=5000
MONGO_URI=mongodb://localhost:27017/bambisleep_mcp
JWT_SECRET=your_jwt_secret_here
OBS_ADDRESS=localhost:4444
OBS_PASSWORD=your_obs_password
CONNECT_OBS=true
NODE_ENV=development
```

### 2.4. Initialize the Database

```bash
# Create database setup script
node scripts/setup-db.js
```

## 3. Directory Structure Setup

```bash
mkdir -p public/js
mkdir -p views
mkdir -p models
mkdir -p services
mkdir -p controllers
mkdir -p routes
mkdir -p rtsp
mkdir -p socket
mkdir -p socket/handlers
```

## 4. Starting Services

### 4.1. Start the MongoDB Service

**Windows**:
```
# If installed as a service, it should be running
# Otherwise, run from command line:
"C:\Program Files\MongoDB\Server\5.0\bin\mongod.exe" --dbpath="C:\data\db"
```

**Linux**:
```bash
sudo systemctl start mongod
sudo systemctl status mongod
```

### 4.2. Start OBS Studio

1. Launch OBS Studio
2. Ensure the WebSocket server is enabled
3. Create a scene called "Main"

### 4.3. Set Up a Test RTSP Stream with FFmpeg

```bash
# Create a looping test source using FFmpeg
ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 -pix_fmt yuv420p -c:v libx264 -b:v 1M -f rtsp rtsp://localhost:8554/test
```

### 4.4. Start the Application

```bash
npm start
```

## 5. API Usage Examples

### 5.1. Create a Stream via API

```bash
curl -X POST http://localhost:5000/api/streams \
  -H 'Content-Type: application/json' \
  -d '{
    "deviceId": "test-device-1",
    "rtspUrl": "rtsp://localhost:8554/test",
    "options": {
      "resolution": "720p",
      "fps": 30,
      "createObsSource": true
    }
  }'
```

### 5.2. Start the Stream

```bash
curl -X POST http://localhost:5000/api/streams/{streamId}/start
```

Replace `{streamId}` with the actual ID from the previous step.

### 5.3. View the Stream in the Client

1. Open the client page: http://localhost:5000/stream-client
2. Click "Connect as Swap Node"
3. Click "Register Resources"
4. Click "Refresh Streams"
5. Select your stream from the list
6. Click "Request Stream"