"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supportController_1 = require("../controllers/supportController");
const router = (0, express_1.Router)();
router.get("/", supportController_1.getSupportTicketsForUser);
router.post("/", supportController_1.createSupportTicket);
router.get("/:ticketId/messages", supportController_1.getSupportTicketMessages);
router.post("/:ticketId/messages", supportController_1.addSupportTicketMessage);
exports.default = router;
//# sourceMappingURL=supportRoutes.js.map