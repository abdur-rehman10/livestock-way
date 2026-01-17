import { pool } from "../config/database";

export interface TruckBookingThread {
  id: number;
  booking_id: number;
  truck_availability_id: number;
  load_id: number;
  shipper_user_id: number;
  hauler_user_id: number;
  is_active: boolean;
  first_message_sent: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  load_title?: string;
  truck_route?: string;
  hauler_name?: string;
  shipper_name?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  shipper_last_read_at?: string | null;
  hauler_last_read_at?: string | null;
  booking_amount?: string;
  booking_currency?: string;
  booking_status?: string;
}

export interface TruckBookingMessage {
  id: number;
  thread_id: number;
  sender_user_id: number;
  sender_role: string;
  message: string;
  attachments: any[];
  created_at: string;
  // Joined data
  sender_name?: string;
}

function mapThreadRow(row: any): TruckBookingThread {
  return {
    id: Number(row.id),
    booking_id: Number(row.booking_id),
    truck_availability_id: Number(row.truck_availability_id),
    load_id: Number(row.load_id),
    shipper_user_id: Number(row.shipper_user_id),
    hauler_user_id: Number(row.hauler_user_id),
    is_active: Boolean(row.is_active),
    first_message_sent: Boolean(row.first_message_sent),
    created_at: row.created_at,
    updated_at: row.updated_at,
    load_title: row.load_title,
    truck_route: row.truck_route,
    hauler_name: row.hauler_name,
    shipper_name: row.shipper_name,
    last_message: row.last_message,
    last_message_at: row.last_message_at,
    unread_count: row.unread_count ? Number(row.unread_count) : 0,
    shipper_last_read_at: row.shipper_last_read_at,
    hauler_last_read_at: row.hauler_last_read_at,
    booking_amount: row.booking_amount,
    booking_currency: row.booking_currency,
    booking_status: row.booking_status,
  };
}

function mapMessageRow(row: any): TruckBookingMessage {
  // Ensure message text is never empty - if it is, something went wrong
  const messageText = (row.text || row.message || "").trim();
  if (!messageText) {
    console.error("Warning: Attempted to map message row with empty text", row);
  }
  return {
    id: Number(row.id),
    thread_id: Number(row.thread_id),
    sender_user_id: Number(row.sender_user_id),
    sender_role: row.sender_role,
    message: messageText || "[Empty message - please contact support]",
    attachments: row.attachments ? (typeof row.attachments === 'string' ? JSON.parse(row.attachments) : row.attachments) : [],
    created_at: row.created_at,
    sender_name: row.sender_name,
  };
}

