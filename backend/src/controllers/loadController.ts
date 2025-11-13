import { Request, Response } from "express";
import { pool } from "../config/database";

const DEFAULT_SHIPPER_ID = "demo_shipper_1";
const DEFAULT_SHIPPER_ROLE = "shipper";

// GET /api/loads
export async function getLoads(req: Request, res: Response) {
  try {
    const { status, assigned_to, created_by } = req.query;

    let sql = `
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
        created_role,
        created_at,
        assigned_to,
        assigned_at,
        started_at,
        completed_at,
        epod_url
      FROM loads
      WHERE 1=1
    `;

    const params: any[] = [];
    let i = 1;

    if (status) {
      sql += ` AND status = $${i++}`;
      params.push(status);
    }

    if (assigned_to) {
      sql += ` AND assigned_to = $${i++}`;
      params.push(assigned_to);
    }

    if (created_by) {
      sql += ` AND created_by = $${i++}`;
      params.push(created_by);
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await pool.query(sql, params);

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
      created_role,
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

    const shipperId = created_by || DEFAULT_SHIPPER_ID;
    const shipperRole = created_role || DEFAULT_SHIPPER_ROLE;

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
        created_by,
        created_role
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'open', $8, $9)
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
        created_role,
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
      shipperId,
      shipperRole,
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

    console.debug("ASSIGN_LOAD: id=", id, "assigned_to=", assigned_to);

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

    console.debug("ASSIGN_LOAD result rows:", result.rows.length);

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

// POST /api/loads/:id/start
export async function startLoad(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        status: "ERROR",
        message: "Load ID is required",
      });
    }

    const result = await pool.query(
      `
      UPDATE loads
      SET status = 'in_transit',
          started_at = NOW()
      WHERE id = $1 AND status = 'assigned'
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
        assigned_at,
        started_at,
        completed_at,
        epod_url
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({
        status: "ERROR",
        message: "Load not found or not in 'assigned' status",
      });
    }

    return res.status(200).json({ status: "OK", data: result.rows[0] });
  } catch (error) {
    console.error("Error starting load:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Failed to start load",
    });
  }
}

// POST /api/loads/:id/complete
export async function completeLoad(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { epod_url } = req.body as { epod_url?: string | null };

    if (!id) {
      return res.status(400).json({
        status: "ERROR",
        message: "Load ID is required",
      });
    }

    const result = await pool.query(
      `
      UPDATE loads
      SET status = 'delivered',
          completed_at = NOW(),
          epod_url = COALESCE($2, epod_url)
      WHERE id = $1 AND status = 'in_transit'
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
        assigned_at,
        started_at,
        completed_at,
        epod_url
      `,
      [id, epod_url ?? null]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({
        status: "ERROR",
        message: "Load not found or not in 'in_transit' status",
      });
    }

    const load = result.rows[0];

    const payerId = load.created_by || DEFAULT_SHIPPER_ID;
    const payerRole = load.created_role || DEFAULT_SHIPPER_ROLE;
    const payeeId = load.assigned_to || "demo_hauler_1";
    const payeeRole = "hauler";
    const amount =
      typeof load.offer_price === "number"
        ? load.offer_price
        : Number(load.offer_price) || 100;

    await pool.query(
      `
      INSERT INTO payments (
        load_id,
        payer_id,
        payer_role,
        payee_id,
        payee_role,
        amount,
        currency,
        status,
        created_at,
        released_at
      ) VALUES ($1,$2,$3,$4,$5,$6,'USD','released',NOW(),NOW())
      `,
      [load.id, payerId, payerRole, payeeId, payeeRole, amount]
    );

    return res.status(200).json({ status: "OK", data: load });
  } catch (error) {
    console.error("Error completing load:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Failed to complete load",
    });
  }
}

// GET /api/loads/:id
export async function getLoadById(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid ID" });
  }

  try {
    const { rows } = await pool.query("SELECT * FROM loads WHERE id = $1", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Load not found" });
    }

    return res.json({ data: rows[0] });
  } catch (error) {
    console.error("Error fetching load by ID:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
