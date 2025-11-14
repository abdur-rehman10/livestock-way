import { Request, Response } from "express";
import { pool } from "../config/database";

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
  } catch (error) {
    console.error("Error creating trip message:", error);
    res.status(500).json({ error: "Failed to create trip message" });
  }
};
