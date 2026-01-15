import { pool } from "../config/database";

export interface BuySellApplicationThread {
  id: number;
  listing_id: number;
  application_id: number;
  listing_poster_user_id: number;
  applicant_user_id: number;
  is_active: boolean;
  first_message_sent: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  listing_title?: string;
  applicant_name?: string;
  listing_poster_name?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  listing_poster_last_read_at?: string | null;
  applicant_last_read_at?: string | null;
}

export interface BuySellApplicationMessage {
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

function mapThreadRow(row: any): BuySellApplicationThread {
  return {
    id: Number(row.id),
    listing_id: Number(row.listing_id),
    application_id: Number(row.application_id),
    listing_poster_user_id: Number(row.listing_poster_user_id),
    applicant_user_id: Number(row.applicant_user_id),
    is_active: Boolean(row.is_active),
    first_message_sent: Boolean(row.first_message_sent),
    created_at: row.created_at,
    updated_at: row.updated_at,
    listing_title: row.listing_title,
    applicant_name: row.applicant_name,
    listing_poster_name: row.listing_poster_name,
    last_message: row.last_message,
    last_message_at: row.last_message_at,
    unread_count: row.unread_count ? Number(row.unread_count) : 0,
    listing_poster_last_read_at: row.listing_poster_last_read_at,
    applicant_last_read_at: row.applicant_last_read_at,
  };
}

function mapMessageRow(row: any): BuySellApplicationMessage {
  return {
    id: Number(row.id),
    thread_id: Number(row.thread_id),
    sender_user_id: Number(row.sender_user_id),
    sender_role: row.sender_role,
    message: row.message,
    attachments: row.attachments || [],
    created_at: row.created_at,
    sender_name: row.sender_name,
  };
}

// Get threads for a user (either as listing poster or applicant)
export async function getUserBuySellThreads(userId: number): Promise<BuySellApplicationThread[]> {
  const result = await pool.query(
    `
    SELECT 
      t.*,
      l.title as listing_title,
      app.applicant_name,
      u1.full_name as listing_poster_name,
      (
        SELECT m.message 
        FROM buy_sell_application_messages m 
        WHERE m.thread_id = t.id 
        ORDER BY m.created_at DESC 
        LIMIT 1
      ) as last_message,
      (
        SELECT m.created_at 
        FROM buy_sell_application_messages m 
        WHERE m.thread_id = t.id 
        ORDER BY m.created_at DESC 
        LIMIT 1
      ) as last_message_at,
      (
        SELECT COUNT(*)::INTEGER
        FROM buy_sell_application_messages m
        WHERE m.thread_id = t.id
          AND m.sender_user_id != $1
          AND (
            (t.listing_poster_user_id = $1 AND (t.listing_poster_last_read_at IS NULL OR m.created_at > t.listing_poster_last_read_at))
            OR (t.applicant_user_id = $1 AND (t.applicant_last_read_at IS NULL OR m.created_at > t.applicant_last_read_at))
          )
      ) as unread_count
    FROM buy_sell_application_threads t
    INNER JOIN buy_and_sell_listings l ON l.id = t.listing_id
    INNER JOIN buy_and_sell_applications app ON app.id = t.application_id
    INNER JOIN app_users u1 ON u1.id = t.listing_poster_user_id
    WHERE (t.listing_poster_user_id = $1 OR t.applicant_user_id = $1)
      AND t.is_active = TRUE
    ORDER BY 
      CASE 
        WHEN (
          SELECT m.created_at 
          FROM buy_sell_application_messages m 
          WHERE m.thread_id = t.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) IS NOT NULL 
        THEN (
          SELECT m.created_at 
          FROM buy_sell_application_messages m 
          WHERE m.thread_id = t.id 
          ORDER BY m.created_at DESC 
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
export async function getBuySellThreadById(threadId: number, userId: number): Promise<BuySellApplicationThread | null> {
  const result = await pool.query(
    `
    SELECT 
      t.*,
      l.title as listing_title,
      app.applicant_name,
      u1.full_name as listing_poster_name
    FROM buy_sell_application_threads t
    INNER JOIN buy_and_sell_listings l ON l.id = t.listing_id
    INNER JOIN buy_and_sell_applications app ON app.id = t.application_id
    INNER JOIN app_users u1 ON u1.id = t.listing_poster_user_id
    WHERE t.id = $1 
      AND (t.listing_poster_user_id = $2 OR t.applicant_user_id = $2)
      AND t.is_active = TRUE
    `,
    [threadId, userId]
  );

  if ((result.rowCount ?? 0) === 0) {
    return null;
  }

  return mapThreadRow(result.rows[0]);
}

// Get thread by listing and application
export async function getBuySellThreadByListingAndApplication(
  listingId: number,
  applicationId: number,
  userId: number
): Promise<BuySellApplicationThread | null> {
  const result = await pool.query(
    `
    SELECT 
      t.*,
      l.title as listing_title,
      app.applicant_name,
      u1.full_name as listing_poster_name
    FROM buy_sell_application_threads t
    INNER JOIN buy_and_sell_listings l ON l.id = t.listing_id
    INNER JOIN buy_and_sell_applications app ON app.id = t.application_id
    INNER JOIN app_users u1 ON u1.id = t.listing_poster_user_id
    WHERE t.listing_id = $1 
      AND t.application_id = $2
      AND (t.listing_poster_user_id = $3 OR t.applicant_user_id = $3)
      AND t.is_active = TRUE
    `,
    [listingId, applicationId, userId]
  );

  if ((result.rowCount ?? 0) === 0) {
    return null;
  }

  return mapThreadRow(result.rows[0]);
}

// Get messages for a thread
export async function getBuySellThreadMessages(threadId: number, userId: number): Promise<BuySellApplicationMessage[]> {
  // First verify user has access to this thread and update last_read_at
  const threadCheck = await pool.query(
    "SELECT listing_poster_user_id, applicant_user_id FROM buy_sell_application_threads WHERE id = $1 AND (listing_poster_user_id = $2 OR applicant_user_id = $2) AND is_active = TRUE",
    [threadId, userId]
  );

  if ((threadCheck.rowCount ?? 0) === 0) {
    throw new Error("Thread not found or access denied");
  }

  const thread = threadCheck.rows[0];
  const isListingPoster = Number(thread.listing_poster_user_id) === userId;

  // Update last_read_at when user views messages
  if (isListingPoster) {
    await pool.query(
      "UPDATE buy_sell_application_threads SET listing_poster_last_read_at = NOW() WHERE id = $1",
      [threadId]
    );
  } else {
    await pool.query(
      "UPDATE buy_sell_application_threads SET applicant_last_read_at = NOW() WHERE id = $1",
      [threadId]
    );
  }

  const result = await pool.query(
    `
    SELECT 
      m.*,
      u.full_name as sender_name
    FROM buy_sell_application_messages m
    INNER JOIN app_users u ON u.id = m.sender_user_id
    WHERE m.thread_id = $1
    ORDER BY m.created_at ASC
    `,
    [threadId]
  );

  return result.rows.map(mapMessageRow);
}

// Send a message in a thread
export async function sendBuySellThreadMessage(
  threadId: number,
  senderUserId: number,
  senderRole: string,
  message: string,
  attachments?: any[]
): Promise<BuySellApplicationMessage> {
  // Verify user has access and can send message
  const thread = await pool.query(
    `
    SELECT 
      listing_poster_user_id,
      applicant_user_id,
      first_message_sent
    FROM buy_sell_application_threads
    WHERE id = $1 AND is_active = TRUE
    `,
    [threadId]
  );

  if ((thread.rowCount ?? 0) === 0) {
    throw new Error("Thread not found");
  }

  const threadData = thread.rows[0];
  const isListingPoster = Number(threadData.listing_poster_user_id) === senderUserId;
  const isApplicant = Number(threadData.applicant_user_id) === senderUserId;

  if (!isListingPoster && !isApplicant) {
    throw new Error("Access denied");
  }

  // Check if first message can be sent
  if (!threadData.first_message_sent && !isListingPoster) {
    throw new Error("Only the listing poster can send the first message");
  }

  // Insert message
  const result = await pool.query(
    `
    INSERT INTO buy_sell_application_messages (
      thread_id,
      sender_user_id,
      sender_role,
      message,
      attachments
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [threadId, senderUserId, senderRole.toLowerCase(), message, attachments || []]
  );

  const messageRow = result.rows[0];

  // Get sender name
  const senderResult = await pool.query("SELECT full_name FROM app_users WHERE id = $1", [senderUserId]);
  const senderName = senderResult.rows[0]?.full_name || "";

  return mapMessageRow({ ...messageRow, sender_name: senderName });
}
