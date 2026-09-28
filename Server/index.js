const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 8000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

const httpServer = http.createServer(app);

app.get("/", (req, res) => {
  res.json({
    name: "Send It Direct",
    status: "running",
    service: "signaling-server",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "send-it-direct-server",
  });
});

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    credentials: true,
  },
});

// Maps to track users and rooms
const userRoomMap = new Map();
const userIdMap = new Map();
const uniqueIdMap = new Map();

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("joinRoom", (roomNumber) => {
    const room = Number(roomNumber);

    if (!Number.isFinite(room)) {
      socket.emit("error", "Invalid room number");
      return;
    }

    socket.join(room);
    userRoomMap.set(socket.id, room);

    socket.emit("ack", `You have joined room ${room}`);
  });

  socket.on("message", (messageContent) => {
    const roomNum = userRoomMap.get(socket.id);

    if (roomNum !== undefined) {
      io.to(roomNum).emit("roomMsg", messageContent);
    }
  });

  socket.on("details", (userData) => {
    if (!userData?.socketId || !userData?.uniqueId) {
      return;
    }

    const userSocketId = userData.socketId;
    const uniqueId = userData.uniqueId;

    userIdMap.set(userSocketId, uniqueId);
    uniqueIdMap.set(uniqueId, userSocketId);

    console.log(`User registered: ${uniqueId}`);
  });

  socket.on("send-signal", (signalData) => {
    if (!signalData?.to || !signalData?.from || !signalData?.signalData) {
      return;
    }

    const targetUniqueId = signalData.to;
    const partnerSocketId = uniqueIdMap.get(targetUniqueId);

    if (!partnerSocketId) {
      socket.emit("signal-error", "Peer is no longer connected");
      return;
    }

    io.to(partnerSocketId).emit("signaling", {
      from: signalData.from,
      signalData: signalData.signalData,
      to: signalData.to,
    });
  });

  socket.on("accept-signal", (signalData) => {
    if (!signalData?.to || !signalData?.signalData) {
      return;
    }

    const targetUniqueId = signalData.to;
    const partnerSocketId = uniqueIdMap.get(targetUniqueId);

    if (!partnerSocketId) {
      socket.emit("signal-error", "Peer is no longer connected");
      return;
    }

    io.to(partnerSocketId).emit("callAccepted", {
      signalData: signalData.signalData,
      to: signalData.to,
    });
  });

  socket.on("disconnect", () => {
    console.log(`Socket disconnected: ${socket.id}`);

    const associatedUniqueId = userIdMap.get(socket.id);

    userRoomMap.delete(socket.id);
    userIdMap.delete(socket.id);

    if (associatedUniqueId) {
      uniqueIdMap.delete(associatedUniqueId);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Send It Direct server listening on port ${PORT}`);
  console.log(`Allowed client origin: ${CLIENT_URL}`);
});
