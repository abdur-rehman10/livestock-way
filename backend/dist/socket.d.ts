import { Server as HTTPServer } from "http";
import { Server } from "socket.io";
export declare const SOCKET_EVENTS: {
    readonly LOAD_POSTED: "marketplace:load:posted";
    readonly LOAD_UPDATED: "marketplace:load:updated";
    readonly OFFER_CREATED: "marketplace:offer:created";
    readonly OFFER_UPDATED: "marketplace:offer:updated";
    readonly OFFER_MESSAGE: "marketplace:offer:message";
    readonly TRIP_UPDATED: "marketplace:trip:updated";
    readonly PAYMENT_UPDATED: "marketplace:payment:updated";
    readonly DISPUTE_CREATED: "marketplace:dispute:created";
    readonly DISPUTE_UPDATED: "marketplace:dispute:updated";
    readonly DISPUTE_MESSAGE: "marketplace:dispute:message";
    readonly TRUCK_CHAT_MESSAGE: "marketplace:truck-chat:message";
};
export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];
export declare function initSocket(server: HTTPServer): Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare function getIO(): Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare function emitEvent(event: SocketEvent | string, payload: any, rooms?: string | string[]): void;
//# sourceMappingURL=socket.d.ts.map