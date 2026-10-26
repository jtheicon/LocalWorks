import { io } from "socket.io-client";
import { API_ORIGIN } from "@/lib/apiOrigin";

export const socket = io(API_ORIGIN || undefined, {
  autoConnect: false,
  transports: ["websocket"],
});