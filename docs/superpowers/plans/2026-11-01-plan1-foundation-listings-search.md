# hometohome 계획 1: 기반 · 가격 계산 · 숙소 관리 · 검색/지도 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자가 숙소·방을 등록하고, 게스트가 영어/한국어로 방을 검색·지도에서 확인하고 가격 미리보기를 볼 수 있는 Next.js 앱(예약·결제 제외)을 만든다.

**Architecture:** 단일 Next.js(App Router) 앱. 도메인 로직은 `src/modules/<이름>`의 서비스 함수로 두고 화면과 API는 서비스만 호출한다. 가격 계산은 DB 없는 순수 함수 모듈. 전체 DB 스키마(예약·결제 테이블 포함)와 이중 예약 배타 제약은 이 계획에서 만들어 계획 2·3이 그대로 쓴다.

**Tech Stack:** Next.js(App Router, 최신 안정판) + TypeScript(strict), Prisma + PostgreSQL 16, Auth.js v5(`next-auth@5`, `@auth/prisma-adapter`, Resend·Google 프로바이더), next-intl, zod, Tailwind + shadcn/ui, `@vis.gl/react-google-maps`, `@supabase/supabase-js`(Storage), Vitest, Playwright, Docker Compose(로컬 DB).

**Spec:** `docs/superpowers/specs/2026-11-01-hometohome-mvp-design.md`

**후속 계획(이 계획 완료 후 작성):**
- 계획 2: 예약 상태 전이, 승인·만료·자동거절 Cron, PortOne V2 결제(엑심베이·PayPal), 웹훅, 환율 수집, 이메일 알림.
- 계획 3: 월세 청구서·연체, 보증금 원장, 취소·환불·중도퇴실, 관리자 입주자 화면, 정적 정책 페이지, Sentry, Vercel·도메인 배포.

## Global Constraints

- 금액은 정수: KRW는 원, USD는 센트. 부동소수점으로 금액을 저장·비교하지 않는다.
- 날짜는 시간 없는 `DateOnly`(`"YYYY-MM-DD"` 문자열)로 다루고 DB는 `@db.Date`. 서울 기준. 체류 기간은 `[checkIn, checkOut)`.
- 일할: `floor(월세 × 일수 / 30)`.
- 최소 체류: `checkOut ≥ addMonthsClamped(checkIn, 1)` 그리고 숙박 수 ≥ 30. 최대: `checkOut ≤ addMonthsClamped(checkIn, 12)`.
- 월 구간 경계는 항상 최초 checkIn 기준 `addMonthsClamped(checkIn, k)`(해당 날짜 없으면 그 달 말일).
- 환불 단계: `checkIn - cancelDate` ≥ 30 → 첫 구간 월세·보증금 전액 / 7~29 → 첫 구간 월세 50%(원 단위 내림)·보증금 전액 / ≤ 6 → 보증금만.
- USD 환산: 여유분 3%(설정값 `FX_MARKUP_BPS=300`), 센트 단위 올림.
- 대략 좌표: 정확한 좌표에서 100~300m 무작위 이동.
- UI 언어 en(기본)·ko, URL `/en/...`·`/ko/...`. 호스트 입력 콘텐츠는 영어 단일.
- 역할: `GUEST`·`HOST`·`ADMIN`. 관리자 화면은 `HOST` 또는 `ADMIN`만.
- 모든 서버 입력은 zod로 검증. 도메인 오류는 `DomainError(code)`로 던진다.
- 패키지 매니저: npm. Node 20 LTS 이상.

## Review Focus

1. **자정 근처 시간대 밀림** — 사용자가 고른 날짜가 저장·표시 과정에서 하루 밀리면 안 된다. `new Date("YYYY-MM-DD")`를 로컬 시간으로 해석하지 않는다. → Task 2 테스트 `parseDateOnly round-trips without timezone shift`.
2. **역전·잘못된 날짜 범위** — checkOut ≤ checkIn, `"2026-02-30"` 같은 존재하지 않는 날짜는 `INVALID_DATE_RANGE`/`INVALID_DATE`로 거절. → Task 2·4 테스트.
3. **한쪽만 입력한 검색 기간** — 입주일만 있고 퇴실일이 없으면 날짜 필터 없이 검색하지 말고 검증 오류로 거절한다. → Task 9 테스트 `rejects one-sided date range`.
4. **지오코딩 실패** — 주소를 못 찾으면 좌표 null로 저장하지 않고 `GEOCODE_FAILED`로 저장 자체를 실패시킨다. → Task 7 테스트.
5. **정확한 좌표 유출** — 공개 검색·상세 응답에 `lat`/`lng`/`address`가 절대 포함되지 않는다. → Task 9·10 테스트.

---

## File Structure

