"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

/** 데스크톱은 목록+지도를 나란히, 모바일은 토글로 한쪽만 보여 준다. */
export function ResultsView({ list, map }: { list: ReactNode; map: ReactNode }) {
  const t = useTranslations("search");
  const [view, setView] = useState<"list" | "map">("list");
  const tab = (v: "list" | "map", label: string) => (
    <button
      type="button"
      aria-pressed={view === v}
      onClick={() => setView(v)}
      className={`flex-1 px-3 py-1.5 text-sm ${view === v ? "bg-foreground text-background" : ""}`}
    >
      {label}
    </button>
  );
  return (
    <div className="grid gap-3">
      <div className="flex overflow-hidden rounded border md:hidden">
        {tab("list", t("listView"))}
        {tab("map", t("mapView"))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div data-testid="list-panel" className={view === "list" ? "block" : "hidden md:block"}>
          {list}
        </div>
        <div
          data-testid="map-panel"
          className={`${view === "map" ? "block" : "hidden md:block"} h-[70vh] md:sticky md:top-4`}
        >
          {map}
        </div>
      </div>
    </div>
  );
}
