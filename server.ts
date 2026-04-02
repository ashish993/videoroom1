import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import { ExpressPeerServer } from "peer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOMS_FILE = path.join(process.cwd(), "rooms.json");

// Initialize rooms file if not exists
if (!fs.existsSync(ROOMS_FILE)) {
  fs.writeFileSync(ROOMS_FILE, JSON.stringify({}));
}

function getRooms() {
  try {
    const data = fs.readFileSync(ROOMS_FILE, "utf-8");
    return JSON.parse(data);
  } catch (e) {
    return {};
  }
}

function saveRooms(rooms: any) {
  fs.writeFileSync(ROOMS_FILE, JSON.stringify(rooms, null, 2));
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const peerServer = ExpressPeerServer(httpServer, {
    path: "/peerjs",
    proxied: true,
  });

  app.use("/peerjs", peerServer);

  const PORT = 3000;

  // API for room management
  app.use(express.json());

  app.get("/api/rooms", (req, res) => {
    res.json(getRooms());
  });

  app.post("/api/rooms", (req, res) => {
    const { id, name } = req.body;
    if (!id || !name) return res.status(400).json({ error: "Missing id or name" });
    const rooms = getRooms();
    rooms[id] = { id, name, createdAt: new Date().toISOString() };
    saveRooms(rooms);
    res.json(rooms[id]);
  });

  // Socket.io logic
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId, userId, userName) => {
      console.log(`User ${userId} (${userName}) joining room ${roomId}`);
      socket.join(roomId);
      
      // Notify others in the room
      socket.to(roomId).emit("user-connected", userId, userName);

      socket.on("send-message", (message) => {
        io.to(roomId).emit("receive-message", {
          id: Math.random().toString(36).substr(2, 9),
          userId,
          userName,
          text: message,
          timestamp: new Date().toISOString(),
        });
      });

      socket.on("disconnect", () => {
        console.log(`User ${userId} disconnected`);
        socket.to(roomId).emit("user-disconnected", userId);
      });
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
