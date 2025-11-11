import { Router } from "express";
import { getLoads } from "../controllers/loadController";

const router = Router();

router.get("/", getLoads);

export default router;
