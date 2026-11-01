import { z } from "zod";
import { DomainError, type ErrorCode } from "@/lib/errors";
import { requireRole, type SessionUser } from "@/modules/auth/roles";

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; code: ErrorCode; fieldErrors?: Record<string, string[]> };

/**
 * 모든 관리자 Server Action 의 공통 래퍼.
 * 인증/권한 확인 → 실행 → 오류를 클라이언트에 안전한 코드로 변환한다.
 * 도메인 오류가 아닌 예외의 메시지는 클라이언트에 노출하지 않는다.
 */
export async function runAction(
  fn: (user: SessionUser) => Promise<{ id?: string } | void>,
): Promise<ActionResult> {
  try {
    const user = await requireRole("HOST", "ADMIN");
    const out = await fn(user);
    return { ok: true, ...(out && out.id ? { id: out.id } : {}) };
  } catch (e) {
    if (e instanceof DomainError) return { ok: false, code: e.code };
    if (e instanceof z.ZodError) {
      return {
        ok: false,
        code: "VALIDATION_FAILED",
        fieldErrors: z.flattenError(e).fieldErrors as Record<string, string[]>,
      };
    }
    console.error("admin action failed", e);
    return { ok: false, code: "INTERNAL" };
  }
}
