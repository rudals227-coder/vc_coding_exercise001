"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { getMapsConfig } from "./maps-config";

const RADIUS_M = 300;

function CircleOverlay({ center }: { center: { lat: number; lng: number } }) {
  const map = useMap();
  const { lat, lng } = center;
  useEffect(() => {
    if (!map) return;
    const circle = new google.maps.Circle({
      map,
      center: { lat, lng },
      radius: RADIUS_M,
      strokeColor: "#2563eb",
      strokeWeight: 2,
      fillColor: "#2563eb",
      fillOpacity: 0.15,
    });
    return () => circle.setMap(null);
  }, [map, lat, lng]);
  return null;
}

/** 대략 좌표 중심 반경 300m 원. 정확한 위치를 암시하므로 마커는 두지 않는다. */
export function ApproxCircleMap({ lat, lng }: { lat: number; lng: number }) {
  const t = useTranslations("room");
  const maps = getMapsConfig();

  if (!maps) {
    return (
      <div
        data-testid="map-fallback"
        className="flex h-48 items-center justify-center rounded-lg border bg-muted p-4 text-sm text-muted-foreground"
      >
        {t("approximateLocation")}
      </div>
    );
  }

  return (
    <div className="h-64 overflow-hidden rounded-lg border" data-testid="approx-map">
      <APIProvider apiKey={maps.apiKey}>
        <Map
          mapId={maps.mapId}
          defaultCenter={{ lat, lng }}
          defaultZoom={15}
          gestureHandling="cooperative"
          disableDefaultUI
        >
          <CircleOverlay center={{ lat, lng }} />
        </Map>
      </APIProvider>
    </div>
  );
}
