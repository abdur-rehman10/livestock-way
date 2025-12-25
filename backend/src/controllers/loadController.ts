import { Request, Response } from "express";
import { pool } from "../config/database";
import { ensureShipperProfile } from "../utils/profileHelpers";
import { createPaymentForTrip } from "../services/paymentsService";
import { emitEvent, SOCKET_EVENTS } from "../socket";

const DEFAULT_SHIPPER_ID = "demo_shipper_1";
const DEFAULT_SHIPPER_ROLE = "shipper";

type AuthenticatedRequest = Request & {
  user?: {
    id?: string | number;
    user_type?: string;
  };
};

function buildSimpleRestPlan(distanceKm?: number | null) {
  const numericDistance =
    typeof distanceKm === "number" && !Number.isNaN(distanceKm)
      ? distanceKm
      : null;

  if (!numericDistance || numericDistance <= 0) {
    return {
      total_distance_km: numericDistance,
      stops: [],
    };
  }

  const stopInterval = 400;
  const stops: Array<{ stop_number: number; at_distance_km: number; notes: string }> = [];

  let covered = stopInterval;
  let stopNumber = 1;

  while (covered < numericDistance) {
    stops.push({
      stop_number: stopNumber,
      at_distance_km: covered,
      notes: "Mandatory animal welfare rest stop (auto-planned)",
    });
    covered += stopInterval;
    stopNumber += 1;
  }

  return {
    total_distance_km: numericDistance,
    stops,
  };
}