```
docker-compose.yml                    로컬·테스트 PostgreSQL (5432 dev, 5433 test)
.env.example                          필요한 환경변수 목록
vitest.config.ts                      단위 테스트 (tests/unit)
vitest.integration.config.ts          통합 테스트 (tests/integration, globalSetup으로 DB reset)
playwright.config.ts                  E2E (tests/e2e)
prisma/schema.prisma                  전체 스키마
prisma/migrations/*                   마이그레이션 (배타 제약 SQL 포함)
prisma/seed.ts                        관리자 1명 + 샘플 숙소 2개·방 4개
src/lib/env.ts                        zod 환경변수 검증
src/lib/db.ts                         Prisma 클라이언트 싱글턴
src/lib/errors.ts                     DomainError, ErrorCode
src/lib/date-only.ts                  DateOnly 타입과 날짜 유틸
src/modules/pricing/{config,segments,quote,stay,refund,fx,index}.ts
src/modules/auth/{auth.config,roles}.ts, src/auth.ts
src/i18n/{routing,request}.ts, messages/{en,ko}.json, src/middleware.ts
src/modules/listings/{schemas,geocode,approx,storage,service}.ts
src/modules/search/{schemas,service}.ts
src/app/[locale]/(public)/page.tsx                    검색 + 지도
src/app/[locale]/(public)/rooms/[roomId]/page.tsx     방 상세
src/app/[locale]/admin/...                            숙소·방 관리
src/components/map/*                                  지도 컴포넌트
tests/unit/**, tests/integration/**, tests/e2e/**
```

---

### Task 1: 프로젝트 골격과 테스트 환경

**Files:**
- Create: 프로젝트 루트 일체(`create-next-app`), `docker-compose.yml`, `.env.example`, `vitest.config.ts`, `vitest.integration.config.ts`, `src/lib/env.ts`, `src/lib/errors.ts`
- Test: `tests/unit/lib/env.test.ts`

**Interfaces:**
- Produces:
  - `env: Env` (`src/lib/env.ts`) — `DATABASE_URL`, `AUTH_SECRET`, `AUTH_RESEND_KEY`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `EMAIL_FROM`, `GOOGLE_MAPS_SERVER_KEY`, `NEXT_PUBLIC_GOOGLE_MAPS_KEY`, `NEXT_PUBLIC_GOOGLE_MAP_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`(기본 `"room-photos"`), `FX_MARKUP_BPS`(정수, 기본 300).
  - `parseEnv(raw: Record<string, string | undefined>): Env` — 누락 시 키 이름이 담긴 오류.
  - `class DomainError extends Error { code: ErrorCode; meta?: Record<string, unknown> }`
  - `type ErrorCode = "INVALID_DATE" | "INVALID_DATE_RANGE" | "STAY_TOO_SHORT" | "STAY_TOO_LONG" | "GEOCODE_FAILED" | "NOT_FOUND" | "FORBIDDEN" | "BOOKING_CONFLICT"`
  - npm 스크립트: `test`(단위), `test:int`(통합), `test:e2e`, `db:up`, `db:migrate`, `db:seed`.

- [ ] **Step 1: 골격 생성**

Run: `npx create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm`
그 뒤 `npx shadcn@latest init`(기본값), `npm i zod`, `npm i -D vitest @vitest/coverage-v8 vite-tsconfig-paths`.
`tsconfig.json`에 `"strict": true` 확인.

- [ ] **Step 2: docker-compose와 .env.example 작성**

`postgres:16` 서비스 두 개: `db`(5432, DB `hometohome`), `db_test`(5433, DB `hometohome_test`, tmpfs). `.env.example`에 Task 1의 모든 키를 빈 값으로, `DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5433/hometohome_test`.

- [ ] **Step 3: 실패하는 테스트 작성** — `tests/unit/lib/env.test.ts`

```ts
it("parses a complete env and defaults FX_MARKUP_BPS to 300", () => {
  const env = parseEnv(fullRaw({ FX_MARKUP_BPS: undefined }));
  expect(env.FX_MARKUP_BPS).toBe(300);
  expect(env.SUPABASE_BUCKET).toBe("room-photos");
});
it("names the missing key", () => {
  expect(() => parseEnv(fullRaw({ DATABASE_URL: undefined }))).toThrow(/DATABASE_URL/);
});
```
(`fullRaw(overrides)`는 테스트 파일 안의 헬퍼로 모든 키에 더미 값을 채운다.)

- [ ] **Step 4: 실패 확인** — Run: `npm test -- tests/unit/lib/env.test.ts` / Expected: FAIL (`parseEnv` 없음)

- [ ] **Step 5: `parseEnv`, `env`(= `parseEnv(process.env)`, 서버 전용 모듈), `DomainError` 구현**

