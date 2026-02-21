import { Request, Response } from "express";
import { pool } from "../config/database";
import { notifyNewMessage } from "../services/notificationEmailService";

export const getTripMessagesByLoad = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tripId = Number(id);

    if (!tripId || Number.isNaN(tripId)) {
      return res.status(400).json({ error: "Invalid trip/load id" });
    }

    const { rows } = await pool.query(
      `
      SELECT id, trip_id, sender, message, created_at
      FROM trip_messages
      WHERE trip_id = $1
      ORDER BY created_at ASC
      `,
      [tripId]
    );

    res.json(rows);
  } catch (error) {
    console.error("Error fetching trip messages:", error);
    res.status(500).json({ error: "Failed to fetch trip messages" });
  }
};

export const createTripMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tripId = Number(id);

    if (!tripId || Number.isNaN(tripId)) {
      return res.status(400).json({ error: "Invalid trip/load id" });
    }

    const { sender, message } = req.body;

    if (!sender || !message) {
      return res
        .status(400)
        .json({ error: "sender and message are required" });
    }

    if (!["shipper", "hauler"].includes(sender)) {
      return res
        .status(400)
        .json({ error: "sender must be 'shipper' or 'hauler' in Phase-1" });
    }

    const { rows } = await pool.query(
      `
      INSERT INTO trip_messages (trip_id, sender, message)
      VALUES ($1, $2, $3)
      RETURNING id, trip_id, sender, message, created_at
      `,
      [tripId, sender, message]
    );

    res.status(201).json(rows[0]);

    // Email notify the other party on the trip
    (async () => {
      try {
        const trip = await pool.query(
          "SELECT t.hauler_id, l.shipper_id FROM trips t JOIN loads l ON l.id = t.load_id WHERE t.id = $1",
          [tripId]
        );
        if (!trip.rowCount) return;
        const { hauler_id, shipper_id } = trip.rows[0];
        const recipientProfileTable = sender === "shipper" ? "haulers" : "shippers";
        const recipientProfileId = sender === "shipper" ? hauler_id : shipper_id;
        const recipientUser = await pool.query(`SELECT user_id FROM ${recipientProfileTable} WHERE id = $1`, [recipientProfileId]);
        if (recipientUser.rows[0]?.user_id) {
          notifyNewMessage({ recipientUserId: recipientUser.rows[0].user_id, threadType: "trip", messagePreview: message });
        }
      } catch {}
    })();
  } catch (error) {
    console.error("Error creating trip message:", error);
    res.status(500).json({ error: "Failed to create trip message" });
  }
};
