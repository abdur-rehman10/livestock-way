import { Router } from "express";
import {
  getTripMessagesByLoad,
  createTripMessage,
} from "../controllers/tripMessageController";

const router = Router({ mergeParams: true });

router.get("/", getTripMessagesByLoad);
router.post("/", createTripMessage);

export default router;
