import { pool } from "../config/database";

async function getUserName(userId: number) {
  const result = await pool.query(
    "SELECT full_name FROM app_users WHERE id = $1",
    [userId]
  );
  return result.rows[0]?.full_name || null;
}

export async function ensureShipperProfile(userId: number) {
  const existing = await pool.query(
    "SELECT id FROM shippers WHERE user_id = $1 LIMIT 1",
    [userId]
  );
  if (existing.rowCount) {
    return existing.rows[0].id as number;
  }

  const fallbackName = (await getUserName(userId)) || "LivestockWay Shipper";
  const registrationId = `SHIP-${Date.now()}`;

  const inserted = await pool.query(
    `INSERT INTO shippers (user_id, farm_name, registration_id)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, fallbackName, registrationId]
  );

  return inserted.rows[0].id as number;
}

export async function ensureHaulerProfile(userId: number) {
  const hasHaulerType = await pool.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'haulers'
        AND column_name = 'hauler_type'
      LIMIT 1
    `
  );
  const haulerTypeAvailable = hasHaulerType.rowCount > 0;
  const existing = await pool.query(
    haulerTypeAvailable
      ? "SELECT id, hauler_type FROM haulers WHERE user_id = $1 LIMIT 1"
      : "SELECT id FROM haulers WHERE user_id = $1 LIMIT 1",
    [userId]
  );
  if (existing.rowCount) {
    const row = existing.rows[0] as { id: number; hauler_type?: string | null };
    if (haulerTypeAvailable && !row.hauler_type) {
      await pool.query(
        "UPDATE haulers SET hauler_type = 'company' WHERE id = $1",
        [row.id]
      );
    }
    return row.id as number;
  }

  const fallbackName = (await getUserName(userId)) || "LivestockWay Hauler";
  const dotNumber = `DOT-${Date.now()}`;
  const accountModeResult = await pool.query(
    "SELECT account_mode FROM app_users WHERE id = $1",
    [userId]
  );
  const accountMode = (accountModeResult.rows[0]?.account_mode ?? "COMPANY").toString().toLowerCase();
  const haulerType = accountMode === "individual" ? "individual" : "company";
  const inserted = haulerTypeAvailable
    ? await pool.query(
        `INSERT INTO haulers (user_id, legal_name, dot_number, hauler_type)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [userId, fallbackName, dotNumber, haulerType]
      )
    : await pool.query(
        `INSERT INTO haulers (user_id, legal_name, dot_number)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [userId, fallbackName, dotNumber]
      );

  return inserted.rows[0].id as number;
}

export async function ensureStakeholderProfile(userId: number) {
  const existing = await pool.query(
    "SELECT id FROM stakeholders WHERE user_id = $1 LIMIT 1",
    [userId]
  );
  if (existing.rowCount) {
    return existing.rows[0].id as number;
  }

  const fallbackName = (await getUserName(userId)) || "LivestockWay Service Provider";
  const inserted = await pool.query(
    `INSERT INTO stakeholders (user_id, service_type, company_name)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, "general", fallbackName]
  );

  return inserted.rows[0].id as number;
}
