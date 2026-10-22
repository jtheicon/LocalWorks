import { io } from "socket.io-client";

import { ADMIN_ORIGIN } from "@/lib/adminConnect";

export const socket = io(ADMIN_ORIGIN, {
  autoConnect: false,
  transports: ["websocket"],
});