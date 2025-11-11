import { Router } from "express";
import { getLoads } from "../controllers/loadController";

const router = Router();

// GET /api/loads
router.get("/", getLoads);

export default router;
