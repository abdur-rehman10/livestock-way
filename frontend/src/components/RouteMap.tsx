import { useEffect, useRef } from "react";

const LEAFLET_CSS =
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS =
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

declare global {
  interface Window {
    L?: any;
  }
}

const loadLeaflet = () =>
  new Promise<void>((resolve, reject) => {
    if (window.L) {
      resolve();
      return;
    }
    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${LEAFLET_JS}"]`
    );
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve());
      existingScript.addEventListener("error", () => reject());
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = LEAFLET_CSS;
    document.head.appendChild(link);

    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.body.appendChild(script);
  });

type RouteMapProps = {
  coordinates: Array<[number, number]>;
};

export function RouteMap({ coordinates }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;
    let active = true;

    loadLeaflet()
      .then(() => {
        if (!active || !containerRef.current || !window.L) return;
        if (!mapRef.current) {
          mapRef.current = window.L.map(containerRef.current, {
            zoomControl: true,
          });
          window.L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
              maxZoom: 19,
              attribution: "© OpenStreetMap contributors",
            }
          ).addTo(mapRef.current);
        }

        if (polylineRef.current) {
          polylineRef.current.remove();
          polylineRef.current = null;
        }
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current = [];

        if (!coordinates.length) return;

        polylineRef.current = window.L.polyline(coordinates, {
          color: "#16a34a",
          weight: 4,
        }).addTo(mapRef.current);

        const start = coordinates[0];
        const end = coordinates[coordinates.length - 1];
        markersRef.current.push(
          window.L.marker(start).addTo(mapRef.current),
          window.L.marker(end).addTo(mapRef.current)
        );

        mapRef.current.fitBounds(polylineRef.current.getBounds(), {
          padding: [24, 24],
        });
        setTimeout(() => {
          mapRef.current?.invalidateSize?.();
        }, 0);
      })
      .catch(() => {
        // ignore leaflet load errors; fallback is handled by parent
      });

    return () => {
      active = false;
    };
  }, [coordinates]);

  return <div ref={containerRef} className="h-80 w-full rounded-md border" />;
}