- [ ] **Step 6: 통과 확인** — Run: `npm test` / Expected: PASS. `npm run build`도 성공.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: Next.js 골격, 테스트·로컬 DB 환경, env 검증"
```

---

### Task 2: DateOnly 날짜 유틸

**Files:**
- Create: `src/lib/date-only.ts`
- Test: `tests/unit/lib/date-only.test.ts`

**Interfaces:**
- Produces (`src/lib/date-only.ts`):
  - `type DateOnly = string` (브랜드 없이 `"YYYY-MM-DD"`)
  - `parseDateOnly(s: string): DateOnly` — 형식·실존 검증, 실패 시 `DomainError("INVALID_DATE")`
  - `addDays(d: DateOnly, n: number): DateOnly`
  - `diffDays(a: DateOnly, b: DateOnly): number` — `a - b` 일수
  - `addMonthsClamped(base: DateOnly, k: number): DateOnly`
  - `toDbDate(d: DateOnly): Date` / `fromDbDate(d: Date): DateOnly` — UTC 자정 기준 변환
  - `todayInSeoul(now?: Date): DateOnly`

내부 계산은 모두 `Date.UTC`로 한다. 로컬 시간대 API(`getDate`, `new Date("YYYY-MM-DD")` 후 로컬 메서드)는 쓰지 않는다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
it("addMonthsClamped clamps to month end from the original day", () => {
  expect(addMonthsClamped("2026-01-31", 1)).toBe("2026-02-28");
  expect(addMonthsClamped("2028-01-31", 1)).toBe("2028-02-29");
  expect(addMonthsClamped("2026-01-31", 2)).toBe("2026-03-31");
  expect(addMonthsClamped("2026-01-31", 3)).toBe("2026-04-30");
  expect(addMonthsClamped("2026-11-15", 2)).toBe("2027-01-15");
});
it("diffDays and addDays", () => {
  expect(diffDays("2026-03-01", "2026-02-01")).toBe(28);
  expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
});
it("parseDateOnly rejects malformed and non-existent dates", () => {
  for (const bad of ["2026-02-30", "2026-2-1", "abc", "2026-13-01"])
    expect(() => parseDateOnly(bad)).toThrowError(expect.objectContaining({ code: "INVALID_DATE" }));
});
it("parseDateOnly round-trips without timezone shift", () => {
  expect(fromDbDate(toDbDate("2026-03-15"))).toBe("2026-03-15");
});
it("todayInSeoul uses KST", () => {
  expect(todayInSeoul(new Date("2026-03-14T15:30:00Z"))).toBe("2026-03-15");
});
```

- [ ] **Step 2: 실패 확인** — Run: `npm test -- tests/unit/lib/date-only.test.ts` / Expected: FAIL

- [ ] **Step 3: 구현** — `todayInSeoul`은 `Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" })`.

- [ ] **Step 4: 통과 확인** — Expected: PASS

- [ ] **Step 5: Commit** — `git add src/lib/date-only.ts tests/unit/lib/date-only.test.ts && git commit -m "feat: DateOnly 날짜 유틸"`

---

### Task 3: 가격 구간 분할과 견적

**Files:**
- Create: `src/modules/pricing/segments.ts`, `src/modules/pricing/quote.ts`, `src/modules/pricing/index.ts`
- Test: `tests/unit/pricing/quote.test.ts`

**Interfaces:**
- Consumes: Task 2의 `addMonthsClamped`, `diffDays`
- Produces:
  - `type Segment = { start: DateOnly; end: DateOnly; kind: "FULL" | "PRORATED"; nights: number; amount: number }`
  - `segments(checkIn: DateOnly, checkOut: DateOnly): Omit<Segment, "amount">[]`
  - `type Quote = { monthlyRent: number; deposit: number; segments: Segment[]; rentTotal: number; nights: number }`
  - `quote(room: { monthlyRent: number; deposit: number }, checkIn: DateOnly, checkOut: DateOnly): Quote` — 앞에서 `validateStay`(Task 4)를 호출하지 않는다. 검증은 호출부 책임.
  - `index.ts`는 pricing의 공개 API만 re-export.

