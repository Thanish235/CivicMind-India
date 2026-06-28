"use client";

import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";

// Dynamic import wrapper to prevent SSR errors
export default function Map({ 
  center = [12.9716, 77.5946], 
  zoom = 13, 
  issues = [], 
  hotspots = [], 
  onMarkerClick,
  interactive = true 
}: {
  center?: [number, number];
  zoom?: number;
  issues?: any[];
  hotspots?: any[];
  onMarkerClick?: (issue: any) => void;
  interactive?: boolean;
}) {
  const [MountedMap, setMountedMap] = useState<any>(null);

  useEffect(() => {
    // Dynamically load Leaflet library on client-side only
    import("leaflet").then((L) => {
      setMountedMap(() => L);
    });
  }, []);

  if (!MountedMap) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-slate-900 border border-white/5 rounded-xl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-slate-400">Loading Geospatial Engine...</span>
        </div>
      </div>
    );
  }

  // Client-side leaflet rendering
  const L = MountedMap;
  const { MapContainer, TileLayer, Marker, Popup, Circle } = require("react-leaflet");

  // Helper to construct custom HTML markers to bypass assets resolution bugs
  const createCustomIcon = (priority: number, category: string) => {
    let color = "#06b6d4"; // Cyan
    if (priority > 75) color = "#ef4444"; // Red
    else if (priority > 45) color = "#f59e0b"; // Amber

    return L.divIcon({
      html: `
        <div class="relative w-8 h-8 flex items-center justify-center">
          <span class="absolute w-6 h-6 rounded-full opacity-40 animate-ping" style="background-color: ${color}"></span>
          <span class="relative w-3.5 h-3.5 rounded-full border-2 border-slate-900 shadow-md" style="background-color: ${color}"></span>
        </div>
      `,
      className: "custom-leaflet-icon",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
  };

  return (
    <div className="w-full h-full relative min-h-[400px]">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={interactive} 
        zoomControl={interactive}
        dragging={interactive}
        className="w-full h-full rounded-xl"
        style={{ minHeight: "400px" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Render Issue Markers */}
        {issues.map((issue) => {
          const lat = issue.location?.lat;
          const lng = issue.location?.lng;
          if (lat === undefined || lng === undefined) return null;

          return (
            <Marker 
              key={issue.issueId} 
              position={[lat, lng]} 
              icon={createCustomIcon(issue.priorityScore || 50, issue.category)}
              eventHandlers={{
                click: () => onMarkerClick && onMarkerClick(issue)
              }}
            >
              <Popup>
                <div className="p-2 text-slate-100 min-w-[200px]">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-neon-cyan border border-neon-cyan/20">
                      {issue.category}
                    </span>
                    <span className="text-xs font-bold text-red-400">
                      Score: {issue.priorityScore}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 my-1">{issue.description}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[10px] text-slate-400">
                    <span>Status: <span className="font-semibold text-slate-200">{issue.status}</span></span>
                    <span>City: {issue.location?.city}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Render DBSCAN Hotspots (glowing red circles) */}
        {hotspots.map((hotspot) => (
          <Circle
            key={hotspot.clusterId}
            center={[hotspot.latitude, hotspot.longitude]}
            radius={250} // 250m radius
            pathOptions={{
              color: "#ef4444",
              fillColor: "#ef4444",
              fillOpacity: 0.15,
              weight: 1.5,
              dashArray: "4, 4"
            }}
          >
            <Popup>
              <div className="p-2 text-slate-100 min-w-[200px]">
                <h4 className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  Active Risk Hotspot Detected
                </h4>
                <div className="text-xs text-slate-300 mt-2 space-y-1">
                  <div>Complaints: <span className="font-semibold text-slate-100">{hotspot.issueCount} cases</span></div>
                  <div>Avg Risk: <span className="font-semibold text-slate-100">{hotspot.averageRisk}%</span></div>
                  <div>Categories: <span className="text-[10px] text-slate-400 font-semibold">{hotspot.categories.join(", ")}</span></div>
                </div>
              </div>
            </Popup>
          </Circle>
        ))}
      </MapContainer>
    </div>
  );
}
