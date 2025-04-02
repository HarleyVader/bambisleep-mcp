# RTSP Stream Factory

## Overview
The RTSP Stream Factory is a robust infrastructure designed to manage and distribute RTSP streams efficiently. It combines RESTful APIs for heavy load management with real-time event-driven interactions using Socket.IO, ensuring a seamless experience for both administrators and clients.

## Features
- **Stream Management**: Create, start, stop, and manage RTSP streams through a dedicated API.
- **Real-Time Interactivity**: Utilize Socket.IO for real-time communication between clients and the server.
- **OBS Integration**: Integrate with OBS for advanced stream management and control.
- **Admin Controls**: Admins can manage users and streams effectively through a dedicated admin panel.

## Project Structure
- **src/**: Contains the main application code.
  - **server/**: The backend server code, including routes, controllers, and middleware.
  - **rtsp/**: Manages RTSP stream lifecycle and processing.
  - **socket/**: Handles real-time socket connections and events.
  - **obs-integration/**: Interfaces with OBS for stream management.
  - **models/**: Defines data models for streams, devices, and users.
  - **types/**: TypeScript types and interfaces.
  - **utils/**: Utility functions and logging.

- **client/**: The frontend application built with React.
  - **components/**: React components for viewing streams, managing devices, and admin functionalities.
  - **services/**: API and socket service management.

- **config/**: Configuration files for different environments.

- **scripts/**: Shell scripts for setup and deployment.

- **package.json**: Project dependencies and scripts.

- **tsconfig.json**: TypeScript configuration.

## Getting Started
1. Clone the repository.
2. Install dependencies using `npm install`.
3. Configure the environment settings in the `config` directory.
4. Start the server with `npm run start`.
5. Launch the client application with `npm run client`.

## Contributing
Contributions are welcome! Please submit a pull request or open an issue for any enhancements or bug fixes.

## License
This project is licensed under the MIT License.