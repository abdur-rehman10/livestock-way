import { Router } from "express";
import { getLoads, createLoad } from "../controllers/loadController";

const router = Router();

// GET /api/loads
router.get("/", getLoads);

// POST /api/loads
router.post("/", createLoad);

export default router;
