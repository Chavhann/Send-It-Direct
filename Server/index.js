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

// Maps public peer IDs to their active Socket.IO connections.
const uniqueIdMap = new Map();

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  socket.on("joinRoom", (roomNumber) => {
    const room = Number(roomNumber);

    if (!Number.isFinite(room)) {
      socket.emit("server-error", "Invalid room number");
      return;
    }

    socket.join(room);
    socket.emit("ack", `You have joined room ${room}`);
  });

  socket.on("message", (messageContent) => {
    const rooms = [...socket.rooms].filter((room) => room !== socket.id);

    for (const room of rooms) {
      io.to(room).emit("roomMsg", messageContent);
    }
  });

  socket.on("details", (userData) => {
    const uniqueId =
      typeof userData?.uniqueId === "string" ? userData.uniqueId.trim() : "";

    if (!uniqueId || uniqueId.length !== 10) {
      socket.emit("server-error", "Invalid peer ID");
      return;
    }

    const previousSocketId = uniqueIdMap.get(uniqueId);

    if (previousSocketId && previousSocketId !== socket.id) {
      io.to(previousSocketId).emit(
        "server-error",
        "This peer ID is already connected"
      );
      return;
    }

    socket.data.uniqueId = uniqueId;
    uniqueIdMap.set(uniqueId, socket.id);

    console.log(`User registered: ${uniqueId} on socket ${socket.id}`);
    socket.emit("registered", { uniqueId });
  });

  socket.on("send-signal", (signalData) => {
    const targetUniqueId =
      typeof signalData?.to === "string" ? signalData.to.trim() : "";
    const signal = signalData?.signalData;

    if (!targetUniqueId || !signal || !socket.data.uniqueId) {
      socket.emit("signal-error", "Invalid signaling request");
      return;
    }

    const partnerSocketId = uniqueIdMap.get(targetUniqueId);

    if (!partnerSocketId) {
      socket.emit("signal-error", "Peer is no longer connected");
      return;
    }

    io.to(partnerSocketId).emit("signaling", {
      from: socket.data.uniqueId,
      signalData: signal,
      to: targetUniqueId,
    });
  });

  socket.on("accept-signal", (signalData) => {
    const targetUniqueId =
      typeof signalData?.to === "string" ? signalData.to.trim() : "";
    const signal = signalData?.signalData;

    if (!targetUniqueId || !signal || !socket.data.uniqueId) {
      socket.emit("signal-error", "Invalid signaling request");
      return;
    }

    const partnerSocketId = uniqueIdMap.get(targetUniqueId);

    if (!partnerSocketId) {
      socket.emit("signal-error", "Peer is no longer connected");
      return;
    }

    io.to(partnerSocketId).emit("callAccepted", {
      from: socket.data.uniqueId,
      signalData: signal,
      to: targetUniqueId,
    });
  });

  socket.on("disconnect", () => {
    const uniqueId = socket.data.uniqueId;

    if (uniqueId && uniqueIdMap.get(uniqueId) === socket.id) {
      uniqueIdMap.delete(uniqueId);
    }

    console.log(`Socket disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Send It Direct server listening on port ${PORT}`);
  console.log(`Allowed client origin: ${CLIENT_URL}`);
});
