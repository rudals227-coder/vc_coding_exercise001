import { describe, expect, it } from "vitest";
import { parsePin, serializePin } from "@/components/map/pin";

describe("serializePin", () => {
  it("submits nothing when the pin was not edited", () => {
    expect(serializePin({ lat: "37.5", lng: "127.0", dirty: false })).toBeUndefined();
  });
  it("submits the pin when edited and both coordinates are valid", () => {
    expect(serializePin({ lat: "37.5", lng: "127.1", dirty: true })).toEqual({ lat: 37.5, lng: 127.1 });
  });
  it("never fills a missing coordinate (no Seoul-center default, no 0)", () => {
    expect(serializePin({ lat: "37.5", lng: "", dirty: true })).toBeUndefined();
    expect(serializePin({ lat: "", lng: "127.1", dirty: true })).toBeUndefined();
    expect(serializePin({ lat: "", lng: "", dirty: true })).toBeUndefined();
  });
  it("rejects non-numeric and out-of-range values", () => {
    expect(serializePin({ lat: "abc", lng: "127", dirty: true })).toBeUndefined();
    expect(serializePin({ lat: "91", lng: "127", dirty: true })).toBeUndefined();
    expect(serializePin({ lat: "37", lng: "181", dirty: true })).toBeUndefined();
  });
});

describe("parsePin", () => {
  it("accepts zero as a real coordinate but not blank", () => {
    expect(parsePin("0", "0")).toEqual({ lat: 0, lng: 0 });
    expect(parsePin(" ", "0")).toBeNull();
  });
});
