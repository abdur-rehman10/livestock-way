import { Request, Response } from "express";
import { pool } from "../config/database";

// GET /api/loads
export async function getLoads(req: Request, res: Response) {
  try {
    const createdBy = req.query.created_by as string | undefined;
    const assignedTo = req.query.assigned_to as string | undefined;

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
        created_at,
        assigned_to,
        assigned_at
      FROM loads
    `;

    const clauses: string[] = [];
    const values: Array<string> = [];

    if (createdBy) {
      clauses.push(`created_by = $${values.length + 1}`);
      values.push(createdBy);
    }

    if (assignedTo) {
      clauses.push(`assigned_to = $${values.length + 1}`);
      values.push(assignedTo);
    }

    if (clauses.length) {
      query += ` WHERE ` + clauses.join(" AND ");
    } else {
      query += ` WHERE status = 'open'`;
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

// POST /api/loads/:id/assign
export async function assignLoad(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { assigned_to } = req.body;

    if (!id) {
      return res.status(400).json({
        status: "ERROR",
        message: "Load ID is required",
      });
    }

    if (!assigned_to) {
      return res.status(400).json({
        status: "ERROR",
        message: "assigned_to is required",
      });
    }

    const updateQuery = `
      UPDATE loads
      SET
        assigned_to = $1,
        assigned_at = NOW(),
        status = 'assigned'
      WHERE id = $2 AND status = 'open'
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
        created_at,
        assigned_to,
        assigned_at
    `;

    const values = [assigned_to, id];
    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: "ERROR",
        message: "Load not found or not open",
      });
    }

    return res.status(200).json({
      status: "OK",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error assigning load:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Failed to assign load",
    });
  }
}
