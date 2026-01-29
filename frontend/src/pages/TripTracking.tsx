/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchLoadById,
  type LoadDetail,
  API_BASE_URL,
  fetchTripByLoadId,
  fetchTripRoutePlan,
  type TripRoutePlan,
} from "../lib/api";
import type { TripRecord, Payment } from "../lib/types";
import { storage, STORAGE_KEYS } from "../lib/storage";
import { normalizeLoadStatus, formatLoadStatusLabel } from "../lib/status";
import { getPaymentByTrip } from "../api/payments";
import {
  fetchTripByLoadId as fetchMarketplaceTripByLoad,
  type TripEnvelope,
} from "../api/marketplace";
import { RouteMap } from "../components/RouteMap";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";

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
  delivered: "bg-primary-100 text-emerald-800",
};

const resolveEpodUrl = (url?: string | null) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url}`;
};

export function TripTracking() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUserRole = storage.get<string | null>(
    STORAGE_KEYS.USER_ROLE,
    null
  );

  const [load, setLoad] = useState<LoadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trip, setTrip] = useState<TripRecord | null>(null);
  const [tripLoading, setTripLoading] = useState(true);
  const [tripError, setTripError] = useState<string | null>(null);
  // Trip expenses feature is disabled for now
  // const [expenses, setExpenses] = useState<TripExpense[]>([]);
  // const [expensesLoading, setExpensesLoading] = useState(true);
  // const [expensesError, setExpensesError] = useState<string | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [marketplaceContext, setMarketplaceContext] = useState<TripEnvelope | null>(null);
  const [marketplaceContextLoading, setMarketplaceContextLoading] = useState(true);
  const [marketplaceContextError, setMarketplaceContextError] = useState<string | null>(null);
  const [routePlan, setRoutePlan] = useState<TripRoutePlan | null>(null);
  const [routePlanLoading, setRoutePlanLoading] = useState(false);
  const [routePlanError, setRoutePlanError] = useState<string | null>(null);

  const marketplaceTripId = marketplaceContext?.trip ? Number(marketplaceContext.trip.id) : null;
  const tripId = trip?.id ?? marketplaceTripId;

  const normalizedPlan = useMemo(() => {
    if (!routePlan?.plan_json) return null;
    return routePlan.plan_json;
  }, [routePlan]);

  // Extract selected route data for display
  const selectedRoute = useMemo(() => {
    if (!normalizedPlan?.route) return null;
    return normalizedPlan.route;
  }, [normalizedPlan]);

  // Build route coordinates from selected route waypoints
  const routeCoordinates = useMemo(() => {
    if (!selectedRoute?.waypoints || !selectedRoute?.sequence) return [];
    const coords: Array<[number, number]> = [];
    selectedRoute.sequence.forEach((waypointId: string) => {
      const waypoint = selectedRoute.waypoints.find((wp: any) => wp.id === waypointId);
      if (waypoint?.location?.lat && waypoint?.location?.lng) {
        coords.push([waypoint.location.lat, waypoint.location.lng]);
      }
    });
    return coords;
  }, [selectedRoute]);

  // Extract waypoints in sequence order for display
  const routeWaypoints = useMemo(() => {
    if (!selectedRoute?.waypoints || !selectedRoute?.sequence) return [];
    return selectedRoute.sequence.map((waypointId: string) => {
      const waypoint = selectedRoute.waypoints.find((wp: any) => wp.id === waypointId);
      return waypoint;
    }).filter(Boolean);
  }, [selectedRoute]);

  // Build map markers for all waypoints (origin, destination, pickups, dropoffs)
  const mapMarkers = useMemo(() => {
    if (!routeWaypoints.length) return [];
    return routeWaypoints
      .filter((waypoint: any) => waypoint?.location?.lat && waypoint?.location?.lng)
      .map((waypoint: any) => {
        const type =
          waypoint.type === "origin" ||
          waypoint.type === "destination" ||
          waypoint.type === "pickup" ||
          waypoint.type === "dropoff"
            ? waypoint.type
            : "other";

        let label: string;
        if (type === "origin") {
          label = "Origin";
        } else if (type === "destination") {
          label = "Destination";
        } else if (type === "pickup") {
          label = `Pickup: ${waypoint.location?.text || ""}`;
        } else if (type === "dropoff") {
          label = `Dropoff: ${waypoint.location?.text || ""}`;
        } else {
          label = waypoint.location?.text || "Waypoint";
        }

        return {
          lat: waypoint.location.lat,
          lng: waypoint.location.lng,
          type,
          label,
        };
      });
  }, [routeWaypoints]);

  // Extract rest stops, washouts, and feed stops from route plan
  const restStops = useMemo(() => {
    return normalizedPlan?.rest_stops || normalizedPlan?.stops || [];
  }, [normalizedPlan]);

  const washouts = useMemo(() => {
    return normalizedPlan?.washouts || [];
  }, [normalizedPlan]);

  const feedStops = useMemo(() => {
    return normalizedPlan?.feed_stops || normalizedPlan?.feed_hay_stops || [];
  }, [normalizedPlan]);

  const resolvedPaymentMode = useMemo(() => {
    const mode =
      (payment as any)?.payment_mode ||
      (trip as any)?.payment_mode ||
      (load as any)?.payment_mode;
    return mode === "DIRECT" ? "DIRECT" : "ESCROW";
  }, [payment, trip, load]);

  const agreedAmount = useMemo(() => {
    const amount =
      (payment as any)?.amount ??
      (load as any)?.offer_price ??
      (load as any)?.price_offer_amount ??
      null;
    return typeof amount === "number" ? amount : amount ? Number(amount) : null;
  }, [payment, load]);

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
        console.error("Error loading tracking trip", err);
        setError(
          err?.message || "Something went wrong while loading tracking data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadTrip();
  }, [id]);

  const loadMarketplaceContext = useCallback(async () => {
    if (!id) {
      setMarketplaceContext(null);
      setMarketplaceContextLoading(false);
      return;
    }
    try {
      setMarketplaceContextLoading(true);
      setMarketplaceContextError(null);
      const ctx = await fetchMarketplaceTripByLoad(Number(id));
      setMarketplaceContext(ctx);
    } catch (err: any) {
      console.error("Error loading marketplace trip", err);
      setMarketplaceContext(null);
      setMarketplaceContextError(err?.message || "Trip not created yet.");
    } finally {
      setMarketplaceContextLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadMarketplaceContext();
  }, [loadMarketplaceContext]);

  useEffect(() => {
    if (!load || !load.id) return;

    const loadId = load.id;

    let cancelled = false;
    async function loadTripRecord() {
      try {
        setTripLoading(true);
        setTripError(null);
        const tripRecord = await fetchTripByLoadId(loadId);
        if (!cancelled) {
          setTrip(tripRecord);
        }
      } catch (err: any) {
        console.error("Error fetching trip for load", err);
        if (!cancelled) {
          setTripError(err?.message || "Trip not created yet.");
          setTrip(null);
        }
      } finally {
        if (!cancelled) {
          setTripLoading(false);
        }
      }
    }

    loadTripRecord();
    return () => {
      cancelled = true;
    };
  }, [load?.id]);

  // Trip expenses feature disabled: do not load expenses

  useEffect(() => {
    if (!tripId) {
      setPayment(null);
      setPaymentLoading(false);
      setPaymentError(null);
      return;
    }

    let cancelled = false;
    async function loadPayment() {
      try {
        setPaymentLoading(true);
        setPaymentError(null);
        const paymentData = await getPaymentByTrip(String(tripId));
        if (!cancelled) {
          setPayment(paymentData);
        }
      } catch (err: any) {
        console.error("Error loading payment", err);
        if (!cancelled) {
          setPaymentError(err?.message || "Failed to load payment information.");
        }
      } finally {
        if (!cancelled) {
          setPaymentLoading(false);
        }
      }
    }

    loadPayment();
    return () => {
      cancelled = false;
    };
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;
    let active = true;
    setRoutePlanLoading(true);
    setRoutePlanError(null);
    fetchTripRoutePlan(tripId)
      .then((plan) => {
        if (!active) return;
        setRoutePlan(plan);
      })
      .catch((err: any) => {
        if (!active) return;
        setRoutePlanError(err?.message || "Failed to load route plan");
      })
      .finally(() => {
        if (!active) return;
        setRoutePlanLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tripId]);

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-600">Loading trip tracking…</div>
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
      <div className="p-4 text-sm text-gray-600">Trip not found.</div>
    );
  }

  const statusKey = normalizeLoadStatus(load.status);
  const badgeLabel = statusLabel[statusKey] ?? formatLoadStatusLabel(load.status);
  const badgeClass = statusColor[statusKey] ?? "bg-gray-100 text-gray-700";
  const marketplaceTrip = marketplaceContext?.trip ?? null;
  const marketplacePayment = marketplaceContext?.payment ?? null;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-xs text-gray-500 hover:underline"
          >
            ← Back to trip details
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            Trip Tracking – Trip #{load.id}
          </h1>
          <div className="text-xs text-gray-500">
            {load.pickup_location ?? "—"} → {load.dropoff_location ?? "—"}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
          >
            {badgeLabel}
          </span>
          <div className="text-[11px] text-gray-500">
            Last updated:{" "}
            {formatDateTime(
              load.completed_at ||
                load.started_at ||
                load.assigned_at ||
                load.created_at
            )}
          </div>
        </div>
      </div>

      {/* Trip Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Trip Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs text-gray-700">
            <div>
              <div className="font-medium">Species / Quantity</div>
              <div className="text-gray-600">
                {load.species ?? "Livestock"} • {load.quantity ?? "?"} head
              </div>
            </div>
            <div>
              <div className="font-medium">Pickup Time</div>
              <div className="text-gray-600">
                {formatDateTime(load.pickup_date)}
              </div>
            </div>
            <div>
              <div className="font-medium">Assigned To</div>
              <div className="text-gray-600">
                {load.assigned_to || "Not assigned"}
              </div>
            </div>
            {marketplaceTrip && (
              <div>
                <div className="font-medium">Trip Status</div>
                <div className="text-gray-600">
                  {marketplaceTrip.status.replace(/_/g, " ")}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-gray-700">
            <div>
              <span className="font-medium">Created:</span>{" "}
              {formatDateTime(load.created_at)}
            </div>
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
            {(marketplaceTrip as any)?.actual_start_time && (
              <div>
                <span className="font-medium">Actual Start:</span>{" "}
                {formatDateTime((marketplaceTrip as any).actual_start_time)}
              </div>
            )}
            {(marketplaceTrip as any)?.actual_end_time && (
              <div>
                <span className="font-medium">Actual End:</span>{" "}
                {formatDateTime((marketplaceTrip as any).actual_end_time)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Load Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Load Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-gray-700">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="font-medium">Pickup Location</div>
              <div className="text-gray-600">{load.pickup_location ?? "—"}</div>
            </div>
            <div>
              <div className="font-medium">Dropoff Location</div>
              <div className="text-gray-600">{load.dropoff_location ?? "—"}</div>
            </div>
            <div>
              <div className="font-medium">Description</div>
              <div className="text-gray-600">{load.description || "—"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Route Plan */}
      {routePlanLoading ? (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Loading route plan…</div>
          </CardContent>
        </Card>
      ) : routePlanError ? (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-rose-600">{routePlanError}</div>
          </CardContent>
        </Card>
      ) : selectedRoute ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Route Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Route Overview */}
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-gray-500 text-xs">Origin</div>
                  <div className="text-gray-900 text-sm font-medium">
                    {selectedRoute.waypoints?.find((wp: any) => wp.id === 'origin')?.location?.text || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Destination</div>
                  <div className="text-gray-900 text-sm font-medium">
                    {selectedRoute.waypoints?.find((wp: any) => wp.id === 'destination')?.location?.text || "—"}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <div className="text-gray-500 text-xs">Distance</div>
                  <div className="text-gray-900 text-sm font-medium">
                    {selectedRoute.distance_km ? `${Math.round(selectedRoute.distance_km)} km` : normalizedPlan?.distance_km ? `${Math.round(normalizedPlan.distance_km)} km` : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Duration</div>
                  <div className="text-gray-900 text-sm font-medium">
                    {selectedRoute.duration_min ? `${Math.round(selectedRoute.duration_min / 60)}h ${Math.round(selectedRoute.duration_min % 60)}m` : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Est. Cost</div>
                  <div className="text-gray-900 text-sm font-medium">
                    {selectedRoute.estimated_cost ? `$${selectedRoute.estimated_cost}` : "—"}
                  </div>
                </div>
              </div>

              {/* Route Waypoints Sequence */}
              {routeWaypoints.length > 0 && (
                <div>
                  <div className="text-gray-500 text-xs mb-2 font-medium">Route Sequence</div>
                  <div className="space-y-1">
                    {routeWaypoints.map((waypoint: any, index: number) => {
                      if (!waypoint) return null;
                      const icon = waypoint.type === 'origin' ? '🚛' : waypoint.type === 'destination' ? '🏁' : waypoint.type === 'pickup' ? '📦' : waypoint.type === 'dropoff' ? '✅' : '📍';
                      const label = waypoint.type === 'origin' ? 'Origin' : waypoint.type === 'destination' ? 'Destination' : waypoint.type === 'pickup' ? `Pickup: ${waypoint.location?.text || ''}` : waypoint.type === 'dropoff' ? `Dropoff: ${waypoint.location?.text || ''}` : waypoint.location?.text || '';
                      return (
                        <div key={waypoint.id || index} className="flex items-center gap-2 text-xs">
                          <span>{icon}</span>
                          <span className="text-gray-600">{index + 1}.</span>
                          <span className="text-gray-900">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Route Map */}
            {routeCoordinates.length > 0 && (
              <div className="rounded-md border border-gray-200 overflow-hidden" style={{ height: "400px" }}>
                <RouteMap coordinates={routeCoordinates} markers={mapMarkers} />
              </div>
            )}

            {/* Rest Stops */}
            <div>
              <div className="text-gray-500 text-xs mb-2 font-medium">Rest Stops</div>
              {restStops.length > 0 ? (
                <div className="space-y-1">
                  {restStops.map((stop: any, index: number) => (
                    <div
                      key={`rest-${index}`}
                      className="flex items-start justify-between gap-3 rounded border border-gray-200 bg-white px-2 py-1.5"
                    >
                      <div>
                        <div className="text-gray-900 text-xs font-medium">
                          {stop.label || stop.name || `Rest Stop ${index + 1}`}
                        </div>
                        {stop.address && (
                          <div className="text-gray-500 text-[10px]">{stop.address}</div>
                        )}
                        {stop.notes && (
                          <div className="text-gray-500 text-[10px]">{stop.notes}</div>
                        )}
                      </div>
                      <div className="text-gray-700 text-xs">
                        {stop.at_distance_km ? `${Math.round(stop.at_distance_km)} km` : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-xs">No rest stops planned.</div>
              )}
            </div>

            {/* Washouts */}
            <div>
              <div className="text-gray-500 text-xs mb-2 font-medium">Washouts</div>
              {washouts.length > 0 ? (
                <div className="space-y-1">
                  {washouts.map((washout: any, index: number) => (
                    <div
                      key={`washout-${index}`}
                      className="flex items-start justify-between gap-3 rounded border border-gray-200 bg-white px-2 py-1.5"
                    >
                      <div>
                        <div className="text-gray-900 text-xs font-medium">
                          {washout.name || washout.label || `Washout ${index + 1}`}
                        </div>
                        {washout.address && (
                          <div className="text-gray-500 text-[10px]">{washout.address}</div>
                        )}
                        {washout.notes && (
                          <div className="text-gray-500 text-[10px]">{washout.notes}</div>
                        )}
                      </div>
                      <div className="text-gray-700 text-xs">
                        {washout.distance_km ? `${Math.round(washout.distance_km)} km` : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-xs">No washouts planned.</div>
              )}
            </div>

            {/* Feed/Hay Stops */}
            <div>
              <div className="text-gray-500 text-xs mb-2 font-medium">Feed/Hay Stops</div>
              {feedStops.length > 0 ? (
                <div className="space-y-1">
                  {feedStops.map((feed: any, index: number) => (
                    <div
                      key={`feed-${index}`}
                      className="flex items-start justify-between gap-3 rounded border border-gray-200 bg-white px-2 py-1.5"
                    >
                      <div>
                        <div className="text-gray-900 text-xs font-medium">
                          {feed.name || feed.label || `Feed/Hay Stop ${index + 1}`}
                        </div>
                        {feed.address && (
                          <div className="text-gray-500 text-[10px]">{feed.address}</div>
                        )}
                        {feed.notes && (
                          <div className="text-gray-500 text-[10px]">{feed.notes}</div>
                        )}
                      </div>
                      <div className="text-gray-700 text-xs">
                        {feed.distance_km ? `${Math.round(feed.distance_km)} km` : "—"}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500 text-xs">No feed/hay stops planned.</div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">
              No route plan available yet.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trip Expenses section removed (feature disabled) */}

      {/* Payment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Payment Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-gray-700">
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={
                resolvedPaymentMode === "DIRECT"
                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                  : "bg-primary-50 text-emerald-800 border border-emerald-200"
              }
            >
              Payment: {resolvedPaymentMode === "DIRECT" ? "Direct" : "Escrow"}
            </Badge>
          </div>
          <div>
            <span className="text-gray-500">Agreed Amount:</span>{" "}
            <span className="font-semibold">
              {agreedAmount != null ? `$${Number(agreedAmount).toLocaleString()}` : "—"}
            </span>
          </div>
          {resolvedPaymentMode !== "DIRECT" ? (
            <div>
              <span className="text-gray-500">Escrow Status:</span>{" "}
              <span className="font-semibold">
                {paymentLoading
                  ? "Loading…"
                  : paymentError
                  ? "Unavailable"
                  : marketplacePayment?.status ?? payment?.status ?? "Pending"}
              </span>
            </div>
          ) : (
            <div className="space-y-1 text-xs text-gray-700">
              <div>
                <span className="text-gray-500">Payment Method:</span>{" "}
                {(marketplaceContext as any)?.direct_payment?.received_payment_method ?? "—"}
              </div>
              {(marketplaceContext as any)?.direct_payment?.received_at && (
                <div>
                  <span className="text-gray-500">Received At:</span>{" "}
                  {formatDateTime((marketplaceContext as any)?.direct_payment?.received_at)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Confirmation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Delivery Confirmation</CardTitle>
        </CardHeader>
        <CardContent>
          {resolveEpodUrl(load.epod_url) ? (
            <div className="space-y-1">
              <div className="text-sm text-gray-600">
                Trip is delivered and has an attached ePOD file.
              </div>
              <a
                href={resolveEpodUrl(load.epod_url) ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-xs font-medium text-emerald-700 hover:underline"
              >
                View ePOD
              </a>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              No ePOD uploaded yet. Once the driver completes the trip and uploads
              proof, it will appear here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default TripTracking;
