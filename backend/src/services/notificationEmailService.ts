import nodemailer from "nodemailer";
import { pool } from "../config/database";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const FROM = `"Livestockway" <${process.env.EMAIL_USER}>`;

function baseTemplate(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background-color:#f4f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f7fa;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr><td style="background:linear-gradient(135deg,#42b883 0%,#2e8b63 100%);padding:24px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Livestockway</h1>
        </td></tr>
        <tr><td style="padding:32px 40px;">${content}</td></tr>
        <tr><td style="padding:20px 40px;background-color:#f8fafb;border-top:1px solid #e8ecf0;">
          <p style="margin:0;color:#a0a8b4;font-size:11px;text-align:center;">© ${new Date().getFullYear()} Livestockway — All rights reserved.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function infoRow(label: string, value: string): string {
  return `<tr><td style="padding:4px 0;color:#8c95a0;font-size:13px;width:120px;">${label}</td><td style="padding:4px 0;color:#1a2332;font-size:13px;font-weight:500;">${value}</td></tr>`;
}

function detailsTable(rows: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;margin:16px 0 24px;">${rows}</table>`;
}

type PrefKey =
  | "new_load_posted"
  | "new_truck_posted"
  | "offer_received"
  | "new_message"
  | "contract_updates"
  | "trip_updates"
  | "payment_alerts"
  | "marketing_emails";

async function isEmailAllowed(userId: number | string, category: PrefKey): Promise<boolean> {
  try {
    const r = await pool.query(
      "SELECT email_notifications, " + category + " FROM notification_preferences WHERE user_id = $1",
      [userId]
    );
    if (!r.rowCount) return true; // no row = defaults (all true except marketing)
    const row = r.rows[0];
    if (row.email_notifications === false) return false; // master toggle off
    if (row[category] === false) return false;
    return true;
  } catch {
    return true; // on error, default to sending
  }
}

async function sendSafe(to: string, subject: string, html: string): Promise<void> {
  try {
    if (!to || !process.env.EMAIL_USER) return;
    await transporter.sendMail({ from: FROM, to, subject, html });
  } catch (err: any) {
    console.error(`[NotificationEmail] Failed to send to ${to}:`, err.message);
  }
}

async function getUserEmail(userId: number | string): Promise<{ email: string; name: string } | null> {
  try {
    const r = await pool.query("SELECT email, full_name FROM app_users WHERE id = $1", [userId]);
    if (r.rowCount && r.rows[0]?.email) return { email: r.rows[0].email, name: r.rows[0].full_name || "there" };
  } catch { /* ignore */ }
  return null;
}

async function getShipperUserId(shipperId: string | number): Promise<string | null> {
  try {
    const r = await pool.query("SELECT user_id FROM shippers WHERE id = $1", [shipperId]);
    return r.rows[0]?.user_id ? String(r.rows[0].user_id) : null;
  } catch { return null; }
}

async function getHaulerUserId(haulerId: string | number): Promise<string | null> {
  try {
    const r = await pool.query("SELECT user_id FROM haulers WHERE id = $1", [haulerId]);
    return r.rows[0]?.user_id ? String(r.rows[0].user_id) : null;
  } catch { return null; }
}

// ─── 1. New Load Posted → notify haulers ───
export async function notifyNewLoadPosted(load: {
  id: number | string; title?: string; species?: string; quantity?: number;
  pickup_location?: string; delivery_location?: string; price_offer?: number;
}, posterUserId: number | string): Promise<void> {
  const haulers = await pool.query(
    "SELECT u.id, u.email, u.full_name FROM app_users u WHERE u.user_type = 'hauler' AND u.id != $1 AND u.email IS NOT NULL",
    [posterUserId]
  );
  if (!haulers.rowCount) return;

  const subject = `New Load Available: ${load.species || "Livestock"} — #${load.id}`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#1a2332;font-size:20px;">New Load on the Board</h2>
    <p style="margin:0 0 16px;color:#5a6577;font-size:14px;">A new load has been posted that may match your routes.</p>
    ${detailsTable(
      infoRow("Load #", String(load.id)) +
      (load.species ? infoRow("Species", `${load.species}${load.quantity ? ` × ${load.quantity}` : ""}`) : "") +
      (load.pickup_location ? infoRow("Pickup", load.pickup_location) : "") +
      (load.delivery_location ? infoRow("Delivery", load.delivery_location) : "") +
      (load.price_offer ? infoRow("Price", `$${Number(load.price_offer).toLocaleString()}`) : "")
    )}
    <p style="margin:0;color:#5a6577;font-size:13px;">Log in to Livestockway to view details and place your offer.</p>
  `);

  for (const row of haulers.rows) {
    if (await isEmailAllowed(row.id, "new_load_posted")) {
      sendSafe(row.email, subject, html);
    }
  }
}

// ─── 2. New Truck Posted → notify shippers ───
export async function notifyNewTruckPosted(truck: {
  id: number | string; origin_location_text?: string | null; destination_location_text?: string | null;
  available_from?: string | null; capacity_headcount?: number | null;
}, posterUserId: number | string): Promise<void> {
  const shippers = await pool.query(
    "SELECT u.id, u.email, u.full_name FROM app_users u WHERE u.user_type = 'shipper' AND u.id != $1 AND u.email IS NOT NULL",
    [posterUserId]
  );
  if (!shippers.rowCount) return;

  const subject = `New Truck Available on TruckBoard — #${truck.id}`;
  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#1a2332;font-size:20px;">New Truck Listed</h2>
    <p style="margin:0 0 16px;color:#5a6577;font-size:14px;">A hauler has posted a new truck that may work for your loads.</p>
    ${detailsTable(
      infoRow("Listing #", String(truck.id)) +
      (truck.origin_location_text ? infoRow("Origin", truck.origin_location_text) : "") +
      (truck.destination_location_text ? infoRow("Destination", truck.destination_location_text) : "") +
      (truck.available_from ? infoRow("Available", new Date(truck.available_from).toLocaleDateString()) : "") +
      (truck.capacity_headcount ? infoRow("Capacity", `${truck.capacity_headcount} head`) : "")
    )}
    <p style="margin:0;color:#5a6577;font-size:13px;">Log in to Livestockway to book this truck.</p>
  `);

  for (const row of shippers.rows) {
    if (await isEmailAllowed(row.id, "new_truck_posted")) {
      sendSafe(row.email, subject, html);
    }
  }
}

// ─── 3. New Offer/Request on load or truck ───
export async function notifyNewOfferOnLoad(offer: {
  id: number | string; load_id: number | string; offered_amount?: number | string | null; currency?: string | null;
}, loadShipperId: string | number): Promise<void> {
  const shipperUserId = await getShipperUserId(loadShipperId);
  if (!shipperUserId) return;
  if (!(await isEmailAllowed(shipperUserId, "offer_received"))) return;
  const user = await getUserEmail(shipperUserId);
  if (!user) return;

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#1a2332;font-size:20px;">New Offer on Your Load</h2>
    <p style="margin:0 0 16px;color:#5a6577;font-size:14px;">Hi ${user.name}, a hauler has placed an offer on your load #${offer.load_id}.</p>
    ${detailsTable(
      infoRow("Load #", String(offer.load_id)) +
      infoRow("Offer #", String(offer.id)) +
      (offer.offered_amount ? infoRow("Amount", `$${Number(offer.offered_amount).toLocaleString()} ${offer.currency || "USD"}`) : "")
    )}
    <p style="margin:0;color:#5a6577;font-size:13px;">Log in to review and respond to this offer.</p>
  `);

  sendSafe(user.email, `New Offer on Load #${offer.load_id}`, html);
}

