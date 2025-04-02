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

# Comprehensive Setup Guide: RTSP Stream Factory with Distributed Node Architecture

This guide will walk you through setting up and deploying the entire system from scratch, including simulating a live deployment with multiple nodes.

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

**Windows**:

````markdown
# Install nvm (Node Version Manager)

To install or update nvm, run the following command:

**Using cURL**:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash
```
````

**Using Wget**:

```bash
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash
```

This script clones the nvm repository to `~/.nvm` and attempts to add the following lines to your shell profile (`~/.bashrc`, `~/.bash_profile`, `~/.zshrc`, or `~/.profile`):

```bash
export NVM_DIR="$([ -z "${XDG_CONFIG_HOME-}" ] && printf %s "${HOME}/.nvm" || printf %s "${XDG_CONFIG_HOME}/nvm")"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" # This loads nvm
```

If the script updates the wrong profile file, set the `$PROFILE` environment variable to the correct file path and rerun the installation script.

After installation, restart your terminal or run the following command to load nvm:

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

```
# Download and install from https://www.mongodb.com/try/download/community
# Add MongoDB bin directory to PATH
```

**Linux** -
### debian:
```bash
# dependencies
sudo apt-get install gnupg curl
# get mongodb keyring
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg \
   --dearmor
```
# get keyring, update & install
```bash
# echo keyring
echo "deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/8.0 main" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list
# uptade
sudo apt-get update
# install mongodb
sudo apt-get install -y mongodb-org
# enable & start mongod
sudo systemctl start mongod
sudo systemctl enable mongod

```
### 1.3. Install FFmpeg

**Windows**:

```
# Download from https://ffmpeg.org/download.html
# Extract and add bin directory to PATH
```

**Linux**:

```bash
sudo apt update
sudo apt install ffmpeg
ffmpeg -version
```

### 1.4. Install OBS Studio

**Windows/Linux**:

```
# Download and install from https://obsproject.com/
```

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

Create initial database structure and seed data:

```bash
# Create database setup script
node scripts/setup-db.js
```

## 3. RTSP Stream Factory Setup

### 3.1. Create Required Directories

```bash
mkdir -p public/js
mkdir -p views
mkdir -p models
mkdir -p services
mkdir -p controllers
mkdir -p routes
mkdir -p rtsp
mkdir -p socket
```

### 3.2. Create/Update Key Files

Copy the previously created files to their correct locations:

1. Socket.js to socket.js
2. Client-node.js to client-node.js
3. Stream-viewer.js to stream-viewer.js
4. Streaming-client.ejs to streaming-client.ejs

### 3.3. Create the RTSP Stream Manager

Create the file stream-manager.js:

```javascript
import { EventEmitter } from "events";
import { spawn } from "child_process";
import { createWriteStream } from "fs";
import path from "path";

export class StreamManager extends EventEmitter {
  constructor() {
    super();
    this.streams = new Map();
    this.tempDirectory = path.join(process.cwd(), "temp");
    this.ensureTempDirectory();
  }

  ensureTempDirectory() {
    const fs = require("fs");
    if (!fs.existsSync(this.tempDirectory)) {
      fs.mkdirSync(this.tempDirectory, { recursive: true });
    }
  }

  async createStream(streamId, options) {
    if (this.streams.has(streamId)) {
      throw new Error(`Stream ${streamId} already exists`);
    }

    const streamInfo = {
      id: streamId,
      rtspUrl: options.rtspUrl,
      deviceId: options.deviceId,
      resolution: options.resolution || "720p",
      fps: options.fps || 30,
      status: "created",
      process: null,
      createdAt: new Date(),
    };

    this.streams.set(streamId, streamInfo);
    console.log(`Stream ${streamId} created with RTSP URL: ${options.rtspUrl}`);

    return streamId;
  }

  async startStream(streamId) {
    const streamInfo = this.streams.get(streamId);
    if (!streamInfo) {
      throw new Error(`Stream ${streamId} not found`);
    }

    if (streamInfo.status === "active") {
      return streamId; // Already running
    }

    try {
      // Update status to starting
      streamInfo.status = "starting";
      this.streams.set(streamId, streamInfo);

      // Simulate creating particles from the stream
      // In a real implementation, you would actually process the RTSP stream
      this.simulateStreamProcessing(streamId);

      // Update status to active
      streamInfo.status = "active";
      streamInfo.startedAt = new Date();
      this.streams.set(streamId, streamInfo);

      console.log(`Stream ${streamId} started`);
      return streamId;
    } catch (error) {
      streamInfo.status = "error";
      streamInfo.error = error.message;
      this.streams.set(streamId, streamInfo);
      throw error;
    }
  }