// GET /api/loads
export async function getLoads(req: Request, res: Response) {
  try {
    const { status, created_by, assigned_to } = req.query;

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

    let assignedFilter: number | null = null;
    if (assigned_to) {
      const parsed = Number(assigned_to);
      if (!parsed || Number.isNaN(parsed)) {
        return res.status(400).json({
          status: "ERROR",
          message: "assigned_to must be a numeric user id",
        });
      }
      assignedFilter = parsed;
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
        created_at,
        assigned_to_user_id AS assigned_to,
        assigned_at,
        started_at,
        completed_at,
        epod_url,
        awarded_offer_id,
        payment_mode,
        direct_payment_disclaimer_accepted_at,
        direct_payment_disclaimer_version
      FROM loads
      WHERE is_deleted = FALSE
    `;

    const params: any[] = [];
    let index = 1;

    if (status) {
      sql += ` AND status = $${index++}`;
      params.push(status);
    } else if (!shipperFilter && !assignedFilter) {
      sql += ` AND status = 'posted'`;
    }

    if (shipperFilter) {
      sql += ` AND shipper_id = $${index++}`;
      params.push(shipperFilter);
    }

    if (assignedFilter) {
      sql += ` AND assigned_to_user_id = $${index++}`;
      params.push(assignedFilter);
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
      price_offer_amount,
      price_currency,
      payment_mode,
      direct_payment_disclaimer_accepted_at,
      direct_payment_disclaimer_version,
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

    let priceOffer: number | null = null;
    if (
      price_offer_amount !== undefined &&
      price_offer_amount !== null &&
      price_offer_amount !== ""
    ) {
      const parsed = Number(price_offer_amount);
      if (Number.isNaN(parsed) || parsed <= 0) {
        return res.status(400).json({
          status: "ERROR",
          message: "price_offer_amount must be a positive number",
        });
      }
      priceOffer = parsed;
    } else if (typeof rate_per_mile === "number" && rate_per_mile > 0) {
      priceOffer = rate_per_mile;
    } else if (typeof offer_price === "number" && offer_price > 0) {
      priceOffer = offer_price;
    }

    const priceCurrency =
      typeof price_currency === "string" && price_currency.trim()
        ? price_currency.trim().toUpperCase()
        : "USD";

    const notes =
      description ??
      additional_comments ??
      req.body.notes ??
      null;

    const paymentModeNormalized =
      typeof payment_mode === "string" && payment_mode.toUpperCase() === "DIRECT"
        ? "DIRECT"
        : "ESCROW";
    const disclaimerAcceptedAt =
      paymentModeNormalized === "DIRECT" && direct_payment_disclaimer_accepted_at
        ? new Date(direct_payment_disclaimer_accepted_at).toISOString()
        : paymentModeNormalized === "DIRECT" && req.body?.direct_payment_disclaimer_accepted
        ? new Date().toISOString()
        : null;
    const disclaimerVersion =
      paymentModeNormalized === "DIRECT" && direct_payment_disclaimer_version
        ? direct_payment_disclaimer_version
        : paymentModeNormalized === "DIRECT" && req.body?.direct_payment_disclaimer_accepted
        ? "v1"
        : null;

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
        notes,
        payment_mode,
        direct_payment_disclaimer_accepted_at,
        direct_payment_disclaimer_version
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'posted','public',$12,$13,$14,$15
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
      priceCurrency,
      notes,
      paymentModeNormalized,
      disclaimerAcceptedAt,
      disclaimerVersion,
    ];

    const result = await pool.query(insertQuery, values);
    const loadRow = result.rows[0];

    if (loadRow) {
      emitEvent(SOCKET_EVENTS.LOAD_POSTED, { load: loadRow });
    }

    return res.status(201).json({
      status: "OK",
      data: loadRow,
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
  const client = await pool.connect();
  try {
    const authReq = req as AuthenticatedRequest;
    const userId = authReq.user?.id ? Number(authReq.user.id) : null;
    const userType = (authReq.user?.user_type ?? "").toUpperCase();
    const isSuperAdmin = userType === "SUPER_ADMIN";

    if (!userId) {
      return res.status(401).json({
        status: "ERROR",
        message: "Unauthorized",
      });
    }

    if (!isSuperAdmin && userType !== "SHIPPER") {
      return res.status(403).json({
        status: "ERROR",
        message: "Only shippers can assign loads",
      });
    }

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

    const loadId = Number(id);
    const assignedUserId = Number(assigned_to);

    if (!loadId || Number.isNaN(loadId)) {
      return res.status(400).json({
        status: "ERROR",
        message: "Load ID must be numeric",
      });
    }

    if (!assignedUserId || Number.isNaN(assignedUserId)) {
      return res.status(400).json({
        status: "ERROR",
        message: "assigned_to must be a numeric user id",
      });
    }

    await client.query("BEGIN");

    const loadResult = await client.query(
      `
      SELECT
        id,
        title,
        species,
        animal_count,
        pickup_location_text,
        dropoff_location_text,
        pickup_window_start,
        price_offer_amount,
        status,
        shipper_id,
        created_at,
        assigned_at,
        started_at,
        completed_at,
        price_currency,
        pickup_window_end,
        distance_km,
        assigned_to_user_id
      FROM loads
      WHERE id = $1
      FOR UPDATE
    `,
      [loadId]
    );

    if (loadResult.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        status: "ERROR",
        message: "Load not found",
      });
    }

    const loadRow = loadResult.rows[0];

    const shipperUserResult = await client.query(
      "SELECT user_id FROM shippers WHERE id = $1",
      [loadRow.shipper_id]
    );
    const shipperUserId = shipperUserResult.rowCount
      ? Number(shipperUserResult.rows[0].user_id)
      : null;

    if (!isSuperAdmin && (!shipperUserId || shipperUserId !== userId)) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        status: "ERROR",
        message: "You can only assign loads you own",
      });
    }

    const isAlreadyAssignedToSameHauler =
      loadRow.status === "matched" &&
      loadRow.assigned_to_user_id &&
      Number(loadRow.assigned_to_user_id) === assignedUserId;

    if (loadRow.status !== "posted" && !isAlreadyAssignedToSameHauler) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        status: "ERROR",
        message: "Load is not open for assignment",
      });
    }

    const haulerResult = await client.query(
      "SELECT id, user_id FROM haulers WHERE user_id = $1",
      [assignedUserId]
    );

    let haulerProfileId: number;
    if (haulerResult.rowCount === 0) {
      const autoHauler = await client.query(
        `
          INSERT INTO haulers (
            user_id,
            legal_name,
            created_at,
            updated_at
          )
          VALUES (
            $1,
            $2,
            NOW(),
            NOW()
          )
          RETURNING id
        `,
        [assignedUserId, `Auto Hauler ${assignedUserId}`]
      );
      haulerProfileId = Number(autoHauler.rows[0].id);
    } else {
      haulerProfileId = Number(haulerResult.rows[0].id);
    }

    const existingTripResult = await client.query(
      `
      SELECT
        id,
        load_id,
        hauler_id,
        truck_id,
        driver_id,
        status,
        planned_start_time,
        planned_end_time,
        route_distance_km,
        rest_stop_plan_json,
        created_at,
        updated_at
      FROM trips
      WHERE load_id = $1
      LIMIT 1
    `,
      [loadId]
    );

    let tripRecord = existingTripResult.rowCount
      ? existingTripResult.rows[0]
      : null;
    let paymentRecord: any = null;

    let selectedTruckId: number | null = null;
    let selectedDriverId: number | null = null;

    if (!tripRecord) {
      const truckResult = await client.query(
        `
        SELECT id
        FROM trucks
        WHERE hauler_id = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `,
        [haulerProfileId]
      );

      if (truckResult.rowCount === 0) {
        const insertedTruck = await client.query(
          `
            INSERT INTO trucks (
              hauler_id,
              plate_number,
              truck_type,
              status,
              created_at,
              updated_at
            )
            VALUES (
              $1,
              $2,
              'mixed_livestock',
              'active',
              NOW(),
              NOW()
            )
            RETURNING id
          `,
          [haulerProfileId, `AUTO-${Date.now()}`]
        );
        selectedTruckId = Number(insertedTruck.rows[0].id);
      } else {
        selectedTruckId = Number(truckResult.rows[0].id);
      }

      const driverResult = await client.query(
        `
        SELECT id
        FROM drivers
        WHERE hauler_id = $1
        ORDER BY updated_at DESC
        LIMIT 1
      `,
        [haulerProfileId]
      );

      if (driverResult.rowCount === 0) {
        const insertedDriver = await client.query(
          `
            INSERT INTO drivers (
              hauler_id,
              full_name,
              status,
              created_at,
              updated_at
            )
            VALUES (
              $1,
              $2,
              'active',
              NOW(),
              NOW()
            )
            RETURNING id
          `,
          [haulerProfileId, `Auto Driver ${assignedUserId}`]
        );
        selectedDriverId = Number(insertedDriver.rows[0].id);
      } else {
        selectedDriverId = Number(driverResult.rows[0].id);
      }
    }

    if (!isAlreadyAssignedToSameHauler) {
      const updateResult = await client.query(
        `
        UPDATE loads
        SET
          assigned_to_user_id = $1,
          assigned_at = NOW(),
          status = 'matched'
        WHERE id = $2 AND status = 'posted'
      `,
        [assignedUserId, loadId]
      );

      if (updateResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({
          status: "ERROR",
          message: "Load not found or already assigned",
        });
      }
    }

    const finalLoadResult = await client.query(
      `
      SELECT
        id,
        title,
        species,
        animal_count,
        pickup_location_text,
        dropoff_location_text,
        pickup_window_start,
        price_offer_amount,
        status,
        shipper_id,
        created_at,
        assigned_at,
        started_at,
        completed_at
      FROM loads
      WHERE id = $1
    `,
      [loadId]
    );

    const updatedLoad = finalLoadResult.rows[0];

    if (!tripRecord) {
      const plannedStart =
        loadRow.pickup_window_start || new Date().toISOString();
      const plannedEnd = loadRow.pickup_window_end || null;
      const distanceValue =
        loadRow.distance_km === null || loadRow.distance_km === undefined
          ? null
          : Number(loadRow.distance_km);

      const tripInsert = await client.query(
        `
        INSERT INTO trips (
          load_id,
          hauler_id,
          truck_id,
          driver_id,
          status,
          planned_start_time,
          planned_end_time,
          route_distance_km,
          rest_stop_plan_json,
          created_at,
          updated_at
        )
        VALUES (
          $1,$2,$3,$4,
          'planned',
          $5,$6,$7,$8::jsonb,
          NOW(),NOW()
        )
        RETURNING
          id,
          load_id,
          hauler_id,
          truck_id,
          driver_id,
          status,
          planned_start_time,
          planned_end_time,
          route_distance_km,
          rest_stop_plan_json,
          created_at,
          updated_at
      `,
        [
          loadId,
          haulerProfileId,
          selectedTruckId,
          selectedDriverId,
          plannedStart,
          plannedEnd,
          distanceValue,
          JSON.stringify(buildSimpleRestPlan(distanceValue)),
        ]
      );

      tripRecord = tripInsert.rows[0];

      const priceOffer = loadRow.price_offer_amount
        ? Number(loadRow.price_offer_amount)
        : null;
      if (
        priceOffer &&
        priceOffer > 0 &&
        shipperUserId &&
        assignedUserId
      ) {
        paymentRecord = await createPaymentForTrip({
          tripId: Number(tripRecord.id),
          loadId,
          shipperUserId,
          haulerUserId: assignedUserId,
          amount: priceOffer,
          currency: (loadRow.price_currency || "USD").trim(),
          client,
        });
      }
    }

    await client.query("COMMIT");

    return res.status(200).json({
      status: "OK",
      data: updatedLoad,
      trip: tripRecord,
      payment: paymentRecord,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error assigning load:", error);
    return res.status(500).json({
      status: "ERROR",
      message: "Failed to assign load",
    });
  } finally {
    client.release();
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
      WHERE id = $1 AND status = 'matched'
      RETURNING
        id,
        title,
        species,
        animal_count AS quantity,
        pickup_location_text AS pickup_location,
        dropoff_location_text AS dropoff_location,
        pickup_window_start AS pickup_date,
        price_offer_amount AS offer_price,
        status,
        shipper_id AS created_by,
        created_at,
        assigned_to_user_id AS assigned_to,
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
      SET status = 'completed',
          completed_at = NOW(),
          epod_url = COALESCE($2, epod_url)
      WHERE id = $1 AND status = 'in_transit'
      RETURNING
        id,
        title,
        species,
        animal_count AS quantity,
        pickup_location_text AS pickup_location,
        dropoff_location_text AS dropoff_location,
        pickup_window_start AS pickup_date,
        price_offer_amount AS offer_price,
        status,
        shipper_id,
        created_at,
        assigned_to_user_id AS assigned_to,
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
