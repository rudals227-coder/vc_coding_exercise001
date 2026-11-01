import NextAuth from "next-auth";
import type { Provider } from "next-auth/providers";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import type { Role } from "@/generated/prisma/enums";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      roles: Role[];
    };
  }
}

// 외부 키가 없으면 해당 로그인 수단은 비활성화된다(R3).
function buildProviders(): Provider[] {
  const providers: Provider[] = [];
  if (env.AUTH_RESEND_KEY && env.EMAIL_FROM) {
    providers.push(Resend({ apiKey: env.AUTH_RESEND_KEY, from: env.EMAIL_FROM }));
  }
  if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) {
    providers.push(
      Google({
        clientId: env.AUTH_GOOGLE_ID,
        clientSecret: env.AUTH_GOOGLE_SECRET,
        // Google이 이메일 소유를 검증하므로, 시드된 관리자/매직링크 사용자도 같은 이메일로 연결된다.
        allowDangerousEmailAccountLinking: true,
      }),
    );
  }
  return providers;
}

export const { handlers, auth, signIn, signOut } = NextAuth(() => ({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  providers: buildProviders(),
  pages: { signIn: "/en/sign-in" },
  trustHost: true,
  callbacks: {
    // database 전략: user는 어댑터가 읽어온 DB 사용자(roles 포함).
    session({ session, user }) {
      const dbUser = user as typeof user & { roles?: Role[] };
      session.user.id = user.id;
      session.user.roles = dbUser.roles ?? ["GUEST"];
      return session;
    },
  },
}));

// 로그인 페이지가 보여줄 수단(키가 설정된 것만).
export function enabledAuthMethods(): { email: boolean; google: boolean } {
  return {
    email: Boolean(env.AUTH_RESEND_KEY && env.EMAIL_FROM),
    google: Boolean(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET),
  };
}
