import { randomUUID } from "node:crypto";
import { connection, NextResponse } from "next/server";

// Playwright 전용 로그인 우회. E2E_AUTH_BYPASS=1 이고 production 이 아닐 때만 동작한다.
function isAuthBypassEnabled(): boolean {
  return process.env.E2E_AUTH_BYPASS === "1" && process.env.NODE_ENV !== "production";
}

export async function GET(request: Request) {
  await connection(); // 빌드 시점 프리렌더 방지(항상 요청 시점에 평가)
  if (!isAuthBypassEnabled()) return new NextResponse(null, { status: 404 });

  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) return new NextResponse(null, { status: 400 });

  // 플래그가 꺼진 경우 DB를 건드리지 않도록 지연 import 한다.
  const { db } = await import("@/lib/db");
  const user = await db.user.findUnique({ where: { email } });
  if (!user) return new NextResponse(null, { status: 404 });

  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.session.create({ data: { sessionToken, userId: user.id, expires } });

  const res = NextResponse.redirect(new URL("/en/admin/properties", request.url));
  // database 전략: 쿠키 값이 곧 세션 토큰이다. http 에서는 접두어 없는 쿠키 이름을 쓴다.
  res.cookies.set("authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });
  return res;
}
