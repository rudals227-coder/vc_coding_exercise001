import { redirect } from "@/i18n/routing";
import { DomainError } from "@/lib/errors";
import type { Role } from "@/generated/prisma/enums";
import { requireRole, type SessionUser } from "./roles";

/**
 * 페이지/레이아웃용 가드. 권한이 없으면 FORBIDDEN을 던지는 대신 로그인 페이지로 보낸다.
 * (클라이언트 내비게이션에서는 레이아웃이 다시 실행되지 않으므로 각 페이지가 직접 호출한다.)
 */
export async function requirePageRole(
  locale: string,
  ...allowed: Role[]
): Promise<SessionUser> {
  let user: SessionUser | null = null;
  try {
    user = await requireRole(...allowed);
  } catch (e) {
    if (!(e instanceof DomainError && e.code === "FORBIDDEN")) throw e;
  }
  // redirect()는 예외로 동작하므로 try 밖에서 호출한다.
  if (!user) redirect({ href: "/sign-in", locale });
  return user as SessionUser;
}
