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

const router = Router();

// GET /api/loads
router.get("/", getLoads);
router.get("/:id", getLoadById);

// POST /api/loads
router.post("/", authRequired, createLoad);

// POST /api/loads/:id/assign
router.post("/:id/assign", assignLoad);

// POST /api/loads/:id/start
router.post("/:id/start", startLoad);

// POST /api/loads/:id/complete
router.post("/:id/complete", completeLoad);

router.use("/:id/messages", tripMessageRoutes);

export default router;
