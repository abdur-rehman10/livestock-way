"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const loadController_1 = require("../controllers/loadController");
const router = (0, express_1.Router)();
// GET /api/loads
router.get("/", loadController_1.getLoads);
// GET /api/loads/:id
router.get("/:id", loadController_1.getLoadById);
// POST /api/loads
router.post("/", loadController_1.createLoad);
// POST /api/loads/:id/assign
router.post("/:id/assign", loadController_1.assignLoad);
// POST /api/loads/:id/start
router.post("/:id/start", loadController_1.startLoad);
// POST /api/loads/:id/complete
router.post("/:id/complete", loadController_1.completeLoad);
exports.default = router;
//# sourceMappingURL=loadRoutes.js.map