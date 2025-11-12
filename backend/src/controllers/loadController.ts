import { Request, Response } from "express";
import { pool } from "../config/database";

// GET /api/loads
export async function getLoads(req: Request, res: Response) {
  try {
    const createdBy = req.query.created_by as string | undefined;

    let query = `
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
    `;
    const values: Array<string> = [];

    if (createdBy) {
      query += ` WHERE created_by = $1`;
      values.push(createdBy);
    }

    query += ` ORDER BY pickup_date ASC`;

    const result = await pool.query(query, values);

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

// POST /api/loads
export async function createLoad(req: Request, res: Response) {
  try {
    const {
      title,
      species,
      quantity,
      pickup_location,
      dropoff_location,
      pickup_date,
      offer_price,
      created_by,
    } = req.body;

    if (
      !title ||
      !species ||
      !quantity ||
      !pickup_location ||
      !dropoff_location ||
      !pickup_date
    ) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Missing required fields" });
    }

    const insertQuery = `
      INSERT INTO loads (
        title,
        species,
        quantity,
        pickup_location,
        dropoff_location,
        pickup_date,
        offer_price,
        status,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8)
      RETURNING
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
    `;

    const values = [
      title,
      species,
      quantity,
      pickup_location,
      dropoff_location,
      pickup_date,
      offer_price ?? null,
      created_by ?? null,
    ];

    const result = await pool.query(insertQuery, values);

    return res.status(201).json({
      status: "OK",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating load:", error);
    return res
      .status(500)
      .json({ status: "ERROR", message: "Failed to create load" });
  }
}
