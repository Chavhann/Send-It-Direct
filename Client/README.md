# Send It Direct — Frontend

The frontend application for Send It Direct, built with Next.js, React, TypeScript, and Tailwind CSS.

## Technologies

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- WebRTC
- Simple Peer
- Socket.IO Client

## Installation

```bash
npm install
```

## Environment Configuration

Configure the frontend's Socket.IO server URL using the environment variable expected by the application.

Check the Socket.IO connection configuration in the source code before choosing the variable name.

## Run Development Server

```bash
npm run dev
```

Open:

`http://localhost:3000`

## Production Build

```bash
npm run build
npm start
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build production application |
| `npm start` | Start production server |
| `npm run lint` | Run Next.js lint command |

## Folder Structure

```text
Client/
├── app/
├── assets/
├── components/
├── hooks/
├── lib/
├── transfer/
├── package.json
└── README.md
```
