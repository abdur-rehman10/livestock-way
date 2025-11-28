import { Router } from "express";
import {
  getLoads,
  getLoadById,
  createLoad,
  assignLoad,
  startLoad,
  completeLoad,
} from "../controllers/loadController";
import tripMessageRoutes from "./tripMessageRoutes";
import authRequired from "../middlewares/auth";
import { requireRoles } from "../middlewares/rbac";
import { auditRequest } from "../middlewares/auditLogger";

const router = Router();

// GET /api/loads
router.get("/", getLoads);
router.get("/:id", getLoadById);

// POST /api/loads
router.post(
  "/",
  authRequired,
  requireRoles(["shipper"]),
  auditRequest("load:create"),
  createLoad
);

// POST /api/loads/:id/assign
router.post(
  "/:id/assign",
  authRequired,
  requireRoles(["shipper"]),
  auditRequest("load:assign", (req) => `load:${req.params.id}`),
  assignLoad
);

// POST /api/loads/:id/start
router.post(
  "/:id/start",
  authRequired,
  requireRoles(["hauler", "driver"]),
  auditRequest("load:start", (req) => `load:${req.params.id}`),
  startLoad
);

// POST /api/loads/:id/complete
router.post(
  "/:id/complete",
  authRequired,
  requireRoles(["hauler", "driver"]),
  auditRequest("load:complete", (req) => `load:${req.params.id}`),
  completeLoad
);

router.use("/:id/messages", tripMessageRoutes);

export default router;
