"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const loadController_1 = require("../controllers/loadController");
const tripMessageRoutes_1 = __importDefault(require("./tripMessageRoutes"));
const auth_1 = __importDefault(require("../middlewares/auth"));
const router = (0, express_1.Router)();
// GET /api/loads
router.get("/", loadController_1.getLoads);
router.get("/:id", loadController_1.getLoadById);
// POST /api/loads
router.post("/", auth_1.default, loadController_1.createLoad);
// POST /api/loads/:id/assign
router.post("/:id/assign", loadController_1.assignLoad);
// POST /api/loads/:id/start
router.post("/:id/start", loadController_1.startLoad);
// POST /api/loads/:id/complete
router.post("/:id/complete", loadController_1.completeLoad);
router.use("/:id/messages", tripMessageRoutes_1.default);
exports.default = router;
//# sourceMappingURL=loadRoutes.js.map