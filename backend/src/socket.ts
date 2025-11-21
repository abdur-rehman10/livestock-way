import { Server as HTTPServer } from "http";
import { Server } from "socket.io";

let io: Server | null = null;

export const SOCKET_EVENTS = {
  LOAD_POSTED: "marketplace:load:posted",
  LOAD_UPDATED: "marketplace:load:updated",
  OFFER_CREATED: "marketplace:offer:created",
  OFFER_UPDATED: "marketplace:offer:updated",
  OFFER_MESSAGE: "marketplace:offer:message",
  TRIP_UPDATED: "marketplace:trip:updated",
  PAYMENT_UPDATED: "marketplace:payment:updated",
  DISPUTE_CREATED: "marketplace:dispute:created",
  DISPUTE_UPDATED: "marketplace:dispute:updated",
  DISPUTE_MESSAGE: "marketplace:dispute:message",
  TRUCK_CHAT_MESSAGE: "marketplace:truck-chat:message",
} as const;

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

export function initSocket(server: HTTPServer) {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_ORIGIN || "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    const token = socket.handshake.auth?.token;
    socket.data.token = token;
    socket.on("join", (room: string) => {
      if (room) socket.join(room);
    });
    socket.on("disconnect", () => {});
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error("Socket.io server not initialized");
  }
  return io;
}

export function emitEvent(event: SocketEvent | string, payload: any, rooms?: string | string[]) {
  if (!io) return;
  if (rooms) {
    io.to(rooms).emit(event, payload);
  } else {
    io.emit(event, payload);
  }
}
