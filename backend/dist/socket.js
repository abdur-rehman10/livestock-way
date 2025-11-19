"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOCKET_EVENTS = void 0;
exports.initSocket = initSocket;
exports.getIO = getIO;
exports.emitEvent = emitEvent;
const socket_io_1 = require("socket.io");
let io = null;
exports.SOCKET_EVENTS = {
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
};
function initSocket(server) {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.CLIENT_ORIGIN || "*",
            methods: ["GET", "POST"],
        },
    });
    io.on("connection", (socket) => {
        const token = socket.handshake.auth?.token;
        socket.data.token = token;
        socket.on("join", (room) => {
            if (room)
                socket.join(room);
        });
        socket.on("disconnect", () => { });
    });
    return io;
}
function getIO() {
    if (!io) {
        throw new Error("Socket.io server not initialized");
    }
    return io;
}
function emitEvent(event, payload, rooms) {
    if (!io)
        return;
    if (rooms) {
        io.to(rooms).emit(event, payload);
    }
    else {
        io.emit(event, payload);
    }
}
//# sourceMappingURL=socket.js.map