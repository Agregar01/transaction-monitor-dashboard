"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoCountryStat, GeoCluster } from "@/types/api";
import { COUNTRY_CENTROIDS } from "@/app/dashboard/geo/centroids";

// NOTE: we render only CircleMarker (countries) and divIcon (clusters) — never
// Leaflet's default raster marker — so the usual unpkg default-icon shim is
// unnecessary and was pulling marker PNGs cross-origin (blocked by our CSP).

const clusterIcon = L.divIcon({
  html: `<div style="
    background:rgba(234,88,12,0.85);
    border:2px solid #fff;
    border-radius:50%;
    width:22px;height:22px;
    display:flex;align-items:center;justify-content:center;
    font-size:10px;font-weight:700;color:#fff;
    box-shadow:0 1px 4px rgba(0,0,0,0.3);
  ">C</div>`,
  className: "",
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function fraudColor(rate: number): string {
  if (rate >= 0.15) return "#dc2626";
  if (rate >= 0.08) return "#f97316";
  if (rate >= 0.03) return "#eab308";
  return "#22c55e";
}

function txnRadius(count: number, max: number): number {
  const base = 6;
  const scaled = Math.sqrt(count / (max || 1)) * 28;
  return Math.max(base, Math.min(scaled, 40));
}

/** Tracks the app's dark-mode class so the basemap matches the theme and
 *  updates live when the user toggles. */
function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setDark(el.classList.contains("dark"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

function FitBounds() {
  const map = useMap();
  useEffect(() => {
    // The map often mounts before its flex/grid parent has resolved a height,
    // so Leaflet lays out zero tiles and only the markers show until a resize.
    // Force a size recalculation on mount (and once more after layout settles).
    map.invalidateSize();
    map.fitBounds([[-35, -20], [37, 55]], { padding: [20, 20] });
    const t = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

interface Props {
  countryStats: GeoCountryStat[];
  clusters: GeoCluster[];
}

export default function GeoMap({ countryStats, clusters }: Props) {
  const isDark = useIsDark();
  const maxTxn = Math.max(...countryStats.map((c) => c.transaction_count), 1);

  // Muted CARTO basemaps (monochrome) instead of full-colour OSM, so the
  // green→red fraud circles read clearly and the map matches the theme.
  const tileUrl = isDark
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

  // Deduplicate clusters by country so we don't stack markers
  const clustersByCountry = new Map<string, GeoCluster>();
  for (const cl of clusters) {
    const existing = clustersByCountry.get(cl.country_code);
    if (!existing || cl.size > existing.size) {
      clustersByCountry.set(cl.country_code, cl);
    }
  }

  return (
    <MapContainer
      center={[6, 20]}
      zoom={3}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        key={isDark ? "dark" : "light"}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={tileUrl}
      />
      <FitBounds />

      {/* Transaction density circles */}
      {countryStats.map((stat) => {
        const coords = COUNTRY_CENTROIDS[stat.country_code];
        if (!coords) return null;
        return (
          <CircleMarker
            key={stat.country_code}
            center={coords}
            radius={txnRadius(stat.transaction_count, maxTxn)}
            pathOptions={{
              color: fraudColor(stat.fraud_rate),
              fillColor: fraudColor(stat.fraud_rate),
              fillOpacity: 0.55,
              weight: 1.5,
            }}
          >
            <Tooltip>
              <div className="text-xs leading-snug">
                <div className="font-bold text-sm">{stat.country_code}</div>
                <div>Transactions: <strong>{stat.transaction_count.toLocaleString()}</strong></div>
                <div>Alerts: <strong>{stat.alert_count.toLocaleString()}</strong></div>
                <div>Fraud rate: <strong>{(stat.fraud_rate * 100).toFixed(1)}%</strong></div>
                <div>Volume: <strong>{stat.total_volume >= 1e6
                  ? `${(stat.total_volume / 1e6).toFixed(1)}M`
                  : `${(stat.total_volume / 1e3).toFixed(0)}K`
                }</strong></div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}

      {/* DBSCAN cluster markers */}
      {Array.from(clustersByCountry.values()).map((cl) => {
        const coords = COUNTRY_CENTROIDS[cl.country_code];
        if (!coords) return null;
        const offset: [number, number] = [coords[0] + 0.8, coords[1] + 0.8];
        return (
          <Marker key={`cluster-${cl.cluster_id}`} position={offset} icon={clusterIcon}>
            <Tooltip>
              <div className="text-xs leading-snug">
                <div className="font-bold text-sm">Cluster #{cl.cluster_id}</div>
                <div>Country: <strong>{cl.country_code}</strong></div>
                <div>Size: <strong>{cl.size.toLocaleString()} txns</strong></div>
                <div>Avg amount: <strong>{cl.avg_amount.toLocaleString()}</strong></div>
                {cl.dominant_channel && <div>Channel: <strong>{cl.dominant_channel}</strong></div>}
                <div className="text-gray-400 mt-0.5">Run: {cl.run_date}</div>
              </div>
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