  async stopStream(streamId) {
    const streamInfo = this.streams.get(streamId);
    if (!streamInfo) {
      throw new Error(`Stream ${streamId} not found`);
    }

    if (streamInfo.process) {
      streamInfo.process.kill();
      streamInfo.process = null;
    }

    streamInfo.status = "stopped";
    streamInfo.stoppedAt = new Date();
    this.streams.set(streamId, streamInfo);

    console.log(`Stream ${streamId} stopped`);
    return streamId;
  }

  async getStreamInfo(streamId) {
    const streamInfo = this.streams.get(streamId);
    if (!streamInfo) {
      throw new Error(`Stream ${streamId} not found`);
    }

    // Remove process object as it's not serializable
    const { process, ...info } = streamInfo;
    return info;
  }

  async listStreams() {
    return Array.from(this.streams.entries()).map(([id, info]) => {
      const { process, ...streamInfo } = info;
      return streamInfo;
    });
  }

  // Simulate processing an RTSP stream and creating particles
  simulateStreamProcessing(streamId) {
    const streamInfo = this.streams.get(streamId);

    // Simulate particle creation every second
    const interval = setInterval(() => {
      if (streamInfo.status !== "active") {
        clearInterval(interval);
        return;
      }

      // Emit particles created event (5-10 particles per second)
      const particleCount = Math.floor(Math.random() * 6) + 5;
      this.emit("particles:created", {
        streamId,
        count: particleCount,
        timestamp: new Date(),
      });

      // Simulate stream processing
      this.emit("stream:processed", {
        streamId,
        timestamp: new Date(),
        frameCount: streamInfo.fps,
      });
    }, 1000);

    // Store interval for cleanup
    streamInfo.interval = interval;
    this.streams.set(streamId, streamInfo);
  }

  // In a real implementation, you would have methods to actually work with RTSP
  // For example:
  async startRtspCapture(streamId, rtspUrl, outputPath) {
    const args = [
      "-i",
      rtspUrl,
      "-c:v",
      "copy",
      "-c:a",
      "copy",
      "-f",
      "segment",
      "-segment_time",
      "5",
      "-segment_format",
      "mp4",
      "-reset_timestamps",
      "1",
      `${outputPath}/segment_%03d.mp4`,
    ];

    const ffmpeg = spawn("ffmpeg", args);

    ffmpeg.stdout.on("data", (data) => {
      console.log(`ffmpeg stdout: ${data}`);
    });

    ffmpeg.stderr.on("data", (data) => {
      console.log(`ffmpeg stderr: ${data}`);
    });

    ffmpeg.on("close", (code) => {
      console.log(`ffmpeg process exited with code ${code}`);
    });

    return ffmpeg;
  }
}

export default StreamManager;
```

### 3.4. Create an OBS Integration Service

Create the file obsService.js:

```javascript
import OBSWebSocket from "obs-websocket-js";

class OBSService {
  constructor() {
    this.obs = new OBSWebSocket();
    this.connected = false;
  }

  async connect(address = "localhost:4444", password = "") {
    try {
      await this.obs.connect(`ws://${address}`, password);
      console.log("Connected to OBS");
      this.connected = true;

      // Set up event handlers
      this.obs.on("error", (err) => {
        console.error("OBS WebSocket Error:", err);
      });

      return true;
    } catch (error) {
      console.error("Error connecting to OBS:", error);
      this.connected = false;
      return false;
    }
  }

  async disconnect() {
    if (this.connected) {
      await this.obs.disconnect();
      this.connected = false;
      console.log("Disconnected from OBS");
    }
  }

