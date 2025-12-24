import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchLoadById,
  fetchTripByLoadId,
  fetchTripRoutePlan,
  type LoadDetail,
  type TripRoutePlan,
} from "../lib/api";
import type { TripRecord } from "../lib/types";
import { Button } from "../components/ui/button";
import { decodePolyline } from "../lib/polyline";
import { RouteMap } from "../components/RouteMap";

export default function TripRoutePlan() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [load, setLoad] = useState<LoadDetail | null>(null);
  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [routePlan, setRoutePlan] = useState<TripRoutePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadId = useMemo(() => {
    const numeric = Number(id);
    return Number.isNaN(numeric) ? null : numeric;
  }, [id]);

  const normalizedPlan = useMemo(() => {
    if (!routePlan?.plan_json) return null;
    return routePlan.plan_json;
  }, [routePlan]);
  const routeCoordinates = useMemo(() => {
    const geometry = normalizedPlan?.route_geometry;
    if (!geometry || typeof geometry !== "string") return [];
    return decodePolyline(geometry, 6);
  }, [normalizedPlan]);

  useEffect(() => {
    if (!loadId) {
      setError("Invalid load id.");
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([fetchLoadById(loadId), fetchTripByLoadId(loadId)])
      .then(async ([loadRecord, tripRecord]) => {
        if (!active) return;
        setLoad(loadRecord);
        setTrip(tripRecord);
        if (tripRecord?.id) {
          const plan = await fetchTripRoutePlan(tripRecord.id);
          if (!active) return;
          setRoutePlan(plan);
        }
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || "Failed to load route plan");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadId]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-gray-500">
        Loading route plan…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-rose-600">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Route plan</h1>
          <p className="text-xs text-gray-500">
            Load #{load?.id ?? "—"} • Trip #{trip?.id ?? "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Map & routing</h2>
            {normalizedPlan?.map_url ? (
              <a
                className="text-xs text-emerald-700 hover:underline"
                href={normalizedPlan.map_url}
                target="_blank"
                rel="noreferrer"
              >
                Open map
              </a>
            ) : null}
          </div>
          {routeCoordinates.length ? (
            <RouteMap coordinates={routeCoordinates} />
          ) : normalizedPlan?.map_embed_url ? (
            <iframe
              title="Route map"
              src={normalizedPlan.map_embed_url}
              className="h-80 w-full rounded-md border"
            />
          ) : (
            <div className="flex h-80 items-center justify-center rounded-md border border-dashed text-xs text-gray-500">
              Map not available yet. Generate a plan with route_geometry.
            </div>
          )}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 text-xs text-gray-700 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Summary</h2>
          <div className="space-y-2">
            <div>
              <div className="text-gray-500">Origin</div>
              <div className="text-gray-900">{load?.pickup_location || "—"}</div>
            </div>
            <div>
              <div className="text-gray-500">Destination</div>
              <div className="text-gray-900">{load?.dropoff_location || "—"}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-gray-500">Distance</div>
                <div className="text-gray-900">
                  {normalizedPlan?.distance_km ?? trip?.route_distance_km ?? "—"} km
                </div>
              </div>
              <div>
                <div className="text-gray-500">Tolls</div>
                <div className="text-gray-900">
                  {routePlan?.tolls_amount
                    ? `${routePlan.tolls_amount} ${routePlan.tolls_currency || "USD"}`
                    : "Estimate pending"}
                </div>
              </div>
            </div>
            <div>
              <div className="text-gray-500">Compliance</div>
              <div className="text-gray-900">
                {routePlan?.compliance_status ||
                  normalizedPlan?.compliance_status ||
                  "Pending"}
              </div>
              {routePlan?.compliance_notes || normalizedPlan?.compliance_notes ? (
                <div className="text-gray-500">
                  {routePlan?.compliance_notes || normalizedPlan?.compliance_notes}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4 text-xs text-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Plan details</h2>
          {normalizedPlan?.directions_url ? (
            <a
              className="text-xs text-emerald-700 hover:underline"
              href={normalizedPlan.directions_url}
              target="_blank"
              rel="noreferrer"
            >
              Open directions
            </a>
          ) : null}
        </div>
        <div>
          <div className="text-gray-500 mb-1">Rest stops</div>
          {normalizedPlan?.stops?.length ? (
            <div className="space-y-2">
              {normalizedPlan.stops.map((stop: any) => (
                <div
                  key={`${stop.stop_number}-${stop.at_distance_km}`}
                  className="flex items-start justify-between gap-3 rounded border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <div>
                    <div className="text-gray-900">
                      {stop.label || `Stop ${stop.stop_number ?? ""}`.trim()}
                    </div>
                    <div className="text-gray-500">{stop.notes}</div>
                  </div>
                  <div className="text-gray-700">
                    {stop.at_distance_km ? `${stop.at_distance_km} km` : "—"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500">No stops listed.</div>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-gray-500 mb-1">Washouts</div>
            {normalizedPlan?.washouts?.length ? (
              <div className="space-y-2">
                {normalizedPlan.washouts.map((item: any, index: number) => (
                  <div
                    key={`${item.name || "washout"}-${index}`}
                    className="rounded border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <div className="text-gray-900">{item.name || "Washout stop"}</div>
                    <div className="text-gray-500">
                      {item.distance_km ? `${item.distance_km} km` : "Distance pending"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500">No washouts listed.</div>
            )}
          </div>
          <div>
            <div className="text-gray-500 mb-1">Feed/Hay</div>
            {normalizedPlan?.feed_stops?.length ? (
              <div className="space-y-2">
                {normalizedPlan.feed_stops.map((item: any, index: number) => (
                  <div
                    key={`${item.name || "feed"}-${index}`}
                    className="rounded border border-gray-200 bg-gray-50 px-3 py-2"
                  >
                    <div className="text-gray-900">{item.name || "Feed stop"}</div>
                    <div className="text-gray-500">
                      {item.distance_km ? `${item.distance_km} km` : "Distance pending"}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500">No feed/hay stops listed.</div>
            )}
          </div>
        </div>
        <div>
          <div className="text-gray-500 mb-1">Raw plan JSON</div>
          <pre className="whitespace-pre-wrap rounded border border-gray-200 bg-gray-50 p-3 text-[11px] text-gray-700">
            {JSON.stringify(normalizedPlan ?? {}, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
