export type UiLoadStatus = "open" | "assigned" | "in_transit" | "delivered";

export function normalizeLoadStatus(status?: string | null): UiLoadStatus {
  const normalized = (status ?? "").toLowerCase();

  switch (normalized) {
    case "matched":
      return "assigned";
    case "assigned":
      return "assigned";
    case "in_transit":
      return "in_transit";
    case "completed":
    case "delivered":
      return "delivered";
    case "posted":
    case "draft":
    case "open":
    default:
      return "open";
  }
}

export function formatLoadStatusLabel(status?: string | null): string {
  const mapped = normalizeLoadStatus(status);
  switch (mapped) {
    case "assigned":
      return "Assigned";
    case "in_transit":
      return "In transit";
    case "delivered":
      return "Delivered";
    default:
      return "Open";
  }
}
