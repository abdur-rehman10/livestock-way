import { pool } from "../config/database";

export interface JobApplicationThread {
  id: number;
  job_id: number;
  application_id: number;
  job_poster_user_id: number;
  applicant_user_id: number;
  is_active: boolean;
  first_message_sent: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  job_title?: string;
  applicant_name?: string;
  job_poster_name?: string;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  job_poster_last_read_at?: string | null;
  applicant_last_read_at?: string | null;
}

export interface JobApplicationMessage {
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

function mapThreadRow(row: any): JobApplicationThread {
  return {
    id: Number(row.id),
    job_id: Number(row.job_id),
    application_id: Number(row.application_id),
    job_poster_user_id: Number(row.job_poster_user_id),
    applicant_user_id: Number(row.applicant_user_id),
    is_active: Boolean(row.is_active),
    first_message_sent: Boolean(row.first_message_sent),
    created_at: row.created_at,
    updated_at: row.updated_at,
    job_title: row.job_title,
    applicant_name: row.applicant_name,
    job_poster_name: row.job_poster_name,
    last_message: row.last_message,
    last_message_at: row.last_message_at,
    unread_count: row.unread_count ? Number(row.unread_count) : 0,
    job_poster_last_read_at: row.job_poster_last_read_at,
    applicant_last_read_at: row.applicant_last_read_at,
  };
}

function mapMessageRow(row: any): JobApplicationMessage {
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

// Get threads for a user (either as job poster or applicant)
export async function getUserJobThreads(userId: number): Promise<JobApplicationThread[]> {
  const result = await pool.query(
    `
    SELECT 
      t.*,
      j.title as job_title,
      app.applicant_name,
      u1.full_name as job_poster_name,
      (
        SELECT m.message 
        FROM job_application_messages m 
        WHERE m.thread_id = t.id 
        ORDER BY m.created_at DESC 
        LIMIT 1
      ) as last_message,
      (
        SELECT m.created_at 
        FROM job_application_messages m 
        WHERE m.thread_id = t.id 
        ORDER BY m.created_at DESC 
        LIMIT 1
      ) as last_message_at,
      (
        SELECT COUNT(*)::INTEGER
        FROM job_application_messages m
        WHERE m.thread_id = t.id
          AND m.sender_user_id != $1
          AND (
            (t.job_poster_user_id = $1 AND (t.job_poster_last_read_at IS NULL OR m.created_at > t.job_poster_last_read_at))
            OR (t.applicant_user_id = $1 AND (t.applicant_last_read_at IS NULL OR m.created_at > t.applicant_last_read_at))
          )
      ) as unread_count
    FROM job_application_threads t
    INNER JOIN job_listings j ON j.id = t.job_id
    INNER JOIN job_applications app ON app.id = t.application_id
    INNER JOIN app_users u1 ON u1.id = t.job_poster_user_id
    WHERE (t.job_poster_user_id = $1 OR t.applicant_user_id = $1)
      AND t.is_active = TRUE
    ORDER BY 
      CASE 
        WHEN (
          SELECT m.created_at 
          FROM job_application_messages m 
          WHERE m.thread_id = t.id 
          ORDER BY m.created_at DESC 
          LIMIT 1
        ) IS NOT NULL 
        THEN (
          SELECT m.created_at 
          FROM job_application_messages m 
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
export async function getJobThreadById(threadId: number, userId: number): Promise<JobApplicationThread | null> {
  const result = await pool.query(
    `
    SELECT 
      t.*,
      j.title as job_title,
      app.applicant_name,
      u1.full_name as job_poster_name
    FROM job_application_threads t
    INNER JOIN job_listings j ON j.id = t.job_id
    INNER JOIN job_applications app ON app.id = t.application_id
    INNER JOIN app_users u1 ON u1.id = t.job_poster_user_id
    WHERE t.id = $1 
      AND (t.job_poster_user_id = $2 OR t.applicant_user_id = $2)
      AND t.is_active = TRUE
    `,
    [threadId, userId]
  );

  if ((result.rowCount ?? 0) === 0) {
    return null;
  }

  return mapThreadRow(result.rows[0]);
}

// Get thread by job and application
export async function getThreadByJobAndApplication(
  jobId: number,
  applicationId: number,
  userId: number
): Promise<JobApplicationThread | null> {
  const result = await pool.query(
    `
    SELECT 
      t.*,
      j.title as job_title,
      app.applicant_name,
      u1.full_name as job_poster_name
    FROM job_application_threads t
    INNER JOIN job_listings j ON j.id = t.job_id
    INNER JOIN job_applications app ON app.id = t.application_id
    INNER JOIN app_users u1 ON u1.id = t.job_poster_user_id
    WHERE t.job_id = $1 
      AND t.application_id = $2
      AND (t.job_poster_user_id = $3 OR t.applicant_user_id = $3)
      AND t.is_active = TRUE
    `,
    [jobId, applicationId, userId]
  );

  if ((result.rowCount ?? 0) === 0) {
    return null;
  }

  return mapThreadRow(result.rows[0]);
}

// Get messages for a thread
export async function getThreadMessages(threadId: number, userId: number): Promise<JobApplicationMessage[]> {
  // First verify user has access to this thread and update last_read_at
  const threadCheck = await pool.query(
    "SELECT job_poster_user_id, applicant_user_id FROM job_application_threads WHERE id = $1 AND (job_poster_user_id = $2 OR applicant_user_id = $2) AND is_active = TRUE",
    [threadId, userId]
  );

  if ((threadCheck.rowCount ?? 0) === 0) {
    throw new Error("Thread not found or access denied");
  }

  const thread = threadCheck.rows[0];
  const isJobPoster = Number(thread.job_poster_user_id) === userId;

  // Update last_read_at when user views messages
  if (isJobPoster) {
    await pool.query(
      "UPDATE job_application_threads SET job_poster_last_read_at = NOW() WHERE id = $1",
      [threadId]
    );
  } else {
    await pool.query(
      "UPDATE job_application_threads SET applicant_last_read_at = NOW() WHERE id = $1",
      [threadId]
    );
  }

  const result = await pool.query(
    `
    SELECT 
      m.*,
      u.full_name as sender_name
    FROM job_application_messages m
    INNER JOIN app_users u ON u.id = m.sender_user_id
    WHERE m.thread_id = $1
    ORDER BY m.created_at ASC
    `,
    [threadId]
  );

  return result.rows.map(mapMessageRow);
}

// Send a message in a thread
export async function sendThreadMessage(
  threadId: number,
  senderUserId: number,
  senderRole: string,
  message: string,
  attachments?: any[]
): Promise<JobApplicationMessage> {
  // Verify user has access and can send message
  const thread = await pool.query(
    `
    SELECT 
      job_poster_user_id,
      applicant_user_id,
      first_message_sent
    FROM job_application_threads
    WHERE id = $1 AND is_active = TRUE
    `,
    [threadId]
  );

  if ((thread.rowCount ?? 0) === 0) {
    throw new Error("Thread not found");
  }

  const threadData = thread.rows[0];
  const isJobPoster = Number(threadData.job_poster_user_id) === senderUserId;
  const isApplicant = Number(threadData.applicant_user_id) === senderUserId;

  if (!isJobPoster && !isApplicant) {
    throw new Error("Access denied");
  }

  // Check if first message can be sent
  if (!threadData.first_message_sent && !isJobPoster) {
    throw new Error("Only the job poster can send the first message");
  }

  // Insert message
  const result = await pool.query(
    `
    INSERT INTO job_application_messages (
      thread_id,
      sender_user_id,
      sender_role,
      message,
      attachments,
      created_at
    )
    VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING *
    `,
    [threadId, senderUserId, senderRole, message, JSON.stringify(attachments || [])]
  );

  // Get sender name
  const sender = await pool.query("SELECT full_name FROM app_users WHERE id = $1", [senderUserId]);
  const messageData = mapMessageRow(result.rows[0]);
  messageData.sender_name = sender.rows[0]?.full_name || "Unknown";

  return messageData;
}
