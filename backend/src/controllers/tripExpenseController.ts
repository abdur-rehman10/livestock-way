import { Request, Response } from "express";
import { pool } from "../config/database";

export const getTripExpensesByLoad = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const loadId = Number(id);

    if (!loadId || Number.isNaN(loadId)) {
      return res.status(400).json({ error: "Invalid load id" });
    }

    const { rows } = await pool.query(
      `
      SELECT *
      FROM trip_expenses
      WHERE load_id = $1
      ORDER BY created_at DESC
      `,
      [loadId]
    );

    res.json(rows);
  } catch (error) {
    console.error("Error fetching trip expenses:", error);
    res.status(500).json({ error: "Failed to fetch trip expenses" });
  }
};

export const createTripExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const loadId = Number(id);

    if (!loadId || Number.isNaN(loadId)) {
      return res.status(400).json({ error: "Invalid load id" });
    }

    const { user_id, user_role, type, amount, currency, note } = req.body;

    if (!user_id || !user_role || !type || amount == null) {
      return res.status(400).json({
        error: "user_id, user_role, type and amount are required",
      });
    }

    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        error: "amount must be a positive number",
      });
    }

    const { rows } = await pool.query(
      `
      INSERT INTO trip_expenses (
        load_id,
        user_id,
        user_role,
        type,
        amount,
        currency,
        note
      )
      VALUES ($1,$2,$3,$4,$5,COALESCE($6,'USD'),$7)
      RETURNING *
      `,
      [loadId, user_id, user_role, type, parsedAmount, currency || "USD", note || null]
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error creating trip expense:", error);
    res.status(500).json({ error: "Failed to create trip expense" });
  }
};

export const updateTripExpense = async (req: Request, res: Response) => {
  try {
    const { id, expenseId } = req.params;
    const loadId = Number(id);
    const expenseIdNum = Number(expenseId);

    if (!loadId || Number.isNaN(loadId) || !expenseIdNum || Number.isNaN(expenseIdNum)) {
      return res.status(400).json({ error: "Invalid load or expense id" });
    }

    const { type, amount, currency, note } = req.body as {
      type?: string;
      amount?: number;
      currency?: string;
      note?: string | null;
    };

    const updates: string[] = [];
    const params: any[] = [];
    let i = 1;

    if (type) {
      updates.push(`type = $${i++}`);
      params.push(type);
    }

    if (amount != null) {
      const parsedAmount = Number(amount);
      if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          error: "amount must be a positive number",
        });
      }
      updates.push(`amount = $${i++}`);
      params.push(parsedAmount);
    }

    if (currency) {
      updates.push(`currency = $${i++}`);
      params.push(currency);
    }

    if (note !== undefined) {
      updates.push(`note = $${i++}`);
      params.push(note);
    }

    if (!updates.length) {
      return res.status(400).json({ error: "No fields provided to update" });
    }

    params.push(loadId);
    params.push(expenseIdNum);

    const { rows } = await pool.query(
      `
      UPDATE trip_expenses
      SET ${updates.join(", ")}
      WHERE load_id = $${i++} AND id = $${i}
      RETURNING *
      `,
      params
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Expense not found for this load" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error updating trip expense:", error);
    res.status(500).json({ error: "Failed to update trip expense" });
  }
};

export const deleteTripExpense = async (req: Request, res: Response) => {
  try {
    const { id, expenseId } = req.params;
    const loadId = Number(id);
    const expenseIdNum = Number(expenseId);

    if (!loadId || Number.isNaN(loadId) || !expenseIdNum || Number.isNaN(expenseIdNum)) {
      return res.status(400).json({ error: "Invalid load or expense id" });
    }

    const { rows } = await pool.query(
      `
      DELETE FROM trip_expenses
      WHERE load_id = $1 AND id = $2
      RETURNING *
      `,
      [loadId, expenseIdNum]
    );

    if (!rows.length) {
      return res.status(404).json({ error: "Expense not found for this load" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting trip expense:", error);
    res.status(500).json({ error: "Failed to delete trip expense" });
  }
};
