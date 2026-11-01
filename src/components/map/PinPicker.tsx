"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdvancedMarker, APIProvider, Map } from "@vis.gl/react-google-maps";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMapsConfig, SEOUL_CENTER } from "./maps-config";

type Pin = { lat: number; lng: number };

// 폼 필드 `lat`/`lng`로 제출된다. 값이 비어 있으면 서버가 주소를 지오코딩한다.
export function PinPicker({ defaultValue }: { defaultValue?: Pin }) {
  const t = useTranslations("admin.fields");
  const maps = getMapsConfig();
  const [pin, setPin] = useState<Pin | null>(defaultValue ?? null);

  if (!maps) {
    return (
      <fieldset data-testid="map-fallback" className="grid gap-2">
        <p className="text-sm text-muted-foreground">{t("pinHint")}</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label htmlFor="pin-lat">{t("latitude")}</Label>
            <Input
              id="pin-lat"
              name="lat"
              type="number"
              step="any"
              value={pin?.lat ?? ""}
              onChange={(e) => {
                const lat = e.target.value === "" ? NaN : Number(e.target.value);
                setPin((p) => (Number.isNaN(lat) ? null : { lat, lng: p?.lng ?? SEOUL_CENTER.lng }));
              }}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="pin-lng">{t("longitude")}</Label>
            <Input
              id="pin-lng"
              name="lng"
              type="number"
              step="any"
              value={pin?.lng ?? ""}
              onChange={(e) => {
                const lng = e.target.value === "" ? NaN : Number(e.target.value);
                setPin((p) => (Number.isNaN(lng) ? null : { lat: p?.lat ?? SEOUL_CENTER.lat, lng }));
              }}
            />
          </div>
        </div>
      </fieldset>
    );
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted-foreground">{t("pinHint")}</p>
      <div className="h-72 w-full overflow-hidden rounded-lg border">
        <APIProvider apiKey={maps.apiKey}>
          <Map
            mapId={maps.mapId}
            defaultCenter={pin ?? SEOUL_CENTER}
            defaultZoom={pin ? 15 : 11}
            gestureHandling="greedy"
            disableDefaultUI
            onClick={(e) => {
              const ll = e.detail.latLng;
              if (ll) setPin({ lat: ll.lat, lng: ll.lng });
            }}
          >
            {pin && (
              <AdvancedMarker
                position={pin}
                draggable
                onDragEnd={(e) => {
                  if (e.latLng) setPin({ lat: e.latLng.lat(), lng: e.latLng.lng() });
                }}
              />
            )}
          </Map>
        </APIProvider>
      </div>
      <input type="hidden" name="lat" value={pin?.lat ?? ""} />
      <input type="hidden" name="lng" value={pin?.lng ?? ""} />
    </div>
  );
}
