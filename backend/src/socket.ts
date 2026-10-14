// socket.ts
import { Server } from "socket.io";
import { allowedOrigins } from "./config/http";

let io: Server;




export const initSocket = (server: any) => {
  console.log("INIT SOCKET");

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PATCH"],
    },
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket not initialized");
  return io;
};