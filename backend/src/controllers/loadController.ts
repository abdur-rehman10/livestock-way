import { Request, Response } from "express";
import { pool } from "../config/database";
import { ensureShipperProfile } from "../utils/profileHelpers";

const DEFAULT_SHIPPER_ID = "demo_shipper_1";
const DEFAULT_SHIPPER_ROLE = "shipper";

type AuthenticatedRequest = Request & {
  user?: {
    id?: string | number;
    user_type?: string;
  };
};

// GET /api/loads
export async function getLoads(req: Request, res: Response) {
  try {
    const { status, created_by } = req.query;

    let shipperFilter: number | null = null;
    if (created_by) {
      const { rows } = await pool.query(
        "SELECT id FROM shippers WHERE user_id = $1 LIMIT 1",
        [created_by]
      );
      if (rows.length) {
        shipperFilter = Number(rows[0].id);
      } else {
        return res.json({ status: "OK", data: [] });
      }
    }

    let sql = `
      SELECT
        id,
        title,
        species,
        animal_count AS quantity,
        estimated_weight_kg AS weight,
        pickup_location_text AS pickup_location,
        dropoff_location_text AS dropoff_location,
        pickup_window_start AS pickup_date,
        price_offer_amount AS offer_price,
        status,
        notes AS description,
        created_at
      FROM loads
      WHERE is_deleted = FALSE
    `;

    const params: any[] = [];
    let index = 1;

    if (status) {
      sql += ` AND status = $${index++}`;
      params.push(status);
    } else if (!shipperFilter) {
      sql += ` AND status = 'posted'`;
    }

    if (shipperFilter) {
      sql += ` AND shipper_id = $${index++}`;
      params.push(shipperFilter);
    }

    sql += ` ORDER BY created_at DESC LIMIT 100`;

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
      delivery_location,
      pickup_date,
      pickup_date_from,
      pickup_date_to,
      estimated_weight_lbs,
      weight,
      rate_per_mile,
      offer_price,
      description,
      additional_comments,
    } = req.body;

    const normalizedSpecies = species?.trim();
    const pickupLocation =
      pickup_location?.trim() ?? req.body.pickup_location_text?.trim();
    const deliveryLocation =
      dropoff_location?.trim() ??
      delivery_location?.trim() ??
      req.body.dropoff_location_text?.trim();
    const pickupWindowStart =
      pickup_date_from ?? pickup_date ?? req.body.pickup_window_start;
    const pickupWindowEnd =
      pickup_date_to ?? pickup_date ?? req.body.pickup_window_end;

    if (!normalizedSpecies || !pickupLocation || !deliveryLocation || !pickupWindowStart) {
      return res
        .status(400)
        .json({ status: "ERROR", message: "Missing required fields" });
    }

    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id ? Number(authReq.user.id) : null;
    const userType = (authReq.user?.user_type || "").toUpperCase();

    if (!userId) {
      return res.status(401).json({
        status: "ERROR",
        message: "Unauthorized",
      });
    }

    if (userType !== "SHIPPER") {
      return res.status(403).json({
        status: "ERROR",
        message: "Only shippers can post loads",
      });
    }

    const shipperId = await ensureShipperProfile(userId);
    const loadTitle = title?.trim() || `${normalizedSpecies} load`;

    const quantityValue =
      typeof quantity === "number"
        ? quantity
        : typeof req.body.animal_count === "number"
        ? req.body.animal_count
        : null;

    const weightKg = (() => {
      if (typeof weight === "number") return weight;
      if (typeof req.body.estimated_weight_kg === "number") {
        return req.body.estimated_weight_kg;
      }
      if (estimated_weight_lbs) {
        const lbs = Number(estimated_weight_lbs);
        if (!Number.isNaN(lbs)) {
          return Number((lbs * 0.453592).toFixed(2));
        }
      }
      return null;
    })();

    const priceOffer =
      typeof rate_per_mile === "number"
        ? rate_per_mile
        : typeof offer_price === "number"
        ? offer_price
        : null;

    const notes =
      description ??
      additional_comments ??
      req.body.notes ??
      null;

    const insertQuery = `
      INSERT INTO loads (
        shipper_id,
        title,
        species,
        animal_count,
        estimated_weight_kg,
        pickup_location_text,
        dropoff_location_text,
        pickup_window_start,
        pickup_window_end,
        price_offer_amount,
        price_currency,
        status,
        visibility,
        notes
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'USD','posted','public',$11
      )
      RETURNING
        id,
        title,
        species,
        animal_count AS quantity,
        estimated_weight_kg AS weight,
        pickup_location_text AS pickup_location,
        dropoff_location_text AS dropoff_location,
        pickup_window_start AS pickup_date,
        price_offer_amount AS offer_price,
        status,
        notes AS description,
        created_at
    `;

    const values = [
      shipperId,
      loadTitle,
      normalizedSpecies,
      quantityValue,
      weightKg,
      pickupLocation,
      deliveryLocation,
      pickupWindowStart,
      pickupWindowEnd,
      priceOffer,
      notes,
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
