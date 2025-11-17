"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tripMessageController_1 = require("../controllers/tripMessageController");
const router = (0, express_1.Router)({ mergeParams: true });
router.get("/", tripMessageController_1.getTripMessagesByLoad);
router.post("/", tripMessageController_1.createTripMessage);
exports.default = router;
//# sourceMappingURL=tripMessageRoutes.js.map