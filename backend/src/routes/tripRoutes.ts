import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import {
  createPaymentForTrip,
  getPaymentByTripId,
  releasePaymentForTrip,
} from "../services/paymentsService";
import { PoolClient } from "pg";
import authRequired from "../middlewares/auth";
import { requireRoles } from "../middlewares/rbac";
import { auditRequest } from "../middlewares/auditLogger";

const router = Router();
router.use(authRequired);

function getQueryValue(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : undefined;
  }
  return undefined;
}

function mapStatusToEnum(value?: string | null) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  switch (normalized) {
    case "planned":
      return "planned";
    case "assigned":
      return "assigned";
    case "en_route":
      return "en_route";
    case "in_progress":
      return "en_route";
    case "completed":
      return "completed";
    case "cancelled":
    case "canceled":
      return "cancelled";
    default:
      return null;
  }
}

function buildRestStopPlan(plannedDistanceKm?: number | null) {
  if (!plannedDistanceKm || Number.isNaN(Number(plannedDistanceKm))) {
    return {
      total_distance_km: null,
      stops: [],
    };
  }

  const distance = Number(plannedDistanceKm);
  const stopIntervalKm = 400;
  const stops = [] as Array<{ stop_number: number; at_distance_km: number; notes: string }>;

  let covered = stopIntervalKm;
  let stopIndex = 1;

  while (covered < distance) {
    stops.push({
      stop_number: stopIndex,
      at_distance_km: covered,
      notes: "Mandatory animal welfare rest stop (static rule).",
    });
    covered += stopIntervalKm;
    stopIndex += 1;
  }

  return {
    total_distance_km: distance,
    stops,
  };
}

function parseId(value: string) {
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
}

function getTripIdParam(req: Request) {
  const params = req.params as { id?: string };
  const raw = params?.id;
  if (!raw) return null;
  return parseId(raw);
}

type ExpenseColumnProfile = {
  descriptionColumn: "description" | "notes";
  receiptColumn: "receipt_photo_url" | "receipt_url";
  hasUpdatedAt: boolean;
};

const expenseColumnCandidates = [
  "description",
  "notes",
  "receipt_photo_url",
  "receipt_url",
  "updated_at",
] as const;

let cachedExpenseColumns: ExpenseColumnProfile | null = null;
let expenseColumnProfilePromise: Promise<ExpenseColumnProfile> | null = null;

