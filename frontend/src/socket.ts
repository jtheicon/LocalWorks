import { io } from "socket.io-client";

export const socket = io("http://localhost:8920", {
  autoConnect: false,
  transports: ["websocket"],
});