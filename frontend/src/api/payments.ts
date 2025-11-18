import type { Payment } from "../lib/types";
import { API_BASE_URL } from "../lib/api";

function getAuthHeaders(headers: Record<string, string> = {}) {
  if (typeof window === "undefined") return headers;
  const token = window.localStorage.getItem("token");
  if (!token) return headers;
  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
}

export async function getPaymentByTrip(
  tripId: number | string
): Promise<Payment | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/payments/by-trip/${tripId}`,
    {
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
    }
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      text || `Failed to fetch payment for trip ${tripId} (${response.status})`
    );
  }

  return (await response.json()) as Payment;
}

export async function fundTripPayment(
  paymentId: number | string
): Promise<Payment> {
  const response = await fetch(
    `${API_BASE_URL}/api/payments/${paymentId}/fund`,
    {
      method: "POST",
      headers: getAuthHeaders({ "Content-Type": "application/json" }),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Failed to fund payment ${paymentId}`);
  }

  return (await response.json()) as Payment;
}
