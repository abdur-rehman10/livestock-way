"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tripExpenseController_1 = require("../controllers/tripExpenseController");
const router = (0, express_1.Router)({ mergeParams: true });
router.get("/", tripExpenseController_1.getTripExpensesByLoad);
router.post("/", tripExpenseController_1.createTripExpense);
router.patch("/:expenseId", tripExpenseController_1.updateTripExpense);
router.delete("/:expenseId", tripExpenseController_1.deleteTripExpense);
exports.default = router;
//# sourceMappingURL=tripExpenseRoutes.js.map