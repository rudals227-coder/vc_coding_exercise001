import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { parseDateOnly } from "@/lib/date-only";
import { DomainError } from "@/lib/errors";
import { quote, validateStay } from "@/modules/pricing";
import { getPublicRoom } from "@/modules/search/room-detail";

const params = z.object({
  roomId: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
});

export async function GET(req: Request): Promise<Response> {
  try {
    const sp = new URL(req.url).searchParams;
    const parsed = params.safeParse({
      roomId: sp.get("roomId") ?? undefined,
      checkIn: sp.get("checkIn") ?? undefined,
      checkOut: sp.get("checkOut") ?? undefined,
    });
    if (!parsed.success) return Response.json({ code: "VALIDATION_FAILED" }, { status: 400 });
    const checkIn = parseDateOnly(parsed.data.checkIn);
    const checkOut = parseDateOnly(parsed.data.checkOut);

    const room = await getPublicRoom(parsed.data.roomId);
    if (!room) return Response.json({ code: "NOT_FOUND" }, { status: 404 });

    validateStay(checkIn, checkOut);
    return Response.json({ quote: quote(room, checkIn, checkOut) });
  } catch (e) {
    if (e instanceof DomainError) return Response.json({ code: e.code }, { status: 400 });
    unstable_rethrow(e); // 프리렌더 중단 등 Next 내부 제어 흐름은 그대로 전파한다.
    console.error("GET /api/quote failed", e);
    return Response.json({ code: "INTERNAL" }, { status: 500 });
  }
}
