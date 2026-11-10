# Send It Direct

**Peer-to-peer file sharing with real-time communication.**

Send It Direct is a web-based peer-to-peer file-sharing application designed to let users connect and exchange files directly between devices. It uses WebRTC for peer connections and Socket.IO for real-time signaling between connected users.

## Features

- **Peer-to-Peer File Sharing:** Transfer files directly between connected devices using WebRTC.
- **Chunk-Based Transfer:** Divide files into 32 KB chunks for structured transmission.
- **Transfer Window Management:** Send chunks in windows of up to 64 chunks before waiting for acknowledgement.
- **Transfer Progress:** Track sending and receiving progress.
- **Transfer Validation:** Validate file sizes, chunk sequences, and transfer completion.
- **Transfer Cancellation:** Support cancelling an active transfer.
- **Real-Time Signaling:** Coordinate peer connections through Socket.IO.
- **Peer Registration:** Identify connected peers using unique IDs.
- **Room Messaging:** Exchange messages between users in shared rooms.
- **Transfer Error Handling:** Handle invalid messages, interrupted connections, and transfer errors.

## Transfer Management

Send It Direct maintains a browser-based transfer history using local storage.

Each history entry records:

- Transfer ID
- File name and size
- Transfer direction (sent or received)
- Start and completion timestamps
- Transfer duration
- Transfer status
- Error information when available

The application retains up to 100 transfer history entries.

## WebRTC Connectivity

The application uses WebRTC peer connections with a configured TURN server for network connectivity.

The Socket.IO backend handles peer registration and signaling, while file data is transferred through the WebRTC data channel.

## Transfer Protocol

The transfer implementation includes:

- 32 KB file chunks
- A sending window of up to 64 chunks
- Chunk acknowledgements
- Transfer-ready and transfer-finished messages
- File-size and chunk-sequence validation
- Cancellation and error messages
- Transfer progress callbacks


## Technology Stack

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- WebRTC
- Simple Peer
- Socket.IO Client

### Backend
- Node.js
- Express.js
- Socket.IO
- CORS
- dotenv

## Project Structure

```text
Sent-It-Direct/
├── Client/
│   ├── app/
│   ├── assets/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── transfer/
│   ├── package.json
│   └── README.md
│
├── Server/
│   ├── index.js
│   ├── package.json
│   └── README.md
│
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Node.js
- npm

### 1. Clone the repository

```bash
git clone https://github.com/Chavhann/Send-It-Direct.git
cd Send-It-Direct
```

### 2. Start the backend

```bash
cd Server
npm install
```

Create a `.env` file in the `Server` directory:

```env
PORT=8000
CLIENT_URL=http://localhost:3000
```

Start the server:

```bash
npm start
```

The backend runs at:

`http://localhost:8000`

Health check:

`http://localhost:8000/health`

### 3. Start the frontend

Open another terminal:

```bash
cd Client
npm install
```

Configure the frontend environment variables according to the application's Socket.IO connection configuration.

Start the development server:

```bash
npm run dev
```

The frontend runs at:

`http://localhost:3000`

## Architecture

1. The frontend connects to the backend signaling server using Socket.IO.
2. Users register their peer IDs with the signaling server.
3. The server helps exchange WebRTC signaling information between peers.
4. WebRTC establishes the peer-to-peer connection.
5. Data can then be exchanged directly between connected peers.

The signaling server coordinates connections; it does not itself establish the direct peer-to-peer data channel.

## Configuration

| Variable | Description | Default |
|---|---|---|
| `PORT` | Backend server port | `8000` |
| `CLIENT_URL` | Allowed frontend origin | `http://localhost:3000` |

## Development

Frontend:

```bash
cd Client
npm run dev
```

Backend:

```bash
cd Server
npm start
```

## License

License information will be added separately.
