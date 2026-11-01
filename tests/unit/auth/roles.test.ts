import { describe, expect, it } from "vitest";
import { hasRole } from "@/modules/auth/roles";

describe("hasRole", () => {
  it("checks allowed roles", () => {
    expect(hasRole({ roles: ["GUEST"] }, "HOST", "ADMIN")).toBe(false);
    expect(hasRole({ roles: ["HOST", "ADMIN"] }, "ADMIN")).toBe(true);
    expect(hasRole(null, "GUEST")).toBe(false);
    expect(hasRole(undefined, "GUEST")).toBe(false);
  });
});
