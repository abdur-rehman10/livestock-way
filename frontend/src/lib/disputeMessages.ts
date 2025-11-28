import type { DisputeMessage } from "../api/disputes";

export type DisputePerspective = "shipper" | "hauler";

export function normalizeDisputeRole(value?: string | null) {
  return (value ?? "").toLowerCase().replace(/_/g, "-");
}

export function formatDisputeRoleLabel(value?: string | null) {
  if (!value) return "User";
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function filterMessagesForPerspective(
  messages: DisputeMessage[],
  perspective: DisputePerspective
) {
  return messages.filter((message) => {
    const sender = normalizeDisputeRole(message.sender_role);
    const recipient = normalizeDisputeRole(message.recipient_role) || "";
    if (perspective === "shipper") {
      if (sender.startsWith("shipper")) return true;
      if (sender.startsWith("super-admin")) {
        return recipient === "shipper" || recipient === "all" || recipient === "";
      }
      return false;
    }
    if (sender.startsWith("hauler") || sender.startsWith("driver")) return true;
    if (sender.startsWith("super-admin")) {
      return (
        recipient === "hauler" ||
        recipient === "driver" ||
        recipient === "all" ||
        recipient === ""
      );
    }
    return false;
  });
}