```
segments: prev = checkIn; k = 1
  loop: b = addMonthsClamped(checkIn, k)
        if b <= checkOut: push FULL [prev, b); prev = b; k++
        else: if prev < checkOut: push PRORATED [prev, checkOut); break
        if prev == checkOut: break
```

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
const room = { monthlyRent: 600_000, deposit: 1_000_000 };
it("spec example: 3/15 → 5/25 is two full months + 10 prorated nights", () => {
  const q = quote(room, "2026-03-15", "2026-05-25");
  expect(q.segments.map(s => [s.start, s.end, s.kind, s.amount])).toEqual([
    ["2026-03-15", "2026-04-15", "FULL", 600_000],
    ["2026-04-15", "2026-05-15", "FULL", 600_000],
    ["2026-05-15", "2026-05-25", "PRORATED", 200_000],
  ]);
  expect(q.rentTotal).toBe(1_400_000);
  expect(q.nights).toBe(71);
  expect(q.deposit).toBe(1_000_000);
});
it("boundaries anchor on the original check-in day", () => {
  expect(segments("2026-01-31", "2026-04-30").map(s => s.end))
    .toEqual(["2026-02-28", "2026-03-31", "2026-04-30"]);
});
it("prorated amount floors to the won", () => {
  const q = quote({ monthlyRent: 550_001, deposit: 0 }, "2026-03-01", "2026-04-08");
  expect(q.segments[1]).toMatchObject({ kind: "PRORATED", nights: 7, amount: 128_333 });
});
it("exact one month yields one FULL segment", () => {
  expect(segments("2026-03-15", "2026-04-15")).toHaveLength(1);
});
```

- [ ] **Step 2: 실패 확인** — Run: `npm test -- tests/unit/pricing/quote.test.ts` / Expected: FAIL

- [ ] **Step 3: 구현** — 일할 금액은 `Math.floor(monthlyRent * nights / 30)`.

- [ ] **Step 4: 통과 확인** — Expected: PASS

- [ ] **Step 5: Commit** — `git commit -m "feat(pricing): 월 구간 분할과 견적"` (해당 파일만 add)

---

### Task 4: 체류 검증 · 환불액 · USD 환산

**Files:**
- Create: `src/modules/pricing/config.ts`, `src/modules/pricing/stay.ts`, `src/modules/pricing/refund.ts`, `src/modules/pricing/fx.ts`
- Modify: `src/modules/pricing/index.ts` (re-export)
- Test: `tests/unit/pricing/stay.test.ts`, `tests/unit/pricing/refund.test.ts`, `tests/unit/pricing/fx.test.ts`

**Interfaces:**
- Consumes: Task 2, Task 3의 `Segment`
- Produces:
  - `PRICING = { minNights: 30, minMonths: 1, maxMonths: 12 } as const` (`config.ts`)
  - `validateStay(checkIn: DateOnly, checkOut: DateOnly): void` — `INVALID_DATE_RANGE`(checkOut ≤ checkIn), `STAY_TOO_SHORT`, `STAY_TOO_LONG`
  - `type RefundResult = { tier: "FULL" | "HALF" | "DEPOSIT_ONLY"; rentRefund: number; depositRefund: number }`
  - `refundFor(snapshot: { segments: Pick<Segment, "amount">[]; deposit: number }, checkIn: DateOnly, cancelDate: DateOnly): RefundResult` — "첫 구간 월세" = `snapshot.segments[0].amount`
  - `toUsdCents(krw: number, krwPerUsd: number, markupBps: number): number` — 정수 계산: `rateCenti = Math.round(krwPerUsd * 100)`, 결과 = `ceil(krw * (10000 + markupBps) / rateCenti)`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// stay.test.ts
it("accepts exactly one month when it is ≥ 30 nights", () => expect(() => validateStay("2026-03-15", "2026-04-15")).not.toThrow());
it("rejects 1/31→2/28 (one month but 28 nights)", () => expectCode(() => validateStay("2026-01-31", "2026-02-28"), "STAY_TOO_SHORT"));
it("rejects 29 nights", () => expectCode(() => validateStay("2026-04-01", "2026-04-30"), "STAY_TOO_SHORT"));
it("accepts 30 nights spanning a full month", () => expect(() => validateStay("2026-04-01", "2026-05-01")).not.toThrow());
it("accepts exactly 12 months, rejects one day more", () => {
  expect(() => validateStay("2026-03-15", "2027-03-15")).not.toThrow();
  expectCode(() => validateStay("2026-03-15", "2027-03-16"), "STAY_TOO_LONG");
});
it("rejects reversed or empty range", () => {
  expectCode(() => validateStay("2026-03-15", "2026-03-15"), "INVALID_DATE_RANGE");
  expectCode(() => validateStay("2026-03-15", "2026-03-01"), "INVALID_DATE_RANGE");
});

// refund.test.ts — snap = { segments: [{ amount: 600_001 }], deposit: 1_000_000 }, checkIn "2026-05-01"
it("30 days before → FULL", () => expect(refundFor(snap, "2026-05-01", "2026-04-01")).toEqual({ tier: "FULL", rentRefund: 600_001, depositRefund: 1_000_000 }));
it("29 days before → HALF, floored", () => expect(refundFor(snap, "2026-05-01", "2026-04-02")).toEqual({ tier: "HALF", rentRefund: 300_000, depositRefund: 1_000_000 }));
it("7 days before → HALF", () => expect(refundFor(snap, "2026-05-01", "2026-04-24").tier).toBe("HALF"));
it("6 days before → DEPOSIT_ONLY", () => expect(refundFor(snap, "2026-05-01", "2026-04-25")).toEqual({ tier: "DEPOSIT_ONLY", rentRefund: 0, depositRefund: 1_000_000 }));
it("after check-in → DEPOSIT_ONLY", () => expect(refundFor(snap, "2026-05-01", "2026-05-03").tier).toBe("DEPOSIT_ONLY"));

// fx.test.ts
it("adds 3% and rounds up to the cent", () => expect(toUsdCents(1_600_000, 1385.42, 300)).toBe(118_954));
it("exact division still rounds correctly", () => expect(toUsdCents(1_000_000, 1000, 0)).toBe(100_000));
```
(`expectCode(fn, code)`는 `tests/unit/helpers.ts`에 둔다: `DomainError`이고 `code`가 일치하는지 확인.)

- [ ] **Step 2: 실패 확인** — Run: `npm test -- tests/unit/pricing` / Expected: FAIL

- [ ] **Step 3: 구현** — `validateStay`는 `INVALID_DATE_RANGE` → 1개월 → 30박 → 12개월 순으로 검사.

- [ ] **Step 4: 통과 확인** — Expected: PASS

- [ ] **Step 5: Commit** — `git commit -m "feat(pricing): 체류 검증, 환불액, USD 환산"`

---

### Task 5: 전체 DB 스키마와 이중 예약 배타 제약

