"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AdvancedMarker, APIProvider, Map } from "@vis.gl/react-google-maps";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMapsConfig, SEOUL_CENTER } from "./maps-config";
import { parsePin, type Pin } from "./pin";

// 폼 필드 `lat`/`lng`/`pinDirty`로 제출된다. 사용자가 핀을 바꾸지 않았다면(`pinDirty` 비어 있음)
// 폼은 핀을 보내지 않고, 서버가 필요할 때 주소를 지오코딩한다.
export function PinPicker({ defaultValue }: { defaultValue?: Pin }) {
  const t = useTranslations("admin.fields");
  const maps = getMapsConfig();
  const [lat, setLat] = useState(defaultValue ? String(defaultValue.lat) : "");
  const [lng, setLng] = useState(defaultValue ? String(defaultValue.lng) : "");
  const [dirty, setDirty] = useState(false);
  const pin = parsePin(lat, lng);

  function setPin(p: Pin) {
    setLat(String(p.lat));
    setLng(String(p.lng));
    setDirty(true);
  }

  const dirtyField = <input type="hidden" name="pinDirty" value={dirty ? "1" : ""} />;

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
              value={lat}
              onChange={(e) => {
                setLat(e.target.value);
                setDirty(true);
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
              value={lng}
              onChange={(e) => {
                setLng(e.target.value);
                setDirty(true);
              }}
            />
          </div>
        </div>
        {dirtyField}
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
      <input type="hidden" name="lat" value={lat} />
      <input type="hidden" name="lng" value={lng} />
      {dirtyField}
    </div>
  );
}
