# Send It Direct

> **Send it direct. No cloud. No middleman.**

Send It Direct is a peer-to-peer file sharing and real-time communication application built with WebRTC, Next.js, React, Node.js, Express, and Socket.IO.

The application establishes a direct connection between peers for file and message transfer, while the signaling server is used to coordinate the WebRTC connection.

## Features

- **Peer-to-Peer File Sharing**
  - Transfer files directly between connected browsers using WebRTC.
- **Real-Time Communication**
  - Exchange messages with connected peers during a sharing session.
- **WebRTC Connectivity**
  - Uses WebRTC DataChannels for peer-to-peer communication.
  - Socket.IO handles signaling and connection establishment.
- **Shareable Connection**
  - Generate a peer connection token/link and share it with another user.
- **Responsive UI**
  - Modern interface built with Next.js, React, and Tailwind CSS.
- **Environment-Based Configuration**
  - Client and server configuration are controlled through environment variables.

## Architecture

```text
Client A
   |
   | WebRTC DataChannel
   | Direct P2P connection
   |
Client B

   ^
   |
   | Signaling
   |
Node.js + Express + Socket.IO
Connection Flow
Client A connects to the signaling server.
Client B connects to the signaling server.
The peers exchange WebRTC signaling information.
WebRTC establishes a peer-to-peer connection.
Files and messages are transferred through the WebRTC connection.
The signaling server handles connection coordination.
Technology Stack
Frontend
Next.js
React
TypeScript
Tailwind CSS
WebRTC
Simple Peer
Socket.IO Client
Backend
Node.js
Express
Socket.IO
CORS
Project Structure
Send-It-Direct/
|
+-- Client/
|   +-- app/
|   |   +-- page.tsx
|   |   +-- ShareCard.tsx
|   |   +-- ShareLink.tsx
|   |   +-- ...
|   |
|   +-- components/
|   +-- public/
|   +-- package.json
|   +-- ...
|
+-- Server/
|   +-- index.js
|   +-- package.json
|   +-- ...
|
+-- .gitignore
+-- README.md
Local Development
Prerequisites
Node.js 18+
npm
Git
1. Clone the repository
git clone https://github.com/Chavhann/Send-It-Direct.git
cd Send-It-Direct
2. Start the Server
cd Server
npm install

Create:

Server/.env

Add:

PORT=8000
CLIENT_URL=http://localhost:3000

Start the server:

npm start

The server will run at:

http://localhost:8000

Health endpoint:

http://localhost:8000/health
3. Start the Client

Open another PowerShell terminal:

cd Client
npm install

Create:

Client/.env.local

Add:

NEXT_PUBLIC_APP_URL=http://localhost:3000

Start the development server:

npm run dev

Open:

http://localhost:3000
Environment Variables
Client
NEXT_PUBLIC_APP_URL=http://localhost:3000
Server
PORT=8000
CLIENT_URL=http://localhost:3000

Environment files should not be committed to the repository.

Engineering Focus

The project focuses on building a reliable browser-based peer-to-peer communication system.

Planned engineering improvements include:

Reliable WebRTC file transfer
File chunking
Transfer progress tracking
Large-file handling
Transfer retry and recovery
WebRTC backpressure handling
Connection lifecycle management
Input validation
Secure CORS configuration
Error handling
Automated testing
CI/CD
Logging and observability
Production deployment configuration
Development

The active development branch is:

send-it-direct-development

The main branch is intended to represent the stable version.

Author

Ganesh Chavhan

GitHub:

https://github.com/Chavhann
