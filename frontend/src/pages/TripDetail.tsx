import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchLoadById, type LoadDetail, API_BASE_URL } from "../lib/api";

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
};

const statusLabel: Record<string, string> = {
  open: "Open",
  assigned: "Assigned",
  in_transit: "In transit",
  delivered: "Delivered",
};

const statusColor: Record<string, string> = {
  open: "bg-gray-100 text-gray-700",
  assigned: "bg-amber-100 text-amber-800",
  in_transit: "bg-sky-100 text-sky-800",
  delivered: "bg-emerald-100 text-emerald-800",
};

const resolveEpodUrl = (url?: string | null) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url}`;
};

export function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [load, setLoad] = useState<LoadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Missing trip ID in URL.");
      setLoading(false);
      return;
    }

    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      setError("Invalid trip ID.");
      setLoading(false);
      return;
    }

    async function loadTrip() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchLoadById(numericId);
        setLoad(data);
      } catch (err: any) {
        console.error("Error loading trip", err);
        setError(
          err?.message || "Something went wrong while loading this trip."
        );
      } finally {
        setLoading(false);
      }
    }

    loadTrip();
  }, [id]);

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-600">
        Loading trip details…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-3">
        <div className="text-sm text-red-600">{error}</div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Go back
        </button>
      </div>
    );
  }

  if (!load) {
    return (
      <div className="p-4 text-sm text-gray-600">
        Trip not found.
      </div>
    );
  }

  const statusKey = (load.status || "open").toLowerCase();
  const badgeLabel = statusLabel[statusKey] ?? load.status ?? "Unknown";
  const badgeClass = statusColor[statusKey] ?? "bg-gray-100 text-gray-700";

  return (
    <div className="p-4 space-y-4">
      {/* Header + breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-xs text-gray-500 hover:underline"
          >
            ← Back to My Loads
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            Trip #{load.id} –{" "}
            {load.title ||
              `${load.species ?? "Livestock"} • ${load.quantity ?? "?"} head`}
          </h1>
          <div className="text-xs text-gray-500">
            {load.pickup_location ?? "—"} → {load.dropoff_location ?? "—"}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
          >
            {badgeLabel}
          </span>
          <div className="text-[11px] text-gray-500">
            Created: {formatDateTime(load.created_at)}
          </div>
        </div>
      </div>

      {/* Journey + timeline */}
      <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 md:grid-cols-2">
        <div className="space-y-2 text-xs text-gray-700">
          <h2 className="text-sm font-semibold text-gray-900">
            Journey status
          </h2>
          <div>
            <div className="font-medium">Assigned to</div>
            <div className="text-gray-600">
              {load.assigned_to || "Not yet assigned"}
            </div>
          </div>
          <div>
            <div className="font-medium">Pickup time</div>
            <div className="text-gray-600">
              {formatDateTime(load.pickup_date)}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-xs text-gray-700">
          <h2 className="text-sm font-semibold text-gray-900">
            Timeline
          </h2>
          <div className="flex flex-col gap-1">
            <div>
              <span className="font-medium">Assigned:</span>{" "}
              {formatDateTime(load.assigned_at)}
            </div>
            <div>
              <span className="font-medium">Started:</span>{" "}
              {formatDateTime(load.started_at)}
            </div>
            <div>
              <span className="font-medium">Delivered:</span>{" "}
              {formatDateTime(load.completed_at)}
            </div>
          </div>
        </div>
      </div>

      {/* ePOD + tracking */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-700 space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">
            Proof of Delivery (ePOD)
          </h2>
          {resolveEpodUrl(load.epod_url) ? (
            <div className="space-y-1">
              <div className="text-gray-600">
                An ePOD file was attached when this trip was completed.
              </div>
              <a
                href={resolveEpodUrl(load.epod_url) ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-[11px] font-medium text-emerald-700 hover:underline"
              >
                View ePOD
              </a>
            </div>
          ) : (
            <div className="text-gray-500">
              No ePOD has been uploaded yet. It will appear here after the
              driver completes the trip.
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-700 space-y-2">
          <h2 className="text-sm font-semibold text-gray-900">
            Tracking & route
          </h2>
          <div className="text-gray-500 mb-2">
            Live map and IoT telemetry will be integrated in later phases. For
            now, use the tracking view for a monitoring-friendly layout.
          </div>
          <button
            type="button"
            onClick={() => navigate(`/hauler/trips/${load.id}/tracking`)}
            className="inline-flex items-center rounded-md border border-emerald-200 px-3 py-1.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-50"
          >
            View tracking
          </button>
        </div>
      </div>
    </div>
  );
}

export default TripDetail;
