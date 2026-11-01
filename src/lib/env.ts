import { z } from "zod";

// 외부 서비스 키: 프로덕션에서만 필수. 없으면 해당 기능은 우아하게 비활성화된다.
const EXTERNAL_KEYS = [
  "AUTH_RESEND_KEY",
  "AUTH_GOOGLE_ID",
  "AUTH_GOOGLE_SECRET",
  "EMAIL_FROM",
  "GOOGLE_MAPS_SERVER_KEY",
  "NEXT_PUBLIC_GOOGLE_MAPS_KEY",
  "NEXT_PUBLIC_GOOGLE_MAP_ID",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

// 빈 문자열은 "없음"으로 취급한다(.env.example이 빈 값을 쓰므로).
const blankToUndefined = (v: unknown) => (v === "" ? undefined : v);
const optionalString = z.preprocess(blankToUndefined, z.string().optional());
const requiredString = z.string({ error: "is required" }).min(1, "is required");

const envSchema = z.object({
  DATABASE_URL: requiredString,
  AUTH_SECRET: requiredString,
  AUTH_RESEND_KEY: optionalString,
  AUTH_GOOGLE_ID: optionalString,
  AUTH_GOOGLE_SECRET: optionalString,
  EMAIL_FROM: optionalString,
  GOOGLE_MAPS_SERVER_KEY: optionalString,
  NEXT_PUBLIC_GOOGLE_MAPS_KEY: optionalString,
  NEXT_PUBLIC_GOOGLE_MAP_ID: optionalString,
  SUPABASE_URL: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  SUPABASE_BUCKET: z.preprocess(blankToUndefined, z.string().default("room-photos")),
  FX_MARKUP_BPS: z.preprocess(
    blankToUndefined,
    z.coerce.number().int().nonnegative().default(300),
  ),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);
  const problems = result.success
    ? []
    : result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);

  if (raw.NODE_ENV === "production") {
    for (const key of EXTERNAL_KEYS) {
      if (!raw[key]) problems.push(`${key}: is required in production`);
    }
  }

  if (problems.length > 0 || !result.success) {
    throw new Error(`Invalid environment variables: ${problems.join("; ")}`);
  }
  return result.data;
}

// 서버 전용 모듈: 서버 코드에서만 import 한다.
// import 시점이 아니라 첫 접근 시점에 검증한다(빌드·테스트가 env 없이도 모듈을 import 할 수 있도록).
let cached: Env | undefined;
export const env: Env = new Proxy({} as Env, {
  get(_target, prop) {
    cached ??= parseEnv(process.env);
    return cached[prop as keyof Env];
  },
});
