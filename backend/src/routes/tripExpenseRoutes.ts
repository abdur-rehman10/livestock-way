import { Router } from "express";
import {
  getTripExpensesByLoad,
  createTripExpense,
  updateTripExpense,
  deleteTripExpense,
} from "../controllers/tripExpenseController";

const router = Router({ mergeParams: true });

router.get("/", getTripExpensesByLoad);
router.post("/", createTripExpense);
router.patch("/:expenseId", updateTripExpense);
router.delete("/:expenseId", deleteTripExpense);

export default router;
