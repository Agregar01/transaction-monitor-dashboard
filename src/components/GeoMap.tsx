"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { GeoCountryStat, GeoCluster } from "@/types/api";
import { COUNTRY_CENTROIDS } from "@/app/dashboard/geo/page";

// Fix missing default icon images (Leaflet webpack issue)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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

function FitBounds() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds([[-35, -20], [37, 55]], { padding: [20, 20] });
  }, [map]);
  return null;
}

interface Props {
  countryStats: GeoCountryStat[];
  clusters: GeoCluster[];
}

export default function GeoMap({ countryStats, clusters }: Props) {
  const maxTxn = Math.max(...countryStats.map((c) => c.transaction_count), 1);

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
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
