"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const loadController_1 = require("../controllers/loadController");
const tripMessageRoutes_1 = __importDefault(require("./tripMessageRoutes"));
const auth_1 = __importDefault(require("../middlewares/auth"));
const rbac_1 = require("../middlewares/rbac");
const auditLogger_1 = require("../middlewares/auditLogger");
const router = (0, express_1.Router)();
// GET /api/loads
router.get("/", loadController_1.getLoads);
router.get("/:id", loadController_1.getLoadById);
// POST /api/loads
router.post("/", auth_1.default, (0, rbac_1.requireRoles)(["shipper"]), (0, auditLogger_1.auditRequest)("load:create"), loadController_1.createLoad);
// POST /api/loads/:id/assign
router.post("/:id/assign", auth_1.default, (0, rbac_1.requireRoles)(["shipper"]), (0, auditLogger_1.auditRequest)("load:assign", (req) => `load:${req.params.id}`), loadController_1.assignLoad);
// POST /api/loads/:id/start
router.post("/:id/start", auth_1.default, (0, rbac_1.requireRoles)(["hauler", "driver"]), (0, auditLogger_1.auditRequest)("load:start", (req) => `load:${req.params.id}`), loadController_1.startLoad);
// POST /api/loads/:id/complete
router.post("/:id/complete", auth_1.default, (0, rbac_1.requireRoles)(["hauler", "driver"]), (0, auditLogger_1.auditRequest)("load:complete", (req) => `load:${req.params.id}`), loadController_1.completeLoad);
router.use("/:id/messages", tripMessageRoutes_1.default);
exports.default = router;
//# sourceMappingURL=loadRoutes.js.map