**Files:**
- Create: `prisma/schema.prisma`, `prisma/migrations/<ts>_init/migration.sql`, `prisma/migrations/<ts>_booking_no_overlap/migration.sql`, `src/lib/db.ts`, `tests/integration/global-setup.ts`, `tests/integration/helpers/db.ts`
- Test: `tests/integration/db/booking-overlap.test.ts`

**Interfaces:**
- Produces:
  - Prisma 모델: 명세 5장의 `User, Property, Room, RoomBlock, Booking, Invoice, Payment, Refund, DepositEntry, FxRate, WebhookEvent, AuditLog` 전부 + Auth.js 어댑터용 `Account, Session, VerificationToken`. 필드·enum 이름은 명세 5장과 동일(`BookingStatus = REQUESTED | APPROVED | CONFIRMED | COMPLETED | REJECTED | EXPIRED | CANCELLED` 등). 날짜 필드는 `@db.Date`, 금액은 `Int`, `FxRate.krwPerUsd`는 `Decimal(10,2)`, `User.roles Role[] @default([GUEST])`.
  - 인덱스: `Booking(roomId, status)`, `Room(propertyId)`, `Property(district, status)`, 고유 `Invoice(bookingId, seq)`, `Payment.portonePaymentId`, `WebhookEvent.eventId`, `FxRate.date`.
  - `db: PrismaClient` (`src/lib/db.ts`, 개발 중 핫리로드 싱글턴)
  - 테스트 헬퍼 `resetDb(): Promise<void>`(모든 테이블 TRUNCATE … CASCADE), `makeRoom(overrides?): Promise<Room>`(Property 포함 생성), `makeUser(roles?)`.

- [ ] **Step 1: 스키마 작성 후 init 마이그레이션 생성** — Run: `npm run db:up && npx prisma migrate dev --name init` / Expected: 마이그레이션 생성·적용 성공

- [ ] **Step 2: 실패하는 테스트 작성** — `tests/integration/db/booking-overlap.test.ts`

```ts
it("rejects overlapping APPROVED/CONFIRMED bookings on the same room", async () => {
  const room = await makeRoom(); const g = await makeUser();
  await book(room, g, "2026-03-15", "2026-05-15", "CONFIRMED");
  await expect(book(room, g, "2026-05-01", "2026-06-01", "APPROVED")).rejects.toThrow(/booking_no_overlap/);
});
it("allows adjacent ranges ([a,b) then [b,c))", async () => { /* 2026-03-15~04-15 CONFIRMED, 04-15~05-15 APPROVED → 성공 */ });
it("allows overlap when either is REQUESTED/EXPIRED/CANCELLED", async () => { /* 겹치는 REQUESTED 2건 + CONFIRMED 1건 → 성공 */ });
it("allows overlap on different rooms", async () => { /* ... */ });
```
(`book(...)`은 이 테스트 파일 안의 `db.booking.create` 래퍼. `priceSnapshot`에는 `{}` 대신 Task 3의 `quote` 결과를 넣는다.)

- [ ] **Step 3: 실패 확인** — Run: `npm run test:int -- booking-overlap` / Expected: 첫 테스트 FAIL (제약 없음)

- [ ] **Step 4: 배타 제약 마이그레이션 추가** — Run: `npx prisma migrate dev --create-only --name booking_no_overlap` 후 SQL에 명세 5장의 `CREATE EXTENSION IF NOT EXISTS btree_gist;` 와 `EXCLUDE USING gist (...) WHERE (status IN ('APPROVED','CONFIRMED'))` 추가, `npx prisma migrate dev`로 적용.

- [ ] **Step 5: 통과 확인** — Run: `npm run test:int` / Expected: PASS

- [ ] **Step 6: Commit** — `git commit -m "feat(db): 전체 스키마와 이중 예약 배타 제약"`

---

### Task 6: 인증 · 역할 · 다국어 라우팅

**Files:**
- Create: `src/auth.ts`, `src/modules/auth/roles.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/i18n/routing.ts`, `src/i18n/request.ts`, `messages/en.json`, `messages/ko.json`, `src/middleware.ts`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/sign-in/page.tsx`, `src/components/LocaleSwitcher.tsx`
- Test: `tests/unit/auth/roles.test.ts`, `tests/unit/i18n/messages.test.ts`

**Interfaces:**
- Consumes: Task 1 `env`, `DomainError`; Task 5 `db`
- Produces:
  - `auth()`, `signIn`, `signOut`, `handlers` (`src/auth.ts`) — Auth.js v5, Prisma 어댑터, `Resend`(매직링크, `from: env.EMAIL_FROM`) + `Google`. 세션 콜백이 `session.user.id`, `session.user.roles: Role[]`를 채운다.
  - `hasRole(user: { roles: Role[] } | null | undefined, ...allowed: Role[]): boolean`
  - `requireRole(...allowed: Role[]): Promise<SessionUser>` — 세션 없거나 역할 불일치 시 `DomainError("FORBIDDEN")`
  - `routing = defineRouting({ locales: ["en", "ko"], defaultLocale: "en", localePrefix: "always" })`, `Link`, `redirect`, `useRouter` (next-intl `createNavigation`)
  - 메시지 키 네임스페이스: `common`, `search`, `room`, `admin`, `errors`(ErrorCode별 1개씩)

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// roles.test.ts
it("hasRole", () => {
  expect(hasRole({ roles: ["GUEST"] }, "HOST", "ADMIN")).toBe(false);
  expect(hasRole({ roles: ["HOST", "ADMIN"] }, "ADMIN")).toBe(true);
  expect(hasRole(null, "GUEST")).toBe(false);
});
// messages.test.ts
it("en and ko have identical key sets", () => expect(flatKeys(ko)).toEqual(flatKeys(en)));
it("every ErrorCode has a message", () => {
  for (const code of ALL_ERROR_CODES) expect(en.errors[code]).toBeTruthy();
});
```
(`ALL_ERROR_CODES`를 `src/lib/errors.ts`에서 `as const` 배열로 export하고 `ErrorCode`를 그 배열에서 유도하도록 Task 1 코드를 수정한다.)

