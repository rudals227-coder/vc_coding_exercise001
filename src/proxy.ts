import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Next.js 16: middleware 규약은 proxy로 이름이 바뀌었다. next-intl 미들웨어만 둔다.
// 인증 확인은 여기서 하지 않고 서버 컴포넌트의 requireRole에서 한다.
export default createMiddleware(routing);

export const config = {
  // api, _next, 정적 파일(확장자 포함)은 제외
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