export async function notifyNewBookingOnTruck(booking: {
  id: number | string; truck_availability_id?: number | string | null; offered_amount?: number | string | null;
}, haulerIdStr: string | number): Promise<void> {
  const haulerUserId = await getHaulerUserId(haulerIdStr);
  if (!haulerUserId) return;
  if (!(await isEmailAllowed(haulerUserId, "offer_received"))) return;
  const user = await getUserEmail(haulerUserId);
  if (!user) return;

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#1a2332;font-size:20px;">New Booking Request</h2>
    <p style="margin:0 0 16px;color:#5a6577;font-size:14px;">Hi ${user.name}, a shipper has requested to book your truck.</p>
    ${detailsTable(
      infoRow("Booking #", String(booking.id)) +
      (booking.offered_amount ? infoRow("Amount", `$${Number(booking.offered_amount).toLocaleString()}`) : "")
    )}
    <p style="margin:0;color:#5a6577;font-size:13px;">Log in to review and respond to this booking request.</p>
  `);

  sendSafe(user.email, `New Booking Request #${booking.id}`, html);
}

// ─── 4. New Message Received ───
export async function notifyNewMessage(params: {
  recipientUserId: number | string;
  senderName?: string;
  threadType: string;
  referenceId?: string | number;
  messagePreview?: string;
}): Promise<void> {
  if (!(await isEmailAllowed(params.recipientUserId, "new_message"))) return;
  const user = await getUserEmail(params.recipientUserId);
  if (!user) return;

  const typeLabels: Record<string, string> = {
    "load-offer": "Load Offer", "truck-booking": "Truck Booking", "truck-chat": "Truck Chat",
    "trip": "Trip", "job": "Job", "buy-sell": "Buy & Sell", "resources": "Resource",
  };
  const label = typeLabels[params.threadType] || "Message";
  const preview = params.messagePreview ? params.messagePreview.slice(0, 100) : "";

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#1a2332;font-size:20px;">New ${label} Message</h2>
    <p style="margin:0 0 16px;color:#5a6577;font-size:14px;">Hi ${user.name}, you have a new message${params.senderName ? ` from ${params.senderName}` : ""}.</p>
    ${preview ? `<div style="background:#f0faf5;border-left:3px solid #42b883;padding:12px 16px;border-radius:0 8px 8px 0;margin:0 0 16px;">
      <p style="margin:0;color:#1a2332;font-size:14px;font-style:italic;">"${preview}${params.messagePreview && params.messagePreview.length > 100 ? "…" : ""}"</p>
    </div>` : ""}
    <p style="margin:0;color:#5a6577;font-size:13px;">Log in to Livestockway to reply.</p>
  `);

  sendSafe(user.email, `New ${label} Message on Livestockway`, html);
}

// ─── 5. Contract Created → notify hauler ───
export async function notifyContractCreated(contract: {
  id: number | string; load_id?: number | string | null; price_amount?: number | string | null;
  hauler_id: number | string;
}): Promise<void> {
  const haulerUserId = await getHaulerUserId(contract.hauler_id);
  if (!haulerUserId) return;
  if (!(await isEmailAllowed(haulerUserId, "contract_updates"))) return;
  const user = await getUserEmail(haulerUserId);
  if (!user) return;

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#1a2332;font-size:20px;">Contract Created</h2>
    <p style="margin:0 0 16px;color:#5a6577;font-size:14px;">Hi ${user.name}, a contract has been created for you to review.</p>
    ${detailsTable(
      infoRow("Contract #", String(contract.id)) +
      (contract.load_id ? infoRow("Load #", String(contract.load_id)) : "") +
      (contract.price_amount ? infoRow("Amount", `$${Number(contract.price_amount).toLocaleString()}`) : "")
    )}
    <p style="margin:0;color:#5a6577;font-size:13px;">Log in to review and accept the contract.</p>
  `);

  sendSafe(user.email, `Contract #${contract.id} Created — Review Required`, html);
}