- [ ] **Step 2: 실패 확인** — Run: `npm test -- tests/unit/auth tests/unit/i18n` / Expected: FAIL

- [ ] **Step 3: 구현** — `npm i next-auth@5 @auth/prisma-adapter next-intl`. 미들웨어는 next-intl 미들웨어만(쿠키 `NEXT_LOCALE`로 선택 저장, 미지원 locale은 `/en`으로). 인증 확인은 미들웨어가 아니라 서버 컴포넌트의 `requireRole`에서 한다. `prisma/seed.ts`에서 `ADMIN_EMAIL` 환경변수의 사용자를 `["GUEST","HOST","ADMIN"]`으로 upsert.

- [ ] **Step 4: 통과 확인** — Run: `npm test` / Expected: PASS. 수동: `npm run dev` → `/` 접속 시 `/en`으로 이동, `/ko`에서 LocaleSwitcher로 `/en` 전환, 매직링크 로그인 성공.

- [ ] **Step 5: Commit** — `git commit -m "feat: Auth.js 로그인, 역할, next-intl 다국어 라우팅"`

---

### Task 7: 숙소·방 서비스 (지오코딩, 대략 좌표, 사진, 입주 불가 기간)

**Files:**
- Create: `src/modules/listings/schemas.ts`, `geocode.ts`, `approx.ts`, `storage.ts`, `service.ts`
- Test: `tests/unit/listings/approx.test.ts`, `tests/integration/listings/service.test.ts`

**Interfaces:**
- Consumes: Task 1~6
- Produces:
  - zod: `propertyInput` (title, description, address, addressDetail?, district ∈ 서울 25개 구 영문 slug 상수 `SEOUL_DISTRICTS`, amenities: string[], houseRules), `roomInput` (name, roomType, capacity 1~8, monthlyRent·deposit 정수 0~100,000,000, options: string[]), `roomBlockInput` (startDate, endDate DateOnly, reason)
  - `type Geocoder = (address: string) => Promise<{ lat: number; lng: number } | null>`; `googleGeocoder: Geocoder` (Geocoding API, `region=kr`, `GOOGLE_MAPS_SERVER_KEY`)
  - `approximate(lat: number, lng: number, rand?: () => number): { lat: number; lng: number }` — 거리 100~300m, 무작위 방위
  - `uploadRoomPhoto(roomId: string, file: File): Promise<string>` (공개 URL) — Supabase Storage `env.SUPABASE_BUCKET`, jpeg/png/webp, 5MB 이하
  - `listingsService(deps: { db; geocode: Geocoder })` 반환 객체:
    - `createProperty(hostId, input, pin?: { lat; lng }): Promise<Property>` — `pin`이 있으면 지오코딩 생략(핀 보정), 없으면 지오코딩, 실패 시 `GEOCODE_FAILED`. approx 좌표는 정확 좌표가 바뀔 때만 다시 만든다.
    - `updateProperty(actor, id, input, pin?)`, `createRoom(actor, propertyId, input)`, `updateRoom(actor, id, input)`, `setStatus(actor, kind: "property" | "room", id, status)`, `addRoomBlock(actor, roomId, input)`, `removeRoomBlock(actor, blockId)`
    - 모든 변경 함수는 actor가 소유 호스트이거나 ADMIN이 아니면 `FORBIDDEN`.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// approx.test.ts
