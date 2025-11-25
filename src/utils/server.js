import express from "express";
import http from "http";
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

    if (!rooms[roomId]) rooms[roomId] = { messages: [], users: [], host: null };
    // Normalize username
    let uname = username || "";
    // If no host assigned yet, make this user the host
    if (!rooms[roomId].host) {
      rooms[roomId].host = uname || "Host";
      if (!uname) uname = "Host"; // set the socket's username to Host if none provided
    }
    socket.data.username = uname;
    if (!rooms[roomId].users.includes(username))
      rooms[roomId].users.push(username);
    console.log("Sending chat-history:", rooms[roomId].messages);

    socket.emit("chat-history", rooms[roomId].messages);
    // Send current user list and host info to the joining socket
    socket.emit("user-list", rooms[roomId].users);
    socket.emit("host-updated", rooms[roomId].host);
    // Let everyone else know who the host is (including the joining user)
    socket.to(roomId).emit("host-updated", rooms[roomId].host);
    // If this socket is the host, notify them
    if (rooms[roomId].host === socket.data.username) {
      socket.emit("you-are-host", true);
    }

    // Notify other sockets in the room that a user joined (no chat message)
    socket.to(roomId).emit("user-joined", username);
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
      // Remove user from room list and notify others
      const username = socket.data.username || "";
      if (rooms[roomId]) {
        rooms[roomId].users = rooms[roomId].users.filter((u) => u !== username);
        socket.to(roomId).emit("user-left", username);
        // If this user was the host, choose a new host and notify others
        if (rooms[roomId].host === username) {
          const newHost =
            rooms[roomId].users.length > 0 ? rooms[roomId].users[0] : null;
          rooms[roomId].host = newHost;
          io.to(roomId).emit("host-updated", newHost);
          if (newHost === socket.data.username) {
            // Shouldn't happen since socket is disconnecting; but left for completeness
            socket.emit("you-are-host", true);
          }
        }
      }

      if (roomSize === 1) {
        // This is the last socket disconnecting
        console.log(`Deleting empty room: ${roomId}`);
        delete rooms[roomId];
      }
    });
  });
});

httpServer.listen(3001, () => console.log("Server running on 3001"));
