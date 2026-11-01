import { beforeEach, describe, expect, it } from "vitest";
import { GET } from "@/app/api/quote/route";
import { makeRoom, resetDb } from "../helpers/db";

beforeEach(resetDb);

const call = (qs: string) => GET(new Request(`http://localhost/api/quote?${qs}`));

describe("GET /api/quote", () => {
  it("returns the spec example quote", async () => {
    const room = await makeRoom({ monthlyRent: 600000, deposit: 1000000 });
    const res = await call(`roomId=${room.id}&checkIn=2026-03-15&checkOut=2026-05-25`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quote.rentTotal).toBe(1_400_000);
    expect(body.quote.deposit).toBe(1_000_000);
    expect(body.quote.segments).toHaveLength(3);
  });

  it("returns 400 STAY_TOO_SHORT", async () => {
    const room = await makeRoom();
    const res = await call(`roomId=${room.id}&checkIn=2026-04-01&checkOut=2026-04-30`);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ code: "STAY_TOO_SHORT" });
  });

  it("returns 400 for invalid or missing params", async () => {
    const room = await makeRoom();
    const bad = await call(`roomId=${room.id}&checkIn=2026-02-31&checkOut=2026-05-25`);
    expect(bad.status).toBe(400);
    expect(await bad.json()).toEqual({ code: "INVALID_DATE" });
    const missing = await call(`roomId=${room.id}`);
    expect(missing.status).toBe(400);
    expect(await missing.json()).toEqual({ code: "VALIDATION_FAILED" });
  });

  it("returns 404 for unknown or unpublished rooms", async () => {
    const draft = await makeRoom({ status: "DRAFT" });
    for (const id of ["nope", draft.id]) {
      const res = await call(`roomId=${id}&checkIn=2026-03-15&checkOut=2026-05-25`);
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ code: "NOT_FOUND" });
    }
  });
});