it("moves 100–300 m for many random draws", () => {
  for (let i = 0; i < 1000; i++) {
    const p = approximate(37.5665, 126.978);
    const d = haversineMeters(37.5665, 126.978, p.lat, p.lng);
    expect(d).toBeGreaterThanOrEqual(100); expect(d).toBeLessThanOrEqual(300);
  }
});
// service.test.ts (fake geocoder)
it("stores exact and approx coords", async () => { /* geocode → {37.5,127.0}; property.lat==37.5, approx≠exact */ });
it("fails with GEOCODE_FAILED and stores nothing when address not found", async () => {
  const svc = listingsService({ db, geocode: async () => null });
  await expectCodeAsync(svc.createProperty(host.id, validInput), "GEOCODE_FAILED");
  expect(await db.property.count()).toBe(0);
});
it("uses the dragged pin without geocoding", async () => { /* geocode spy not called */ });
it("forbids editing another host's room", async () => { /* FORBIDDEN */ });
it("rejects RoomBlock with endDate <= startDate", async () => { /* INVALID_DATE_RANGE */ });
```

- [ ] **Step 2: 실패 확인** — Run: `npm test -- tests/unit/listings && npm run test:int -- listings` / Expected: FAIL

- [ ] **Step 3: 구현** — `npm i @supabase/supabase-js`. `haversineMeters`는 `approx.ts`에서 export.

- [ ] **Step 4: 통과 확인** — Expected: PASS

- [ ] **Step 5: Commit** — `git commit -m "feat(listings): 숙소·방 서비스, 지오코딩, 대략 좌표, 입주 불가 기간"`

---

### Task 8: 관리자 숙소·방 관리 화면

**Files:**
- Create: `src/app/[locale]/admin/layout.tsx`(`requireRole("HOST","ADMIN")`), `admin/properties/page.tsx`(목록), `admin/properties/new/page.tsx`, `admin/properties/[id]/page.tsx`(수정 + 방 목록), `admin/rooms/[id]/page.tsx`(방 수정, 사진, 입주 불가 기간), `admin/actions.ts`(Server Actions), `src/components/map/PinPicker.tsx`
- Test: `tests/e2e/admin-listing.spec.ts`

**Interfaces:**
- Consumes: Task 6 `requireRole`, Task 7 `listingsService`, `uploadRoomPhoto`, zod 스키마
- Produces: Server Actions `createPropertyAction`, `updatePropertyAction`, `createRoomAction`, `updateRoomAction`, `setStatusAction`, `addRoomBlockAction`, `removeRoomBlockAction`, `uploadPhotoAction` — 반환 `{ ok: true } | { ok: false; code: ErrorCode; fieldErrors?: Record<string, string[]> }`. 화면은 `code`를 `errors.<code>` 메시지로 보여준다.

- [ ] **Step 1: 실패하는 E2E 작성** — `tests/e2e/admin-listing.spec.ts`

시드 관리자로 로그인(Playwright 전용: `E2E_AUTH_BYPASS=1`일 때만 활성화되는 `/api/test/login?email=` 라우트, production 빌드에서는 404) → 숙소 생성(주소 입력, 지오코더는 `E2E_FAKE_GEOCODER=1`이면 고정 좌표) → 방 생성(월세 600000, 보증금 1000000) → 게시(PUBLISHED) → 목록에 표시되는지 확인. 지오코딩 실패 주소 `"__notfound__"` 입력 시 `errors.GEOCODE_FAILED` 문구가 보이는지 확인.

- [ ] **Step 2: 실패 확인** — Run: `npm run test:e2e -- admin-listing` / Expected: FAIL

- [ ] **Step 3: 화면 구현** — shadcn Form + zod resolver. `PinPicker`는 `@vis.gl/react-google-maps`의 드래그 가능한 `AdvancedMarker`. 금액 입력은 콤마 표시, 저장은 정수.

- [ ] **Step 4: 통과 확인** — Expected: PASS

- [ ] **Step 5: Commit** — `git commit -m "feat(admin): 숙소·방 관리 화면"`

---

### Task 9: 검색 서비스

**Files:**
- Create: `src/modules/search/schemas.ts`, `src/modules/search/service.ts`
- Test: `tests/integration/search/service.test.ts`, `tests/unit/search/schemas.test.ts`

**Interfaces:**
- Consumes: Task 2, 4(`validateStay`), 5, 7(`SEOUL_DISTRICTS`)
- Produces:
  - `searchQuery` zod: `district?`, `checkIn?`, `checkOut?`, `minRent?`, `maxRent?`, `roomType?`, `options?: string[]`, `sort: "price_asc" | "price_desc" | "newest"`(기본 `newest`), `page`(기본 1, 20개씩). checkIn·checkOut은 둘 다 있거나 둘 다 없어야 한다(`INVALID_DATE_RANGE`). 둘 다 있으면 `validateStay`도 통과해야 한다.
  - `type PublicRoomCard = { roomId; propertyId; title; roomName; district; roomType; monthlyRent; deposit; photo: string | null; approxLat; approxLng }` — `lat`, `lng`, `address` 없음.
  - `searchRooms(q: SearchQuery): Promise<{ items: PublicRoomCard[]; total: number }>` — Room·Property 모두 PUBLISHED만. 기간이 있으면 `[checkIn, checkOut)`과 겹치는 APPROVED/CONFIRMED Booking 또는 RoomBlock이 있는 방 제외.
  - `mapMarkers(q): Promise<{ propertyId; approxLat; approxLng; minRent; roomCount }[]>` — 같은 필터, Property 단위 집계.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// schemas.test.ts
it("rejects one-sided date range", () => expect(searchQuery.safeParse({ checkIn: "2026-03-01" }).success).toBe(false));
it("rejects a too-short stay", () => expect(searchQuery.safeParse({ checkIn: "2026-03-01", checkOut: "2026-03-20" }).success).toBe(false));
// service.test.ts
it("excludes rooms with overlapping CONFIRMED booking or RoomBlock", async () => { /* 3 rooms: free / confirmed overlap / block overlap → only free */ });
it("keeps rooms whose booking is adjacent or only REQUESTED", async () => { /* ... */ });
it("excludes DRAFT/HIDDEN rooms and rooms of HIDDEN properties", async () => { /* ... */ });
it("filters by district and rent range and sorts by price", async () => { /* ... */ });
it("never exposes exact coordinates or address", async () => {
  const { items } = await searchRooms({});
  for (const it of items) for (const k of ["lat", "lng", "address", "addressDetail"]) expect(it).not.toHaveProperty(k);
});
```

