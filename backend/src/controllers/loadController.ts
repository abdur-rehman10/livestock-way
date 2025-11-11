import { Request, Response } from "express";
import { pool } from "../config/database";

// GET /api/loads
export async function getLoads(_req: Request, res: Response) {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        title,
        species,
        quantity,
        pickup_location,
        dropoff_location,
        pickup_date,
        offer_price,
        status,
        created_by,
        created_at
      FROM loads
      ORDER BY pickup_date ASC
      `
    );

    return res.status(200).json({
      status: "OK",
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching loads:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Failed to fetch loads",
    });
  }
}