async function detectExpenseColumns(): Promise<ExpenseColumnProfile> {
  try {
    const { rows } = await pool.query(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'trip_expenses'
          AND column_name = ANY($1)
      `,
      [expenseColumnCandidates]
    );

    const names = new Set(rows.map((row) => row.column_name));

    return {
      descriptionColumn: names.has("description") ? "description" : "notes",
      receiptColumn: names.has("receipt_photo_url") ? "receipt_photo_url" : "receipt_url",
      hasUpdatedAt: names.has("updated_at"),
    };
  } catch (error) {
    console.error("Failed to inspect trip_expenses schema:", error);
    return {
      descriptionColumn: "notes",
      receiptColumn: "receipt_url",
      hasUpdatedAt: false,
    };
  }
}

async function getExpenseColumnProfile(): Promise<ExpenseColumnProfile> {
  if (cachedExpenseColumns) {
    return cachedExpenseColumns;
  }

  if (!expenseColumnProfilePromise) {
    expenseColumnProfilePromise = detectExpenseColumns().then((profile) => {
      cachedExpenseColumns = profile;
      return profile;
    });
  }

  return expenseColumnProfilePromise;
}

router.post(
  "/",
  requireRoles(["shipper", "hauler"]),
  auditRequest("trip:create"),
  async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const {
      load_id,
      hauler_id,
      truck_id,
      driver_id,
      planned_departure_at,
      planned_arrival_at,
      planned_distance_km,
      agreed_price,
      currency,
    } = req.body;

    if (
      !load_id ||
      !hauler_id ||
      !truck_id ||
      !driver_id ||
      !planned_departure_at
    ) {
      return res.status(400).json({
        message:
          "load_id, hauler_id, truck_id, driver_id and planned_departure_at are required",
      });
    }

    const priceNumber = Number(agreed_price);
    if (!priceNumber || Number.isNaN(priceNumber) || priceNumber <= 0) {
      return res
        .status(400)
        .json({ message: "agreed_price must be provided for payments" });
    }

    await client.query("BEGIN");

    const [loadCheck, haulerCheck, truckCheck, driverCheck] = await Promise.all([
      client.query("SELECT id, shipper_id FROM loads WHERE id = $1", [load_id]),
      client.query("SELECT id, user_id FROM haulers WHERE id = $1", [hauler_id]),
      client.query("SELECT id, hauler_id FROM trucks WHERE id = $1", [truck_id]),
      client.query("SELECT id FROM drivers WHERE id = $1", [driver_id]),
    ]);

    if (loadCheck.rowCount === 0) {
      return res.status(400).json({ message: "Invalid load_id" });
    }
    if (haulerCheck.rowCount === 0) {
      return res.status(400).json({ message: "Invalid hauler_id" });
    }
    if (truckCheck.rowCount === 0) {
      return res.status(400).json({ message: "Invalid truck_id" });
    }
    if (driverCheck.rowCount === 0) {
      return res.status(400).json({ message: "Invalid driver_id" });
    }

    const restStopPlan = buildRestStopPlan(planned_distance_km);

    const haulerProfileId = truckCheck.rows[0].hauler_id || hauler_id;
    const shipperProfileId = loadCheck.rows[0].shipper_id;

    const shipperUser = await client.query(
      "SELECT user_id FROM shippers WHERE id = $1",
      [shipperProfileId]
    );
    const haulerUser = await client.query(
      "SELECT user_id FROM haulers WHERE id = $1",
      [haulerProfileId]
    );

    if (shipperUser.rowCount === 0 || haulerUser.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Linked shipper/hauler not found" });
    }

    const insertQuery = `
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
    `;

    const values = [
      load_id,
      hauler_id,
      truck_id,
      driver_id,
      planned_departure_at,
      planned_arrival_at || null,
      planned_distance_km || null,
      JSON.stringify(restStopPlan),
    ];

    const result = await client.query(insertQuery, values);
    const trip = result.rows[0];

    const payment = await createPaymentForTrip({
      tripId: trip.id,
      loadId: trip.load_id,
      shipperUserId: Number(shipperUser.rows[0].user_id),
      haulerUserId: Number(haulerUser.rows[0].user_id),
      amount: priceNumber,
      currency: (currency || "USD").toUpperCase(),
      client,
    });

    await client.query("COMMIT");
    return res.status(201).json({ trip, payment });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error in POST /api/trips:", err);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
  }
);

router.get(
  "/",
  requireRoles(["shipper", "hauler", "driver"]),
  async (req: Request, res: Response) => {
  try {
    const { status, hauler_id, driver_id, truck_id, load_id } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];

    const statusValue = mapStatusToEnum(getQueryValue(status));
    if (statusValue) {
      params.push(statusValue);
      conditions.push(`status = $${params.length}::trip_status_enum`);
    }

    const pushCondition = (value: unknown, clauseBuilder: (index: number) => string) => {
      const normalized = getQueryValue(value);
      if (!normalized) return;
      params.push(normalized);
      conditions.push(clauseBuilder(params.length));
    };

    pushCondition(hauler_id, (i) => `hauler_id = $${i}`);
    pushCondition(driver_id, (i) => `driver_id = $${i}`);
    pushCondition(truck_id, (i) => `truck_id = $${i}`);
    pushCondition(load_id, (i) => `load_id = $${i}`);

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const query = `
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
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 200
    `;

    const result = await pool.query(query, params);
    return res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /api/trips:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
  }
);

router.get(
  "/:id",
  requireRoles(["shipper", "hauler", "driver"]),
  async (req: Request, res: Response) => {
  try {
    const id = getTripIdParam(req);
    if (id === null) {
      return res.status(400).json({ message: "Invalid trip id" });
    }

    const query = `
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
      WHERE id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Trip not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Error in GET /api/trips/:id:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
  }
);

router.patch(
  "/:id/status",
  requireRoles(["hauler", "driver"]),
  auditRequest("trip:update-status", (req) => `trip:${req.params.id}`),
  async (req: Request, res: Response) => {
  try {
    const id = getTripIdParam(req);
    const { status } = req.body;

    if (id === null) {
      return res.status(400).json({ message: "Invalid trip id" });
    }

    if (!status) {
      return res.status(400).json({ message: "status is required" });
    }

    const normalizedStatus = mapStatusToEnum(String(status));

    if (!normalizedStatus) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const query = `
      UPDATE trips
      SET status = $1::trip_status_enum, updated_at = NOW()
      WHERE id = $2
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
    `;

    const result = await pool.query(query, [normalizedStatus, id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Trip not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Error in PATCH /api/trips/:id/status:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
  }
);

router.post(
  "/:id/pre-trip-check",
  requireRoles(["driver", "hauler"]),
  auditRequest("trip:pretrip", (req) => `trip:${req.params.id}`),
  async (req: Request, res: Response) => {
  try {
    const tripId = getTripIdParam(req);
    if (tripId === null) {
      return res.status(400).json({ message: "Invalid trip id" });
    }

    const driverId = Number(req.body.driver_id);
    const truckId = Number(req.body.truck_id);

    if (!driverId || Number.isNaN(driverId) || !truckId || Number.isNaN(truckId)) {
      return res.status(400).json({
        message: "driver_id and truck_id are required for pre-trip check",
      });
    }

    const tripCheck = await pool.query("SELECT id FROM trips WHERE id = $1", [tripId]);
    if (tripCheck.rowCount === 0) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const existing = await pool.query(
      "SELECT id FROM pre_trip_checks WHERE trip_id = $1",
      [tripId]
    );

    const values = [
      tripId,
      driverId,
      truckId,
      req.body.checklist_status || "COMPLETED",
      req.body.is_vehicle_clean ?? null,
      req.body.is_vehicle_roadworthy ?? null,
      req.body.tyres_ok ?? null,
      req.body.brakes_ok ?? null,
      req.body.lights_ok ?? null,
      req.body.gate_latches_ok ?? null,
      req.body.ventilation_ok ?? null,
      req.body.is_animals_fit_to_travel ?? null,
      req.body.overcrowding_checked ?? null,
      req.body.water_and_feed_checked ?? null,
      req.body.odometer_start ?? null,
      req.body.additional_notes ?? null,
    ];

    let result;
    const existingCount = existing.rowCount ?? 0;
    if (existingCount > 0) {
      const updateQuery = `
        UPDATE pre_trip_checks
        SET
          driver_id = $2,
          truck_id = $3,
          checklist_status = $4,
          is_vehicle_clean = $5,
          is_vehicle_roadworthy = $6,
          tyres_ok = $7,
          brakes_ok = $8,
          lights_ok = $9,
          gate_latches_ok = $10,
          ventilation_ok = $11,
          is_animals_fit_to_travel = $12,
          overcrowding_checked = $13,
          water_and_feed_checked = $14,
          odometer_start = $15,
          additional_notes = $16,
          updated_at = NOW()
        WHERE trip_id = $1
        RETURNING *
      `;
      result = await pool.query(updateQuery, values);
    } else {
      const insertQuery = `
        INSERT INTO pre_trip_checks (
          trip_id,
          driver_id,
          truck_id,
          checklist_status,
          is_vehicle_clean,
          is_vehicle_roadworthy,
          tyres_ok,
          brakes_ok,
          lights_ok,
          gate_latches_ok,
          ventilation_ok,
          is_animals_fit_to_travel,
          overcrowding_checked,
          water_and_feed_checked,
          odometer_start,
          additional_notes,
          created_at,
          updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
          NOW(),NOW()
        )
        RETURNING *
      `;
      result = await pool.query(insertQuery, values);
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Error in POST /api/trips/:id/pre-trip-check:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
  }
);

router.get(
  "/:id/pre-trip-check",
  requireRoles(["driver", "hauler", "shipper"]),
  async (req: Request, res: Response) => {
  try {
    const tripId = getTripIdParam(req);
    if (tripId === null) {
      return res.status(400).json({ message: "Invalid trip id" });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM pre_trip_checks
      WHERE trip_id = $1
      LIMIT 1
    `,
      [tripId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Pre-trip check not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Error in GET /api/trips/:id/pre-trip-check:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
  }
);

router.post(
  "/:id/epod",
  requireRoles(["driver", "hauler"]),
  auditRequest("trip:epod-upload", (req) => `trip:${req.params.id}`),
  async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const tripId = getTripIdParam(req);
    if (tripId === null) {
      return res.status(400).json({ message: "Invalid trip id" });
    }

    await client.query("BEGIN");

    const tripCheck = await client.query("SELECT id FROM trips WHERE id = $1", [tripId]);
    if (tripCheck.rowCount === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ message: "Trip not found" });
    }

    const existing = await client.query(
      "SELECT id FROM trip_epods WHERE trip_id = $1",
      [tripId]
    );

    const photosJson =
      Array.isArray(req.body.delivery_photos) && req.body.delivery_photos.length > 0
        ? JSON.stringify(req.body.delivery_photos)
        : JSON.stringify([]);

    const values = [
      tripId,
      req.body.delivered_at || null,
      req.body.receiver_name || null,
      req.body.receiver_signature || null,
      photosJson,
      req.body.delivery_notes || null,
    ];

    let epodResult;
    const existingCount = existing.rowCount ?? 0;
    if (existingCount > 0) {
      const updateQuery = `
        UPDATE trip_epods
        SET
          delivered_at = $2,
          receiver_name = $3,
          receiver_signature = $4,
          delivery_photos = $5::jsonb,
          delivery_notes = $6,
          updated_at = NOW()
        WHERE trip_id = $1
        RETURNING *
      `;
      epodResult = await client.query(updateQuery, values);
    } else {
      const insertQuery = `
        INSERT INTO trip_epods (
          trip_id,
          delivered_at,
          receiver_name,
          receiver_signature,
          delivery_photos,
          delivery_notes,
          created_at,
          updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5::jsonb,$6,
          NOW(),NOW()
        )
        RETURNING *
      `;
      epodResult = await client.query(insertQuery, values);
    }

    const tripUpdate = await client.query(
      `UPDATE trips SET status = 'completed', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [tripId]
    );

    const authUserIdRaw = (req as any)?.user?.id;
    const releasedPayment = await releasePaymentForTrip(tripId, {
      client,
      releasedByUserId: authUserIdRaw ? Number(authUserIdRaw) : null,
    });

    await client.query("COMMIT");

    return res.json({
      epod: epodResult.rows[0],
      trip: tripUpdate.rows[0],
      payment: releasedPayment,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error in POST /api/trips/:id/epod:", err);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    client.release();
  }
  }
);

router.get(
  "/:id/epod",
  requireRoles(["driver", "hauler", "shipper"]),
  async (req: Request, res: Response) => {
  try {
    const tripId = getTripIdParam(req);
    if (tripId === null) {
      return res.status(400).json({ message: "Invalid trip id" });
    }

    const result = await pool.query(
      `
      SELECT *
      FROM trip_epods
      WHERE trip_id = $1
      LIMIT 1
    `,
      [tripId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "ePOD not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("Error in GET /api/trips/:id/epod:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
  }
);

router.post(
  "/:id/expenses",
  requireRoles(["driver", "hauler"]),
  auditRequest("trip:expense-create", (req) => `trip:${req.params.id}`),
  async (req: Request, res: Response) => {
  try {
    const tripId = getTripIdParam(req);
    if (tripId === null) {
      return res.status(400).json({ message: "Invalid trip id" });
    }

    const tripCheck = await pool.query("SELECT id FROM trips WHERE id = $1", [tripId]);
    if (tripCheck.rowCount === 0) {
      return res.status(404).json({ message: "Trip not found" });
    }

    const { driver_id, expense_type, amount, currency, description, receipt_photo_url, incurred_at } = req.body;

    if (!expense_type || amount === undefined || amount === null) {
      return res.status(400).json({ message: "expense_type and amount are required" });
    }

    const amountNumber = Number(amount);
    if (Number.isNaN(amountNumber)) {
      return res.status(400).json({ message: "amount must be a number" });
    }

    let driverIdValue: number | null = null;
    if (driver_id !== undefined && driver_id !== null && driver_id !== "") {
      const numericDriverId = Number(driver_id);
      if (Number.isNaN(numericDriverId) || numericDriverId <= 0) {
        return res.status(400).json({ message: "driver_id must be numeric" });
      }

      const driverExists = await pool.query(
        "SELECT id FROM drivers WHERE id = $1",
        [numericDriverId]
      );

      const driverCount = driverExists.rowCount ?? 0;
      if (driverCount > 0) {
        driverIdValue = numericDriverId;
      } else {
        console.warn(
          `Skipping driver_id ${numericDriverId}: no matching driver profile`
        );
      }
    }

    const expenseTypeValue = String(expense_type).trim().toUpperCase();
    if (!expenseTypeValue) {
      return res.status(400).json({ message: "expense_type is required" });
    }
    const currencyValue =
      typeof currency === "string" && currency.trim() ? currency.trim().toUpperCase() : "USD";

    const incurredAtValue = (() => {
      if (!incurred_at) {
        return new Date().toISOString();
      }
      const parsed = new Date(incurred_at);
      return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    })();

    const { descriptionColumn, receiptColumn, hasUpdatedAt } = await getExpenseColumnProfile();

    const insertQuery = `
      INSERT INTO trip_expenses (
        trip_id,
        driver_id,
        expense_type,
        amount,
        currency,
        ${descriptionColumn},
        ${receiptColumn},
        incurred_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8
      )
      RETURNING
        id,
        trip_id,
        driver_id,
        expense_type,
        amount,
        currency,
        ${descriptionColumn} AS description,
        ${receiptColumn} AS receipt_photo_url,
        incurred_at,
        created_at${hasUpdatedAt ? ", updated_at" : ""}
    `;

    const values = [
      tripId,
      driverIdValue,
      expenseTypeValue,
      amountNumber,
      currencyValue,
      description || null,
      receipt_photo_url || null,
      incurredAtValue,
    ];

    const result = await pool.query(insertQuery, values);
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error in POST /api/trips/:id/expenses:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
  }
);

router.get(
  "/:id/expenses",
  requireRoles(["driver", "hauler", "shipper"]),
  async (req: Request, res: Response) => {
  try {
    const tripId = getTripIdParam(req);
    if (tripId === null) {
      return res.status(400).json({ message: "Invalid trip id" });
    }

    const { descriptionColumn, receiptColumn, hasUpdatedAt } = await getExpenseColumnProfile();

    const result = await pool.query(
      `
      SELECT
        id,
        trip_id,
        driver_id,
        expense_type,
        amount,
        currency,
        ${descriptionColumn} AS description,
        ${receiptColumn} AS receipt_photo_url,
        incurred_at,
        created_at${hasUpdatedAt ? ", updated_at" : ""}
      FROM trip_expenses
      WHERE trip_id = $1
      ORDER BY incurred_at DESC NULLS LAST, created_at DESC
    `,
      [tripId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error("Error in GET /api/trips/:id/expenses:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
  }
);

export default router;
