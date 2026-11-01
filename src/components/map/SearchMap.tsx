"use client";

import { useLocale, useTranslations } from "next-intl";
import { AdvancedMarker, APIProvider, Map } from "@vis.gl/react-google-maps";
import type { MapMarker } from "@/modules/search/service";
import { getMapsConfig, SEOUL_CENTER } from "./maps-config";

export function SearchMap({ markers }: { markers: MapMarker[] }) {
  const t = useTranslations("search");
  const locale = useLocale();
  const maps = getMapsConfig();

  if (!maps) {
    return (
      <div
        data-testid="map-fallback"
        className="flex h-full min-h-64 items-center justify-center rounded-lg border bg-muted p-4 text-sm text-muted-foreground"
      >
        {t("mapUnavailable")}
      </div>
    );
  }

  const fmt = new Intl.NumberFormat(locale, { style: "currency", currency: "KRW", maximumFractionDigits: 0 });
  return (
    <div className="h-full min-h-64 overflow-hidden rounded-lg border" data-testid="search-map">
      <APIProvider apiKey={maps.apiKey}>
        <Map
          mapId={maps.mapId}
          defaultCenter={SEOUL_CENTER}
          defaultZoom={11}
          gestureHandling="greedy"
          disableDefaultUI
        >
          {markers.map((m) => (
            <AdvancedMarker key={m.propertyId} position={{ lat: m.approxLat, lng: m.approxLng }}>
              <span
                data-testid="map-marker"
                className="rounded-full border bg-white px-2 py-0.5 text-xs font-medium shadow"
              >
                {fmt.format(m.minRent)}
              </span>
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}