// ─── 6. Contract Accepted → notify shipper ───
export async function notifyContractAccepted(contract: {
  id: number | string; load_id?: number | string | null; price_amount?: number | string | null;
  shipper_id: number | string; hauler_id: number | string;
}): Promise<void> {
  const shipperUserId = await getShipperUserId(contract.shipper_id);
  if (!shipperUserId) return;
  if (!(await isEmailAllowed(shipperUserId, "contract_updates"))) return;
  const user = await getUserEmail(shipperUserId);
  if (!user) return;

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#1a2332;font-size:20px;">Contract Accepted!</h2>
    <p style="margin:0 0 16px;color:#5a6577;font-size:14px;">Hi ${user.name}, great news — the hauler has accepted your contract.</p>
    ${detailsTable(
      infoRow("Contract #", String(contract.id)) +
      (contract.load_id ? infoRow("Load #", String(contract.load_id)) : "") +
      (contract.price_amount ? infoRow("Amount", `$${Number(contract.price_amount).toLocaleString()}`) : "")
    )}
    <p style="margin:0;color:#5a6577;font-size:13px;">A trip will be created shortly. Log in for details.</p>
  `);

  sendSafe(user.email, `Contract #${contract.id} Accepted`, html);
}

// ─── 7. Trip Created ───
export async function notifyTripCreated(trip: {
  id: number | string; load_id?: number | string | null; status?: string | null;
}, shipperUserId: number | string, haulerUserId: number | string): Promise<void> {
  const html = (name: string) => baseTemplate(`
    <h2 style="margin:0 0 8px;color:#1a2332;font-size:20px;">Trip Created</h2>
    <p style="margin:0 0 16px;color:#5a6577;font-size:14px;">Hi ${name}, a trip has been created.</p>
    ${detailsTable(
      infoRow("Trip #", String(trip.id)) +
      (trip.load_id ? infoRow("Load #", String(trip.load_id)) : "")
    )}
    <p style="margin:0;color:#5a6577;font-size:13px;">Log in to Livestockway to view trip details.</p>
  `);

  if (await isEmailAllowed(shipperUserId, "trip_updates")) {
    const shipper = await getUserEmail(shipperUserId);
    if (shipper) sendSafe(shipper.email, `Trip #${trip.id} Created`, html(shipper.name));
  }
  if (await isEmailAllowed(haulerUserId, "trip_updates")) {
    const hauler = await getUserEmail(haulerUserId);
    if (hauler) sendSafe(hauler.email, `Trip #${trip.id} Created`, html(hauler.name));
  }
}

