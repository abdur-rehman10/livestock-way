import { Router } from "express";
import { getLoads, createLoad, assignLoad } from "../controllers/loadController";

const router = Router();

// GET /api/loads
router.get("/", getLoads);

// POST /api/loads
router.post("/", createLoad);

// POST /api/loads/:id/assign
router.post("/:id/assign", assignLoad);

export default router;
