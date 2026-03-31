import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });
  const PORT = 3000;

  // Socket.io logic
  const messages: Record<string, any[]> = {
    'global': []
  };
  const rooms = [
    { id: 'global', name: 'The Void' },
    { id: 'anime', name: 'Anime Lounge' },
    { id: 'gaming', name: 'Gaming Zone' },
    { id: 'dev', name: 'Dev Den' }
  ];

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    
    // Send initial room list
    socket.emit("update-rooms", rooms);

    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room: ${roomId}`);
      // Send existing messages in the room
      socket.emit("room-messages", messages[roomId] || []);
    });

    socket.on("create-room", (newRoom) => {
      if (!rooms.find(r => r.id === newRoom.id)) {
        rooms.push(newRoom);
        io.emit("update-rooms", rooms);
      }
    });

    socket.on("send-message", (data) => {
      const { roomId, message } = data;
      if (!messages[roomId]) messages[roomId] = [];
      messages[roomId].push(message);
      io.to(roomId).emit("new-message", message);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`CrackChat server running on http://localhost:${PORT}`);
  });
}

startServer();
