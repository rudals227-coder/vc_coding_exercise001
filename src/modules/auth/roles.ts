import type { Role } from "@/generated/prisma/enums";
import { DomainError } from "@/lib/errors";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  roles: Role[];
};

export function hasRole(
  user: { roles: Role[] } | null | undefined,
  ...allowed: Role[]
): boolean {
  if (!user) return false;
  return user.roles.some((r) => allowed.includes(r));
}

// 서버 컴포넌트/액션에서 사용. 세션이 없거나 역할이 맞지 않으면 FORBIDDEN.
export async function requireRole(...allowed: Role[]): Promise<SessionUser> {
  // 순수 함수(hasRole) 단위 테스트가 next-auth/db를 로드하지 않도록 지연 import 한다.
  const { auth } = await import("@/auth");
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email || !hasRole(user, ...allowed)) {
    throw new DomainError("FORBIDDEN");
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    roles: user.roles,
  };
}
