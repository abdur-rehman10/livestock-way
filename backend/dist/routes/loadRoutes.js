"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const loadController_1 = require("../controllers/loadController");
const router = (0, express_1.Router)();
// GET /api/loads
router.get("/", loadController_1.getLoads);
// POST /api/loads
router.post("/", loadController_1.createLoad);
// POST /api/loads/:id/assign
router.post("/:id/assign", loadController_1.assignLoad);
exports.default = router;
//# sourceMappingURL=loadRoutes.js.map