// Get threads for a user (either as shipper or hauler)
export async function getUserTruckBookingThreads(userId: number): Promise<TruckBookingThread[]> {
  const result = await pool.query(
    `
    SELECT 
      t.*,
      l.pickup_location_text || ' → ' || l.dropoff_location_text as load_title,
      ta.origin_location_text || COALESCE(' → ' || ta.destination_location_text, '') as truck_route,
      h.legal_name as hauler_name,
      s.farm_name as shipper_name,
      lb.offered_amount::text as booking_amount,
      lb.offered_currency as booking_currency,
      lb.status::text as booking_status,
      (
        SELECT tbm.text 
        FROM truck_booking_messages tbm 
        WHERE tbm.thread_id = t.id 
        ORDER BY tbm.created_at DESC 
        LIMIT 1
      ) as last_message,
      (
        SELECT tbm.created_at 
        FROM truck_booking_messages tbm 
        WHERE tbm.thread_id = t.id 
        ORDER BY tbm.created_at DESC 
        LIMIT 1
      ) as last_message_at,
      (
        SELECT COUNT(*)::INTEGER
        FROM truck_booking_messages tbm
        WHERE tbm.thread_id = t.id
          AND tbm.sender_user_id != $1
          AND (
            (t.shipper_user_id = $1 AND (t.shipper_last_read_at IS NULL OR tbm.created_at > t.shipper_last_read_at))
            OR (t.hauler_user_id = $1 AND (t.hauler_last_read_at IS NULL OR tbm.created_at > t.hauler_last_read_at))
          )
      ) as unread_count
    FROM truck_booking_threads t
    INNER JOIN loads l ON l.id = t.load_id
    INNER JOIN load_bookings lb ON lb.id = t.booking_id
    INNER JOIN truck_availability ta ON ta.id = t.truck_availability_id
    LEFT JOIN haulers h ON h.user_id = t.hauler_user_id
    LEFT JOIN shippers s ON s.user_id = t.shipper_user_id
    WHERE (t.shipper_user_id = $1 OR t.hauler_user_id = $1)
      AND t.is_active = TRUE
    ORDER BY 
      CASE 
        WHEN (
          SELECT tbm.created_at 
          FROM truck_booking_messages tbm 
          WHERE tbm.thread_id = t.id 
          ORDER BY tbm.created_at DESC 
          LIMIT 1
        ) IS NOT NULL 
        THEN (
          SELECT tbm.created_at 
          FROM truck_booking_messages tbm 
          WHERE tbm.thread_id = t.id 
          ORDER BY tbm.created_at DESC 
          LIMIT 1
        )
        ELSE t.updated_at
      END DESC
    `,
    [userId]
  );

  return result.rows.map(mapThreadRow);
}

// Get a specific thread by ID
export async function getTruckBookingThreadById(threadId: number, userId: number): Promise<TruckBookingThread | null> {
  const result = await pool.query(
    `
    SELECT 
      t.*,
      l.pickup_location_text || ' → ' || l.dropoff_location_text as load_title,
      ta.origin_location_text || COALESCE(' → ' || ta.destination_location_text, '') as truck_route,
      h.legal_name as hauler_name,
      s.farm_name as shipper_name,
      lb.offered_amount::text as booking_amount,
      lb.offered_currency as booking_currency,
      lb.status::text as booking_status
    FROM truck_booking_threads t
    INNER JOIN loads l ON l.id = t.load_id
    INNER JOIN load_bookings lb ON lb.id = t.booking_id
    INNER JOIN truck_availability ta ON ta.id = t.truck_availability_id
    LEFT JOIN haulers h ON h.user_id = t.hauler_user_id
    LEFT JOIN shippers s ON s.user_id = t.shipper_user_id
    WHERE t.id = $1 
      AND (t.shipper_user_id = $2 OR t.hauler_user_id = $2)
      AND t.is_active = TRUE
    `,
    [threadId, userId]
  );

  if ((result.rowCount ?? 0) === 0) {
    return null;
  }

  return mapThreadRow(result.rows[0]);
}

// Get thread by booking_id
export async function getTruckBookingThreadByBookingId(bookingId: number, userId: number): Promise<TruckBookingThread | null> {
  const result = await pool.query(
    `
    SELECT 
      t.*,
      l.pickup_location_text || ' → ' || l.dropoff_location_text as load_title,
      ta.origin_location_text || COALESCE(' → ' || ta.destination_location_text, '') as truck_route,
      h.legal_name as hauler_name,
      s.farm_name as shipper_name,
      lb.offered_amount::text as booking_amount,
      lb.offered_currency as booking_currency,
      lb.status::text as booking_status
    FROM truck_booking_threads t
    INNER JOIN loads l ON l.id = t.load_id
    INNER JOIN load_bookings lb ON lb.id = t.booking_id
    INNER JOIN truck_availability ta ON ta.id = t.truck_availability_id
    LEFT JOIN haulers h ON h.user_id = t.hauler_user_id
    LEFT JOIN shippers s ON s.user_id = t.shipper_user_id
    WHERE t.booking_id = $1 
      AND (t.shipper_user_id = $2 OR t.hauler_user_id = $2)
      AND t.is_active = TRUE
    `,
    [bookingId, userId]
  );

  if ((result.rowCount ?? 0) === 0) {
    return null;
  }

  return mapThreadRow(result.rows[0]);
}

