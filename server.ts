import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // Storage for rooms and messages
  // rooms: { [roomId: string]: { password?: string, name: string } }
  const rooms: Record<string, { password?: string; name: string }> = {
    "global": { name: "Global Void" }
  };
  // messages: { [roomId: string]: any[] }
  const messages: Record<string, any[]> = {
    "global": []
  };

  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("get_rooms", () => {
      const roomList = Object.entries(rooms).map(([id, room]) => ({
        id,
        name: room.name,
        hasPassword: !!room.password
      }));
      socket.emit("room_list", roomList);
    });

    socket.on("create_room", (data) => {
      const { id, name, password } = data;
      if (rooms[id]) {
        socket.emit("error", "Room ID already exists");
        return;
      }
      rooms[id] = { name, password };
      messages[id] = [];
      
      // Update all clients with new room list
      const roomList = Object.entries(rooms).map(([rid, room]) => ({
        id: rid,
        name: room.name,
        hasPassword: !!room.password
      }));
      io.emit("room_list", roomList);
      socket.emit("room_created", id);
    });

    socket.on("join_room", (data) => {
      const { roomId, password } = data;
      const room = rooms[roomId];

      if (!room) {
        socket.emit("error", "Room not found");
        return;
      }

      if (room.password && room.password !== password) {
        socket.emit("error", "Incorrect password");
        return;
      }

      // Leave previous rooms
      socket.rooms.forEach(r => {
        if (r !== socket.id) socket.leave(r);
      });

      socket.join(roomId);
      socket.emit("joined_room", {
        roomId,
        name: room.name,
        messages: messages[roomId] || []
      });
    });

    socket.on("send_message", (data) => {
      const { roomId, text, sender, color, type, url } = data;
      const message = {
        id: Date.now().toString(),
        text,
        sender,
        timestamp: new Date().toISOString(),
        color,
        type: type || 'text', // 'text', 'emoji', 'gif', 'sticker'
        url: url || null
      };

      if (!messages[roomId]) messages[roomId] = [];
      messages[roomId].push(message);
      
      // Keep only last 100 messages per room
      if (messages[roomId].length > 100) messages[roomId].shift();
      
      io.to(roomId).emit("receive_message", message);
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
