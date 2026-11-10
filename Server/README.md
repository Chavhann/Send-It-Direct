# Send It Direct — Backend

The backend signaling server for Send It Direct, built with Node.js, Express, and Socket.IO.

## Technologies

- Node.js
- Express.js
- Socket.IO
- CORS
- dotenv

## Features

- Real-time Socket.IO communication
- Peer registration using unique peer IDs
- Room-based messaging
- WebRTC signaling exchange
- Connection acceptance signaling
- Peer disconnection handling
- Health-check endpoint

## Installation

```bash
npm install
```

## Environment Configuration

Create a `.env` file in the Server directory:

```env
PORT=8000
CLIENT_URL=http://localhost:3000
```

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `8000` |
| `CLIENT_URL` | Allowed frontend origin | `http://localhost:3000` |

## Start the Server

```bash
npm start
```

The server runs at:

`http://localhost:8000`

## Available Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Server information and status |
| GET | `/health` | Health check |

## Socket.IO Events

| Event | Purpose |
|---|---|
| `joinRoom` | Join a messaging room |
| `message` | Send room messages |
| `details` | Register a peer ID |
| `send-signal` | Send WebRTC signaling data |
| `accept-signal` | Accept signaling |
| `roomMsg` | Receive room messages |
| `signaling` | Receive signaling data |
| `callAccepted` | Receive connection acceptance |
| `registered` | Registration confirmation |
| `server-error` | Server-side error notification |
| `signal-error` | Signaling error notification |

## Development

```bash
npm start
```

The backend uses port `8000` by default.
