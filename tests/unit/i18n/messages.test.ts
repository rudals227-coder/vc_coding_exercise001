import { describe, expect, it } from "vitest";
import en from "../../../messages/en.json";
import ko from "../../../messages/ko.json";
import { ALL_ERROR_CODES } from "@/lib/errors";

function flatKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj)
    .flatMap(([k, v]) =>
      v && typeof v === "object"
        ? flatKeys(v as Record<string, unknown>, `${prefix}${k}.`)
        : [`${prefix}${k}`],
    )
    .sort();
}

describe("messages", () => {
  it("en and ko have identical key sets", () => {
    expect(flatKeys(ko)).toEqual(flatKeys(en));
  });
  it("every ErrorCode has a message in both locales", () => {
    for (const code of ALL_ERROR_CODES) {
      expect((en.errors as Record<string, string>)[code]).toBeTruthy();
      expect((ko.errors as Record<string, string>)[code]).toBeTruthy();
    }
  });
  it("has the required namespaces", () => {
    for (const ns of ["common", "search", "room", "admin", "errors"]) {
      expect(en).toHaveProperty(ns);
    }
  });
});