// Get messages for a thread
export async function getTruckBookingThreadMessages(threadId: number, userId: number): Promise<TruckBookingMessage[]> {
  // First verify user has access to this thread and update last_read_at
  const threadCheck = await pool.query(
    "SELECT shipper_user_id, hauler_user_id FROM truck_booking_threads WHERE id = $1 AND (shipper_user_id = $2 OR hauler_user_id = $2) AND is_active = TRUE",
    [threadId, userId]
  );

  if ((threadCheck.rowCount ?? 0) === 0) {
    throw new Error("Thread not found or access denied");
  }

  const thread = threadCheck.rows[0];
  const isShipper = Number(thread.shipper_user_id) === userId;

  // Update last_read_at for the user
  if (isShipper) {
    await pool.query(
      "UPDATE truck_booking_threads SET shipper_last_read_at = NOW() WHERE id = $1",
      [threadId]
    );
  } else {
    await pool.query(
      "UPDATE truck_booking_threads SET hauler_last_read_at = NOW() WHERE id = $1",
      [threadId]
    );
  }

  // Get messages
  const result = await pool.query(
    `
    SELECT 
      tbm.*,
      COALESCE(u.full_name, 'User') as sender_name
    FROM truck_booking_messages tbm
    LEFT JOIN app_users u ON u.id = tbm.sender_user_id
    WHERE tbm.thread_id = $1
    ORDER BY tbm.created_at ASC
    `,
    [threadId]
  );

  return result.rows.map(mapMessageRow);
}

// Send a message in a thread
export async function sendTruckBookingThreadMessage(
  threadId: number,
  senderUserId: number,
  senderRole: string,
  message: string,
  attachments?: any[]
): Promise<TruckBookingMessage> {
  // Verify user has access and can send message
  const threadCheck = await pool.query(
    "SELECT shipper_user_id, hauler_user_id, first_message_sent FROM truck_booking_threads WHERE id = $1 AND (shipper_user_id = $2 OR hauler_user_id = $2) AND is_active = TRUE",
    [threadId, senderUserId]
  );

  if ((threadCheck.rowCount ?? 0) === 0) {
    throw new Error("Thread not found or access denied");
  }

  const thread = threadCheck.rows[0];
  const isShipper = Number(thread.shipper_user_id) === senderUserId;

  // Check if first message can be sent (only hauler can send first message)
  if (!thread.first_message_sent && isShipper) {
    throw new Error("Only the hauler can send the first message");
  }

  // Validate message is not empty after trimming
  if (!message || typeof message !== "string" || !message.trim()) {
    throw new Error("Message cannot be empty");
  }

  // Trim the message before storing
  const trimmedMessage = message.trim();

  // Insert message
  const result = await pool.query(
    `
    INSERT INTO truck_booking_messages (
      thread_id,
      booking_id,
      sender_user_id,
      sender_role,
      text,
      attachments
    )
    VALUES ($1, (SELECT booking_id FROM truck_booking_threads WHERE id = $1), $2, $3, $4, $5)
    RETURNING *
    `,
    [
      threadId,
      senderUserId,
      senderRole,
      trimmedMessage,
      JSON.stringify(attachments || []),
    ]
  );

  // Update thread's updated_at and first_message_sent (handled by trigger, but ensure it's set)
  await pool.query(
    "UPDATE truck_booking_threads SET updated_at = NOW(), first_message_sent = TRUE WHERE id = $1",
    [threadId]
  );

  // Get the message with sender name
  const messageResult = await pool.query(
    `
    SELECT 
      tbm.*,
      COALESCE(u.full_name, 'User') as sender_name
    FROM truck_booking_messages tbm
    LEFT JOIN app_users u ON u.id = tbm.sender_user_id
    WHERE tbm.id = $1
    `,
    [result.rows[0].id]
  );

  return mapMessageRow(messageResult.rows[0]);
}
