import React, { useEffect, useState } from "react";
import { fetchLoadsByAssigned } from "../lib/api";
import type { Load } from "../lib/api";

const CURRENT_HAULER_ID = "demo_hauler_1";

export default function HaulerMyLoads() {
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchLoadsByAssigned(CURRENT_HAULER_ID);
        if (mounted) setLoads(data);
      } catch (e: any) {
        if (mounted) setErr("Failed to load your accepted loads");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading…</div>;
  }

  if (err) {
    return <div className="p-4 text-sm text-red-500">{err}</div>;
  }

  if (!loads.length) {
    return <div className="p-4 text-sm text-gray-500">No accepted loads yet.</div>;
  }

  return (
    <div className="p-4 space-y-4">
      {loads.map((l) => (
        <div key={l.id} className="border rounded-lg p-4">
          <div className="font-semibold">{l.title}</div>
          <div className="text-sm text-gray-500">
            {l.species} • {l.quantity} head
          </div>
          <div className="text-sm">
            {l.pickup_location} → {l.dropoff_location}
          </div>
          <div className="text-xs text-gray-500">
            Pickup: {new Date(l.pickup_date).toLocaleString()}
          </div>
          <div className="text-xs mt-1">Status: {l.status}</div>
        </div>
      ))}
    </div>
  );
}