- [ ] **Step 2: 실패 확인** — Run: `npm run test:int -- search && npm test -- tests/unit/search` / Expected: FAIL

- [ ] **Step 3: 구현** — Prisma `findMany`에 `select`로 공개 필드만 고른다. 겹침 조건은 `checkIn < q.checkOut AND checkOut > q.checkIn`을 `none` 관계 필터로.

- [ ] **Step 4: 통과 확인** — Expected: PASS

- [ ] **Step 5: Commit** — `git commit -m "feat(search): 기간·필터 검색과 지도 마커"`

---

### Task 10: 공개 검색·지도·방 상세 화면

**Files:**
- Create: `src/app/[locale]/(public)/page.tsx`, `src/app/[locale]/(public)/rooms/[roomId]/page.tsx`, `src/app/api/quote/route.ts`, `src/components/map/SearchMap.tsx`, `src/components/map/ApproxCircleMap.tsx`, `src/components/search/Filters.tsx`, `src/components/search/RoomCard.tsx`, `src/components/room/QuotePreview.tsx`, `src/components/Money.tsx`, `src/modules/search/room-detail.ts`
- Test: `tests/integration/search/room-detail.test.ts`, `tests/integration/api/quote.test.ts`, `tests/e2e/public-search.spec.ts`

**Interfaces:**
- Consumes: Task 3·4 pricing, Task 6 i18n, Task 9 `searchRooms`, `mapMarkers`
- Produces:
  - `getPublicRoom(roomId): Promise<PublicRoomDetail | null>` (`room-detail.ts`) — `PublicRoomCard` + description, amenities, houseRules, options, photos[], capacity. PUBLISHED가 아니면 null. 정확 좌표·주소 없음.
  - `GET /api/quote?roomId&checkIn&checkOut` → `200 { quote: Quote }` 또는 `400 { code: ErrorCode }`. 서버에서 `validateStay` 후 `quote`.
  - `<Money krw={number} />` — `Intl.NumberFormat(locale, { style: "currency", currency: "KRW" })`. 계획 2에서 USD "≈" 표시를 덧붙인다.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// room-detail.test.ts
it("returns null for unpublished rooms", async () => { /* ... */ });
it("omits exact location", async () => { /* lat/lng/address 없음 */ });
// quote.test.ts (route handler 직접 호출)
it("returns the spec example quote", async () => { /* 3/15→5/25, rentTotal 1_400_000 */ });
it("returns 400 STAY_TOO_SHORT", async () => { /* 2026-04-01→04-30 */ });
```
`public-search.spec.ts`: `/en` 진입 → 지역·기간 입력 → 결과 카드와 지도 마커 표시 → 카드 클릭 → 상세에서 기간 선택 시 견적(구간별 금액, 총액, 보증금) 표시 → `/ko`로 전환 시 같은 화면이 한국어로 보임. 모바일 뷰포트(375px)에서 목록/지도 토글 동작.

- [ ] **Step 2: 실패 확인** — Run: `npm run test:int -- room-detail quote && npm run test:e2e -- public-search` / Expected: FAIL

- [ ] **Step 3: 구현** — 검색 조건은 URL 쿼리스트링에 둔다(공유 가능, 서버 컴포넌트에서 `searchQuery.safeParse`, 실패 시 필터 영역에 오류 문구). 지도는 `APIProvider`(`NEXT_PUBLIC_GOOGLE_MAPS_KEY`) + `Map`(`mapId=NEXT_PUBLIC_GOOGLE_MAP_ID`, 서울 중심 37.5665/126.978, zoom 11) + `AdvancedMarker`. 상세 지도는 approx 좌표 중심 반경 300m `Circle`, 마커 없음. 날짜 입력은 문자열 DateOnly 그대로 보내고 `Date` 객체로 바꾸지 않는다.

- [ ] **Step 4: 통과 확인** — Run: `npm test && npm run test:int && npm run test:e2e` / Expected: 모두 PASS

- [ ] **Step 5: Commit** — `git commit -m "feat: 공개 검색·지도·방 상세와 견적 미리보기"`

---

## 완료 기준 (계획 1)

- `npm test`, `npm run test:int`, `npm run test:e2e`, `npm run build` 모두 통과.
- 로컬에서: 관리자 로그인 → 숙소·방 등록·게시 → 게스트로 `/en` 검색 → 지도·상세·견적 확인 → `/ko` 전환.
- Google Maps 키는 개발용 키(HTTP 리퍼러 `localhost:3000` 제한)로 동작 확인.
