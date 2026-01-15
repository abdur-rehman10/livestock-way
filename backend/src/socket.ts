import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io: Server | null = null;

interface JwtPayload {
  id: string;
  user_type?: string | null;
  company_id?: string | null;
  iat?: number;
  exp?: number;
}

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
  JOB_MESSAGE: "job:message",
  JOB_THREAD_UPDATED: "job:thread:updated",
  BUY_SELL_MESSAGE: "buy-sell:message",
  BUY_SELL_THREAD_UPDATED: "buy-sell:thread:updated",
  RESOURCES_MESSAGE: "resources:message",
  RESOURCES_THREAD_UPDATED: "resources:thread:updated",
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
    
    // Verify token and extract user ID
    let userId: number | null = null;
    if (token) {
      try {
        const secret = process.env.JWT_SECRET;
        if (secret) {
          const decoded = jwt.verify(token, secret) as JwtPayload;
          userId = Number(decoded.id);
          socket.data.userId = userId;
          
          // Join user-specific room for thread updates
          if (userId) {
            socket.join(`user-${userId}`);
          }
        }
      } catch (err) {
        console.error("Socket auth error:", err);
      }
    }
    
    socket.on("join", (room: string) => {
      if (room) socket.join(room);
    });
    
    socket.on("leave", (room: string) => {
      if (room) socket.leave(room);
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
