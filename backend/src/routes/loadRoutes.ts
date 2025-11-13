import { Router } from "express";
import {
  getLoads,
  getLoadById,
  createLoad,
  assignLoad,
  startLoad,
  completeLoad,
} from "../controllers/loadController";
import tripExpenseRoutes from "./tripExpenseRoutes";

const router = Router();

// GET /api/loads
router.get("/", getLoads);
router.get("/:id", getLoadById);

// POST /api/loads
router.post("/", createLoad);

// POST /api/loads/:id/assign
router.post("/:id/assign", assignLoad);

// POST /api/loads/:id/start
router.post("/:id/start", startLoad);

// POST /api/loads/:id/complete
router.post("/:id/complete", completeLoad);

router.use("/:id/expenses", tripExpenseRoutes);

export default router;
