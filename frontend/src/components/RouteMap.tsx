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

// Create custom icon for different marker types
const createCustomIcon = (L: any, type?: string, label?: string) => {
  let color = "#3388ff"; // Default blue
  let iconChar = "📍";
  let size = 32;

  switch (type) {
    case "origin":
      color = "#3b82f6"; // Blue
      iconChar = "🚛";
      size = 36;
      break;
    case "destination":
      color = "#10b981"; // Green
      iconChar = "🏁";
      size = 36;
      break;
    case "pickup":
      color = "#f59e0b"; // Orange/Amber
      iconChar = "📦";
      size = 34;
      break;
    case "dropoff":
      color = "#8b5cf6"; // Purple
      iconChar = "✅";
      size = 34;
      break;
    default:
      color = "#6b7280"; // Gray
      iconChar = "📍";
      size = 30;
  }

  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: ${size * 0.6}px;
        position: relative;
      ">
        <span>${iconChar}</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
};

type RouteMarker = {
  lat: number;
  lng: number;
  type?: "origin" | "destination" | "pickup" | "dropoff" | "other";
  label?: string;
};

type RouteMapProps = {
  coordinates: Array<[number, number]>;
  markers?: RouteMarker[];
};

export function RouteMap({ coordinates, markers }: RouteMapProps) {
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

        // Add markers: use provided markers if present, otherwise start/end
        if (markers && markers.length > 0) {
          markers.forEach((m) => {
            const latlng = [m.lat, m.lng] as [number, number];
            const customIcon = createCustomIcon(window.L, m.type, m.label);
            const marker = window.L.marker(latlng, { icon: customIcon });
            if (m.label) {
              marker.bindPopup(`<div style="font-weight: 600; text-align: center;">${m.label}</div>`);
            }
            marker.addTo(mapRef.current);
            markersRef.current.push(marker);
          });
        } else {
          const start = coordinates[0];
          const end = coordinates[coordinates.length - 1];
          const startIcon = createCustomIcon(window.L, "origin", "Start");
          const endIcon = createCustomIcon(window.L, "destination", "End");
          markersRef.current.push(
            window.L.marker(start, { icon: startIcon }).addTo(mapRef.current),
            window.L.marker(end, { icon: endIcon }).addTo(mapRef.current)
          );
        }

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
  }, [coordinates, markers]);

  return <div ref={containerRef} className="h-80 w-full rounded-md border" />;
}