  async createRtspSource(sceneName, sourceName, rtspUrl) {
    if (!this.connected) {
      throw new Error("Not connected to OBS");
    }

    try {
      // Check if scene exists
      const scenes = await this.obs.call("GetSceneList");
      const sceneExists = scenes.scenes.some(
        (scene) => scene.sceneName === sceneName
      );

      if (!sceneExists) {
        // Create scene if it doesn't exist
        await this.obs.call("CreateScene", {
          sceneName,
        });
      }

      // Check if source already exists
      const sources = await this.obs.call("GetSourcesList");
      const sourceExists = sources.sources.some(
        (source) => source.sourceName === sourceName
      );

      if (sourceExists) {
        // Remove existing source
        await this.obs.call("RemoveSource", {
          sourceName,
        });
      }

      // Create media source for RTSP
      await this.obs.call("CreateSource", {
        sourceName,
        sourceKind: "ffmpeg_source",
        sceneName,
        sourceSettings: {
          input: rtspUrl,
          hw_decode: true,
          buffering_mb: 10,
          reconnect_delay_sec: 1,
          restart_on_activate: true,
        },
      });

      console.log(`Created RTSP source ${sourceName} in scene ${sceneName}`);
      return true;
    } catch (error) {
      console.error("Error creating RTSP source:", error);
      throw error;
    }
  }

  async startStreaming() {
    if (!this.connected) {
      throw new Error("Not connected to OBS");
    }

    try {
      const streamStatus = await this.obs.call("GetStreamStatus");

      if (!streamStatus.outputActive) {
        await this.obs.call("StartStream");
        console.log("OBS streaming started");
      }

      return true;
    } catch (error) {
      console.error("Error starting OBS stream:", error);
      throw error;
    }
  }

  async stopStreaming() {
    if (!this.connected) {
      throw new Error("Not connected to OBS");
    }

    try {
      const streamStatus = await this.obs.call("GetStreamStatus");

      if (streamStatus.outputActive) {
        await this.obs.call("StopStream");
        console.log("OBS streaming stopped");
      }

      return true;
    } catch (error) {
      console.error("Error stopping OBS stream:", error);
      throw error;
    }
  }
}

// Create singleton instance
const obsService = new OBSService();
export default obsService;
```

### 3.5. Update the Server.js File

Make sure the server.js file is updated with the correct imports and middleware:

```javascript
import express from "express";
import http from "http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Import routes
import streamRoutes from "./routes/streamRoutes.js";
import nodeRoutes from "./routes/nodeRoutes.js";

// Import socket initialization
import initializeSocket from "./socket.js";

// Import OBS service
import obsService from "./services/obsService.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Initialize socket with io
initializeSocket(io);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Set EJS as templating engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Database Connection
const mongoURI =
  process.env.MONGO_URI || "mongodb://localhost:27017/bambisleep_mcp";
