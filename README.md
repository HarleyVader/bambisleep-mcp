/project-root
  /backend
    /models
      contextModel.js
      userModel.js
    /routes
      apiRoutes.js
      userRoutes.js
      adminRoutes.js
    /services
      contextService.js
      userService.js
      obsService.js
    server.js
    socket.js
    .env
  /views
    index.ejs
    profile.ejs
    admin.ejs
  /public
    /css
      styles.css
    /js
      main.js

bambisleep-mcp/
├── models/                        # Data models 
│   ├── resourceModel.js           # Tracks node resources
│   ├── taskModel.js               # Defines tasks for nodes
│   ├── streamModel.js             # RTSP stream metadata
│   ├── deviceModel.js             # Connected devices
│   └── userModel.js               # User accounts
├── services/
│   ├── nodeService.js             # Node management logic
│   ├── resourceService.js         # Resource allocation
│   ├── streamService.js           # Stream processing
│   └── obsService.js              # OBS integration
├── controllers/
│   ├── streamController.js        # Stream handling
│   ├── nodeController.js          # Node management
│   └── adminController.js         # Admin operations
├── routes/                        # API endpoints
├── socket/                        # WebSocket communication
│   ├── events.js                  # Event definitions
│   ├── handlers/
│   │   ├── headNode.js            # Head node handlers
│   │   ├── swapNode.js            # Swap node handlers
│   │   ├── dataNode.js            # Data node handlers
│   │   └── managerNode.js         # Manager node handlers
│   └── socket-server.js           # Socket.io server setup
├── rtsp/                          # RTSP functionality
│   ├── stream-manager.js          # Stream lifecycle
│   ├── stream-processor.js        # Stream processing
│   └── particle-transport.js      # Data particle movement
└── server.js                      # Main application entry