// ─── 8. Trip Started ───
export async function notifyTripStarted(trip: {
  id: number | string; load_id?: number | string | null;
}, shipperUserId: number | string): Promise<void> {
  if (!(await isEmailAllowed(shipperUserId, "trip_updates"))) return;
  const user = await getUserEmail(shipperUserId);
  if (!user) return;

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#1a2332;font-size:20px;">Trip In Progress</h2>
    <p style="margin:0 0 16px;color:#5a6577;font-size:14px;">Hi ${user.name}, your trip #${trip.id} is now in progress. The hauler has started the route.</p>
    ${detailsTable(
      infoRow("Trip #", String(trip.id)) +
      (trip.load_id ? infoRow("Load #", String(trip.load_id)) : "")
    )}
    <p style="margin:0;color:#5a6577;font-size:13px;">Log in to track the trip in real time.</p>
  `);

  sendSafe(user.email, `Trip #${trip.id} Started`, html);
}

// ─── 9. Driver Marks Pickup ───
export async function notifyPickupCompleted(params: {
  tripId: number | string; loadId: number | string; pickedAt: string;
}, shipperUserId: number | string): Promise<void> {
  if (!(await isEmailAllowed(shipperUserId, "trip_updates"))) return;
  const user = await getUserEmail(shipperUserId);
  if (!user) return;

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#1a2332;font-size:20px;">Pickup Completed</h2>
    <p style="margin:0 0 16px;color:#5a6577;font-size:14px;">Hi ${user.name}, the hauler has picked up load #${params.loadId} and is on the way.</p>
    ${detailsTable(
      infoRow("Trip #", String(params.tripId)) +
      infoRow("Load #", String(params.loadId)) +
      infoRow("Picked Up", new Date(params.pickedAt).toLocaleString())
    )}
    <p style="margin:0;color:#5a6577;font-size:13px;">Log in to track the delivery.</p>
  `);

  sendSafe(user.email, `Load #${params.loadId} Picked Up`, html);
}

// ─── 10. Driver Confirms Delivery ───
export async function notifyDeliveryCompleted(params: {
  tripId: number | string; loadId?: number | string | null;
}, recipientUserId: number | string, recipientRole: "shipper" | "hauler"): Promise<void> {
  if (!(await isEmailAllowed(recipientUserId, "trip_updates"))) return;
  const user = await getUserEmail(recipientUserId);
  if (!user) return;

  const isShipper = recipientRole === "shipper";
  const heading = isShipper ? "Delivery Completed" : "Delivery Confirmed by Shipper";
  const body = isShipper
    ? `Hi ${user.name}, the hauler has marked trip #${params.tripId} as delivered. Please confirm delivery.`
    : `Hi ${user.name}, the shipper has confirmed delivery for trip #${params.tripId}. Payment will be processed.`;

  const html = baseTemplate(`
    <h2 style="margin:0 0 8px;color:#1a2332;font-size:20px;">${heading}</h2>
    <p style="margin:0 0 16px;color:#5a6577;font-size:14px;">${body}</p>
    ${detailsTable(
      infoRow("Trip #", String(params.tripId)) +
      (params.loadId ? infoRow("Load #", String(params.loadId)) : "")
    )}
    <p style="margin:0;color:#5a6577;font-size:13px;">Log in to Livestockway for details.</p>
  `);

  sendSafe(user.email, `Trip #${params.tripId} — ${heading}`, html);
}