mongoose
  .connect(mongoURI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Routes
app.use("/api/streams", streamRoutes);
app.use("/api/nodes", nodeRoutes);

// Client stream page
app.get("/stream-client", (req, res) => {
  res.render("streaming-client");
});

// Home page
app.get("/", (req, res) => {
  res.render("index", { title: "RTSP Stream Factory" });
});

// Connect to OBS if configured
const OBS_ADDRESS = process.env.OBS_ADDRESS || "localhost:4444";
const OBS_PASSWORD = process.env.OBS_PASSWORD || "";

if (process.env.CONNECT_OBS === "true") {
  obsService.connect(OBS_ADDRESS, OBS_PASSWORD).then((connected) => {
    if (connected) {
      console.log("OBS connected successfully");
    } else {
      console.warn("Could not connect to OBS, some features will be disabled");
    }
  });
}

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down gracefully...");

  // Disconnect from OBS
  if (obsService.connected) {
    await obsService.disconnect();
  }

  // Close MongoDB connection
  await mongoose.connection.close();

  // Close the HTTP server
  server.close(() => {
    console.log("Server shut down successfully");
    process.exit(0);
  });
});
```

## 4. Simulating a Live Deployment

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
2. Ensure the WebSocket server is enabled (Tools > WebSocket Server Settings)
3. Create a scene called "Main"

### 4.3. Set Up a Test RTSP Stream with FFmpeg

Create a test video stream that simulates a device camera:

```bash
# Create a looping test source using FFmpeg
ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 -pix_fmt yuv420p -c:v libx264 -b:v 1M -f rtsp rtsp://localhost:8554/test
```

For this to work, you need an RTSP server. You can use a simple one like `rtsp-simple-server`:

1. Download from https://github.com/aler9/rtsp-simple-server/releases
2. Extract and run it
3. It will listen on port 8554 by default

### 4.4. Start the Application

```bash
# Start the application
npm start
```

### 4.5. Simulate Different Node Types

Open multiple browser windows to simulate different node types:

1. **Client Node**: http://localhost:5000/stream-client
2. **Head Node**: Use Postman or another tool to register a head node via API
3. **Manager Node**: Use Postman or another tool to register a manager node

### 4.6. Create and Test a Stream

#### 4.6.1. Create a Stream via API

Using Postman or curl:

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

This will return a streamId that you can use in the next steps.

#### 4.6.2. Start the Stream

```bash
curl -X POST http://localhost:5000/api/streams/{streamId}/start
```

Replace `{streamId}` with the actual ID from the previous step.

#### 4.6.3. View the Stream in the Client

1. Open the client page: http://localhost:5000/stream-client
2. Click "Connect as Swap Node"
3. Click "Register Resources"
4. Click "Refresh Streams"
5. Select your stream from the list
6. Click "Request Stream"

## 5. Testing Node Communication

### 5.1. Monitor Socket Communication

To observe the communication between nodes, you can add a simple logger in the browser console for each node type:

1. Open multiple browser windows
2. In each Console tab, paste the following (modified for each node type):

For Swap Node:

```javascript
const swapNode = new ClientNode({ nodeType: "swap" });
console.log("Swap node initialized");
```

For Head Node:

```javascript
const headNode = new ClientNode({ nodeType: "head" });
console.log("Head node initialized");
```

### 5.2. Test Node Resource Distribution

To test how resources are distributed among nodes, you can simulate processing load:

1. In the Swap Node console, trigger particle processing:

```javascript
// Simulate particles
swapNode.socket.emit("particles:process", {
  streamId: "test-stream",
  particleIds: Array(20)
    .fill()
    .map((_, i) => `particle_${i}`),
  headNodeId: "head-node-id", // Use actual head node ID
});
```

2. Monitor the console output to see how particles are routed through the nodes

### 5.3. Simulate Node Failure

To test the system's resilience, simulate node failures:

1. Disconnect a node:

```javascript
// In the node's console
swapNode.socket.disconnect();
```

2. Observe how the system handles the failure:
   - For swap nodes: Should create emergency registry
   - For head nodes: Other head nodes should take over
   - For data nodes: A slave should be promoted to master

## 6. Monitoring and Administration

### 6.1. Monitor Active Nodes

Create a simple admin page at `/admin/nodes`:

```javascript
import express from "express";
import Resource from "../models/resourceModel.js";

const router = express.Router();

