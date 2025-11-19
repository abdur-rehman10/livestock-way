import { io, type Socket } from "socket.io-client";
import { API_BASE_URL, type Load } from "./api";
import type {
  LoadOffer,
  OfferMessage,
  TripRecord,
  PaymentRecord,
} from "../api/marketplace";

const SOCKET_IO_OPTIONS = {
  transports: ["websocket"],
  withCredentials: false,
  reconnection: true,
};

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
} as const;

export type SocketEventKey = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

type SocketEventPayloadMap = {
  [SOCKET_EVENTS.LOAD_POSTED]: { load: Load };
  [SOCKET_EVENTS.LOAD_UPDATED]: {
    load: {
      id: string | number;
      status?: string | null;
      awarded_offer_id?: string | number | null;
      assigned_to_user_id?: string | number | null;
      shipper_user_id?: string | number | null;
    };
  };
  [SOCKET_EVENTS.OFFER_CREATED]: { offer: LoadOffer };
  [SOCKET_EVENTS.OFFER_UPDATED]: { offer: LoadOffer };
  [SOCKET_EVENTS.OFFER_MESSAGE]: { message: OfferMessage };
  [SOCKET_EVENTS.TRIP_UPDATED]: { trip: TripRecord };
  [SOCKET_EVENTS.PAYMENT_UPDATED]: { payment: PaymentRecord };
  [SOCKET_EVENTS.DISPUTE_CREATED]: { dispute: Record<string, unknown> };
  [SOCKET_EVENTS.DISPUTE_UPDATED]: { dispute: Record<string, unknown> };
  [SOCKET_EVENTS.DISPUTE_MESSAGE]: { message: Record<string, unknown> };
};

let socket: Socket | null = null;

function getAuthToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(API_BASE_URL, {
      ...SOCKET_IO_OPTIONS,
      autoConnect: false,
      auth: { token: getAuthToken() },
    });
    socket.on("connect_error", (err) => {
      console.warn("socket connect error", err);
    });
  } else {
    socket.auth = { token: getAuthToken() };
  }

  if (!socket.connected) {
    socket.connect();
  }

  return socket;
}

export function subscribeToSocketEvent<K extends keyof SocketEventPayloadMap>(
  event: K,
  handler: (payload: SocketEventPayloadMap[K]) => void
) {
  const sock = getSocket();
  const listener = (payload: SocketEventPayloadMap[K]) => {
    handler(payload);
  };
  sock.on(event as string, listener as unknown as (...args: any[]) => void);
  return () => {
    sock.off(event as string, listener as unknown as (...args: any[]) => void);
  };
}

export function joinSocketRoom(room: string) {
  const sock = getSocket();
  if (room) {
    sock.emit("join", room);
  }
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
