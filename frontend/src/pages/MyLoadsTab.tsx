import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchLoadsForShipper, type LoadSummary } from "../lib/api";

const DEMO_SHIPPER_ID = "demo_shipper_1";

export default function MyLoadsTab() {
  const [loads, setLoads] = useState<LoadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchLoadsForShipper(DEMO_SHIPPER_ID);
        if (!cancelled) {
          setLoads(data);
        }
      } catch (err: any) {
        console.error("Error loading shipper loads", err);
        if (!cancelled) {
          setError(err?.message || "Failed to load your trips.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-600">
        Loading your loads…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 space-y-3">
        <div className="text-sm text-red-600">{error}</div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!loads.length) {
    return (
      <div className="p-4 text-sm text-gray-600">
        You haven’t posted any loads yet. Use the <strong>Post Load</strong> button to create your first shipment.
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">My Loads</h1>
        <p className="text-xs text-gray-500">
          These are all loads you’ve posted as a shipper.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50">
            <tr className="text-left text-[11px] font-semibold text-gray-500">
              <th className="px-4 py-2">ID</th>
              <th className="px-4 py-2">Route</th>
              <th className="px-4 py-2">Livestock</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Assigned to</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {loads.map((load) => (
              <tr key={load.id} className="border-t border-gray-100">
                <td className="px-4 py-2 font-medium text-gray-900">#{load.id}</td>
                <td className="px-4 py-2 text-gray-700">
                  {load.pickup_location ?? "—"} → {load.dropoff_location ?? "—"}
                </td>
                <td className="px-4 py-2 text-gray-700">
                  {load.species ?? "Livestock"} · {load.quantity ?? "?"} head
                </td>
                <td className="px-4 py-2 capitalize text-gray-700">
                  {load.status?.replace(/_/g, " ") ?? "open"}
                </td>
                <td className="px-4 py-2 text-gray-700">
                  {load.assigned_to || "—"}
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {load.created_at ? new Date(load.created_at).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  <Link
                    to={`/shipper/trips/${load.id}`}
                    className="text-[11px] font-medium text-emerald-700 hover:underline"
                  >
                    View trip
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