// Get all nodes
router.get("/nodes", async (req, res) => {
  try {
    const nodes = await Resource.find();

    res.render("admin/nodes", { nodes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

Create the corresponding view:

```html
ejs -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Node Administration</title>
    <style>
      table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        padding: 8px;
        border: 1px solid #ddd;
        text-align: left;
      }
      th {
        background-color: #f2f2f2;
      }
      tr:nth-child(even) {
        background-color: #f9f9f9;
      }
      .online {
        color: green;
      }
      .offline {
        color: red;
      }
    </style>
  </head>
  <body>
    <h1>Node Administration</h1>
    <h2>Active Nodes</h2>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Type</th>
          <th>Status</th>
          <th>CPU</th>
          <th>Memory</th>
          <th>Storage</th>
          <th>Network</th>
          <th>Last Heartbeat</th>
        </tr>
      </thead>
      <tbody>
        <% nodes.forEach(node => { %>
        <tr>
          <td><%= node.nodeId %></td>
          <td><%= node.nodeType %></td>
          <td class="<%= node.status %>"><%= node.status %></td>
          <td><%= node.resources.cpu %>%</td>
          <td><%= node.resources.memory %>MB</td>
          <td><%= node.resources.storage %>MB</td>
          <td><%= node.resources.network %>Mbps</td>
          <td><%= new Date(node.lastHeartbeat).toLocaleString() %></td>
        </tr>
        <% }); %>
      </tbody>
    </table>

    <script>
      // Auto-refresh every 30 seconds
      setTimeout(() => {
        location.reload();
      }, 30000);
    </script>
  </body>
</html>
```

### 6.2. Monitor Active Streams

Create a stream monitoring page:

```javascript
// Add to routes/adminRoutes.js
// Get all streams
router.get("/streams", async (req, res) => {
  try {
    const streamOrchestrator = req.app.get("streamOrchestrator");
    const streams = await streamOrchestrator.getActiveStreams();

    res.render("admin/streams", { streams });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

Create the corresponding view.

## 7. Troubleshooting Common Issues

### 7.1. Node Connection Issues

If nodes aren't connecting properly:

1. Check MongoDB connection:

```bash
mongo
> use bambisleep_mcp
> db.resources.find()
```

2. Check WebSocket connections in browser dev tools > Network tab

3. Check the server logs for connection errors

### 7.2. Stream Not Starting

If streams aren't starting:

1. Verify RTSP source is accessible:

```bash
ffplay rtsp://localhost:8554/test
```

2. Check if OBS is connected:

```bash
curl http://localhost:5000/api/obs/status
```

3. Check stream status via API:

```bash
curl http://localhost:5000/api/streams/{streamId}/status
```

### 7.3. Data Node Clustering Issues

If data nodes aren't forming clusters properly:

1. Check node registrations:

```bash
curl http://localhost:5000/api/nodes
```

2. Restart any offline data nodes
3. Verify MongoDB cluster status

## 8. Scaling the Simulation

To simulate larger deployments:

### 8.1. Create Multiple Node Instances

Use a script to create multiple node instances:

```javascript
const { spawn } = require("child_process");
const path = require("path");

// Configuration
const nodeTypes = ["swap", "head", "data"];
const countPerType = {
  swap: 5,
  head: 2,
  data: 4,
};

// Spawn nodes
for (const type of nodeTypes) {
  for (let i = 0; i < countPerType[type]; i++) {
    const nodeProcess = spawn("node", ["scripts/run-node.js", type, i], {
      stdio: "inherit",
      env: { ...process.env, NODE_TYPE: type, NODE_INDEX: i },
    });

    console.log(`Started ${type} node ${i}`);

    nodeProcess.on("close", (code) => {
      console.log(`${type} node ${i} exited with code ${code}`);
    });
  }
}
```

Create the run-node.js script:

```javascript
const io = require("socket.io-client");
const os = require("os");

const nodeType = process.argv[2] || process.env.NODE_TYPE || "swap";
const nodeIndex = process.argv[3] || process.env.NODE_INDEX || 0;

// Connect to appropriate namespace
const socket = io(`http://localhost:5000/${nodeType}`);

// Simulated resources
const resources = {
  cpu: 20 + ((nodeIndex * 5) % 40), // 20-60%
  memory: 256 + nodeIndex * 128, // 256-1024 MB
  storage: 1024 + nodeIndex * 512, // 1-5 GB
  network: 5 + (nodeIndex % 5), // 5-10 Mbps
};

socket.on("connect", () => {
  console.log(`${nodeType} node ${nodeIndex} connected with ID: ${socket.id}`);

  // Register node
  socket.emit("register", {
    resources,
    connectionType: nodeIndex % 2 === 0 ? "wlan" : "2.4g",
    userAgent: `NodeSimulator/${nodeType}/${nodeIndex}`,
    deviceInfo: {
      platform: os.platform(),
      hostname: os.hostname(),
      cpus: os.cpus().length,
    },
  });

  // For data nodes, join a cluster
  if (nodeType === "data") {
    socket.emit("join:cluster", {});
  }

  // Set up heartbeat
  setInterval(() => {
    // Simulate resource changes
    resources.cpu = 20 + Math.floor(Math.random() * 40);
    socket.emit("heartbeat");
    socket.emit("resources:update", resources);
  }, 15000);

  // Handle common events based on node type
  setupEventHandlers(socket, nodeType, nodeIndex);
});

function setupEventHandlers(socket, type, index) {
  // Common error handler
  socket.on("error", (error) => {
    console.error(`${type} node ${index} error:`, error);
  });

  // Type-specific handlers
  switch (type) {
    case "swap":
      handleSwapNodeEvents(socket, index);
      break;
    case "head":
      handleHeadNodeEvents(socket, index);
      break;
    case "data":
      handleDataNodeEvents(socket, index);
      break;
  }
}

function handleSwapNodeEvents(socket, index) {
  // Handle particles processing
  socket.on("particles:process", (data) => {
    console.log(
      `Swap node ${index} processing particles for stream ${data.streamId}`
    );

    // Simulate processing delay
    setTimeout(() => {
      // After "processing", send back to head node
      socket.emit("particles:processed", {
        streamId: data.streamId,
        particleIds: data.particleIds,
        headNodeId: data.headNodeId,
      });
    }, 1000); // 1 second delay
  });
}

function handleHeadNodeEvents(socket, index) {
  // Handle particle processing from swap nodes
  socket.on("particles:received:from:swap", (data) => {
    console.log(`Head node ${index} received particles from swap node`);

    // Simulate processing and forward to manager
    setTimeout(() => {
      socket.emit("particles:received", {
        streamId: data.streamId,
        particleIds: data.particleIds,
        headNodeId: socket.id,
        particleSize: data.particleIds.length * 1024 * 1024, // Simulate 1MB per particle
      });
    }, 500);
  });
}

function handleDataNodeEvents(socket, index) {
  // Handle storage requests
  socket.on("particles:store", (data) => {
    console.log(
      `Data node ${index} storing particles for stream ${data.streamId}`
    );

    // Simulate storage delay
    setTimeout(() => {
      socket.emit("particles:stored", {
        streamId: data.streamId,
        particleIds: data.particleIds,
        managerNodeId: data.managerNodeId,
        headNodeId: data.headNodeId,
      });
    }, 1500);
  });

  // Handle cluster membership events
  socket.on("cluster:joined", (data) => {
    console.log(
      `Data node ${index} joined cluster ${data.clusterId} as ${
        data.isMaster ? "master" : "slave"
      }`
    );
  });

  socket.on("promoted:to:master", (data) => {
    console.log(
      `Data node ${index} promoted to master in cluster ${data.clusterId}`
    );
  });
}

// Handle disconnection
socket.on("disconnect", () => {
  console.log(`${nodeType} node ${nodeIndex} disconnected`);
});

// Keep process running
process.on("SIGINT", () => {
  console.log(`Shutting down ${nodeType} node ${nodeIndex}`);
  socket.disconnect();
  process.exit(0);
});
```

### 8.2. Run the Simulation

```bash
# Start the main application
npm start

# In a separate terminal, spawn simulated nodes
node scripts/spawn-nodes.js
```

## 9. Advanced Features

### 9.1. Implement a Resource Dashboard

Create a real-time dashboard to visualize node resources and stream processing:

```javascript
import express from "express";
import Resource from "../models/resourceModel.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.render("dashboard/index");
});

router.get("/api/resources", async (req, res) => {
  try {
    const resources = await Resource.find({ status: "online" });
    res.json(resources);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

Create the dashboard view with real-time updates using Chart.js.

### 9.2. Implement Network Throttling for Testing

Create a network simulation utility:

```javascript
/**
 * Simulates network conditions for testing
 */
class NetworkSimulator {
  constructor() {
    this.enabled = false;
    this.latency = 0;
    this.packetLoss = 0;
    this.bandwidthLimit = 0;
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  setConditions(conditions) {
    this.latency = conditions.latency || 0;
    this.packetLoss = conditions.packetLoss || 0;
    this.bandwidthLimit = conditions.bandwidthLimit || 0;
  }

  apply(socket) {
    if (!this.enabled) return;

    const originalEmit = socket.emit;

    // Override emit to simulate network conditions
    socket.emit = (...args) => {
      // Simulate latency
      setTimeout(() => {
        // Simulate packet loss
        if (Math.random() > this.packetLoss / 100) {
          originalEmit.apply(socket, args);
        }
      }, this.latency);
    };
  }
}

export default new NetworkSimulator();
```

## 10. Performance Benchmarking

### 10.1. Create a Load Testing Script

```javascript
const { performance } = require("perf_hooks");
const axios = require("axios");
const io = require("socket.io-client");

// Configuration
const baseUrl = "http://localhost:5000";
const iterations = 100;
const concurrentClients = 20;
const clients = [];

async function createStream() {
  try {
    const response = await axios.post(`${baseUrl}/api/streams`, {
      deviceId: `load-test-device-${Date.now()}`,
      rtspUrl: "rtsp://localhost:8554/test",
      options: {
        resolution: "720p",
        fps: 30,
      },
    });

    return response.data.streamId;
  } catch (error) {
    console.error("Error creating stream:", error.message);
    return null;
  }
}

async function connectClients(count, streamId) {
  console.log(`Connecting ${count} clients to stream ${streamId}...`);

  for (let i = 0; i < count; i++) {
    const client = io(`${baseUrl}/client`);

    client.on("connect", () => {
      console.log(`Client ${i} connected`);

      // Request stream
      client.emit("stream:request", {
        streamId,
        requestId: `req_${Date.now()}_${i}`,
      });
    });

    client.on("stream:data", (data) => {
      // Just count received chunks
      client.chunksReceived = (client.chunksReceived || 0) + 1;
    });

    clients.push(client);
  }
}

async function runTest() {
  console.log("Starting load test...");
  const start = performance.now();

  // Create a test stream
  const streamId = await createStream();
  if (!streamId) {
    console.error("Failed to create test stream");
    return;
  }

  // Start the stream
  try {
    await axios.post(`${baseUrl}/api/streams/${streamId}/start`);
    console.log(`Started stream ${streamId}`);
  } catch (error) {
    console.error("Error starting stream:", error.message);
    return;
  }

  // Connect clients
  await connectClients(concurrentClients, streamId);

  // Run for 60 seconds
  console.log("Running test for 60 seconds...");
  await new Promise((resolve) => setTimeout(resolve, 60000));

  // Calculate results
  let totalChunks = 0;
  clients.forEach((client) => {
    totalChunks += client.chunksReceived || 0;
  });

  const end = performance.now();
  const duration = (end - start) / 1000;

  console.log("Load test complete");
  console.log("-------------------");
  console.log(`Duration: ${duration.toFixed(2)} seconds`);
  console.log(`Concurrent clients: ${concurrentClients}`);
  console.log(`Total chunks received: ${totalChunks}`);
  console.log(`Chunks per second: ${(totalChunks / duration).toFixed(2)}`);
  console.log(
    `Chunks per client: ${(totalChunks / concurrentClients).toFixed(2)}`
  );

  // Cleanup
  clients.forEach((client) => client.disconnect());

  // Stop the stream
  try {
    await axios.post(`${baseUrl}/api/streams/${streamId}/stop`);
    console.log(`Stopped stream ${streamId}`);
  } catch (error) {
    console.error("Error stopping stream:", error.message);
  }
}

runTest().catch(console.error);
```

## 11. Conclusion and Next Steps

You now have a complete, working simulation of the distributed node architecture for RTSP streaming. This setup demonstrates:

1. **Distributed Node Architecture**:

   - Head Nodes for traffic handling
   - Swap Nodes for transport
   - Manager Nodes for control
   - Data Nodes for storage

2. **Resource Orchestration**:

   - Dynamic node allocation
   - Resource monitoring
   - Fault tolerance

3. **Media Streaming Capabilities**:
   - RTSP source handling
   - Stream particle processing
   - OBS integration

### Next Steps

1. **Containerization**: Package the application using Docker for easier deployment
2. **Cloud Deployment**: Deploy to a cloud provider for global testing
3. **Mobile Support**: Add mobile device clients for real-world testing
4. **Security**: Implement JWT authentication and TLS for secure communications
5. **Analytics**: Add usage metrics and performance monitoring

This simulation provides a solid foundation for expanding the system to a production environment.

Similar code found with 4 license types
`````
{
  "project": "BambiSleep MCP",
  "description": "RTSP Stream Factory with Distributed Node Architecture",
  "prerequisites": {
    "os": ["Windows 10/11", "Linux (Ubuntu 20.04+ recommended)"],
    "software": [
      {"name": "Node.js", "version": "v16.x or higher"},
      {"name": "MongoDB", "version": "v5.0 or higher"},
      {"name": "Git", "version": "Latest version"},
      {"name": "OBS Studio", "version": "v28.0 or higher"},
      {"name": "FFmpeg", "version": "Latest version"}
    ],
    "hardware": {
      "ram": "8GB minimum",
      "cpu": "Quad-core minimum",
      "storage": "50GB free disk space minimum"
    }
  },
  "installation": {
    "baseSetup": [
      {
        "step": "Install Node.js and npm",
        "windows": "Install nvm and use it to install Node.js LTS",
        "linux": [
          "curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.2/install.sh | bash",
          "source ~/.nvm/nvm.sh",
          "nvm install --lts"
        ]
      },
      {
        "step": "Install MongoDB",
        "windows": "Download and install from https://www.mongodb.com/try/download/community",
        "linux": [
          "sudo apt-get install gnupg curl",
          "curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor",
          "echo \"deb [ signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] http://repo.mongodb.org/apt/debian bookworm/mongodb-org/8.0 main\" | sudo tee /etc/apt/sources.list.d/mongodb-org-8.0.list",
          "sudo apt-get update",
          "sudo apt-get install -y mongodb-org",
          "sudo systemctl start mongod",
          "sudo systemctl enable mongod"
        ]
      },
      {
        "step": "Install FFmpeg",
        "windows": "Download from https://ffmpeg.org/download.html and add bin directory to PATH",
        "linux": [
          "sudo apt update",
          "sudo apt install ffmpeg",
          "ffmpeg -version"
        ]
      },
      {
        "step": "Install OBS Studio",
        "windows": "Download and install from https://obsproject.com/",
        "linux": "Download and install from https://obsproject.com/",
        "configuration": [
          "Go to Tools > WebSocket Server Settings",
          "Check \"Enable WebSocket server\"",
          "Set port to 4444",
          "Set a password if desired (note it for later configuration)",
          "Click OK"
        ]
      }
    ],
    "projectSetup": [
      {
        "step": "Clone Repository",
        "commands": [
          "mkdir -p f:/projects",
          "cd f:/projects",
          "git clone https://github.com/yourusername/bambisleep-mcp.git",
          "cd bambisleep-mcp"
        ]
      },
      {
        "step": "Install Dependencies",
        "commands": ["npm install"]
      },
      {
        "step": "Create Environment Configuration",
        "file": ".env",
        "content": {
          "PORT": "5000",
          "MONGO_URI": "mongodb://localhost:27017/bambisleep_mcp",
          "JWT_SECRET": "your_jwt_secret_here",
          "OBS_ADDRESS": "localhost:4444",
          "OBS_PASSWORD": "your_obs_password",
          "CONNECT_OBS": "true",
          "NODE_ENV": "development"
        }
      },
      {
        "step": "Initialize Database",
        "commands": ["node scripts/setup-db.js"]
      }
    ],
    "rtspStreamFactorySetup": [
      {
        "step": "Create Required Directories",
        "commands": [
          "mkdir -p public/js",
          "mkdir -p views",
          "mkdir -p models",
          "mkdir -p services",
          "mkdir -p controllers",
          "mkdir -p routes",
          "mkdir -p rtsp",
          "mkdir -p socket"
        ]
      },
      {
        "step": "Create/Update Key Files",
        "files": [
          {"source": "Socket.js", "destination": "socket.js"},
          {"source": "Client-node.js", "destination": "client-node.js"},
          {"source": "Stream-viewer.js", "destination": "public/js/stream-viewer.js"},
          {"source": "Streaming-client.ejs", "destination": "views/streaming-client.ejs"}
        ]
      }
    ]
  },
  "deployment": {
    "startServices": [
      {
        "step": "Start MongoDB Service",
        "windows": "\"C:\\Program Files\\MongoDB\\Server\\5.0\\bin\\mongod.exe\" --dbpath=\"C:\\data\\db\"",
        "linux": [
          "sudo systemctl start mongod",
          "sudo systemctl status mongod"
        ]
      },
      {
        "step": "Start OBS Studio",
        "instructions": [
          "Launch OBS Studio",
          "Ensure the WebSocket server is enabled",
          "Create a scene called \"Main\""
        ]
      },
      {
        "step": "Set Up Test RTSP Stream",
        "command": "ffmpeg -re -f lavfi -i testsrc=size=1280x720:rate=30 -pix_fmt yuv420p -c:v libx264 -b:v 1M -f rtsp rtsp://localhost:8554/test",
        "note": "Requires rtsp-simple-server running on port 8554"
      },
      {
        "step": "Start Application",
        "command": "npm start"
      }
    ],
    "testing": {
      "createStream": {
        "method": "POST",
        "url": "http://localhost:5000/api/streams",
        "headers": {"Content-Type": "application/json"},
        "body": {
          "deviceId": "test-device-1",
          "rtspUrl": "rtsp://localhost:8554/test",
          "options": {
            "resolution": "720p",
            "fps": 30,
            "createObsSource": true
          }
        }
      },
      "startStream": {
        "method": "POST",
        "url": "http://localhost:5000/api/streams/{streamId}/start",
        "note": "Replace {streamId} with the actual ID returned from stream creation"
      },
      "viewStream": [
        "Open http://localhost:5000/stream-client",
        "Click \"Connect as Swap Node\"",
        "Click \"Register Resources\"",
        "Click \"Refresh Streams\"", 
        "Select your stream from the list",
        "Click \"Request Stream\""
      ]
    }
  }
}
```
