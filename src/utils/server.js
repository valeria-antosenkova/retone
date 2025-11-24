import  express  from "express";
import  http from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

const rooms = {};

io.on("connection", (socket) => {

  socket.on("join-room", (roomId, username) => {
    console.log("User connected");
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = { messages: [] };
    console.log('Sending chat-history:', rooms[roomId].messages);

    socket.emit("chat-history", rooms[roomId].messages);

    socket.to(roomId).emit("new-message", {
            id: Date.now().toString(),
            text: `${username} joined`,
            tone: { tone: 'neutral', confidence: 1, label: 'Neutral', emoji: '😐', hint: '', suggestions: [] },
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            author: "System",
            isUser: false
        });
    });

  socket.on("send-message", (roomId, msg, username) => {
    if (!rooms[roomId]) rooms[roomId] = { messages: [] };

    rooms[roomId].messages.push(msg);
    io.to(roomId).emit("new-message", msg);
  });

  socket.on("disconnecting", () => {
    // socket.rooms is a Set of rooms this socket is currently in
    socket.rooms.forEach((roomId) => {
      if (roomId === socket.id) return; // skip default room (each socket has a room of its own id)

      // Check how many sockets are left in this room
      const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;
      if (roomSize === 1) {
        // This is the last socket disconnecting
        console.log(`Deleting empty room: ${roomId}`);
        delete rooms[roomId];
      }
    });
  });
});

httpServer.listen(3001, () => console.log("Server running on 3001"));
