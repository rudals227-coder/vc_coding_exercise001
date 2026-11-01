# hometohome MVP 설계 명세

- 작성일: 2026-11-01
- 상태: 사용자 검토 대기

## 1. 목적과 배경

외국인을 주 타깃으로, 서울에서 1개월 이상 머무는 공유주택·단기임대를 **방 단위로** 검색·예약하는 웹 플랫폼 MVP를 만든다. 목표는 앱 출시 전에 **실결제(해외카드·PayPal)가 되는 안정적인 웹사이트**로 시장 반응을 검증하는 것이다.

- 기존 바이브 코딩 시제품 코드는 사용하지 않고 새로 구축한다. 외주 모집공고의 기능 요구사항(백엔드·DB, 가격·예약·입주자 관리, 지도, 카드·PayPal 결제, 배포)을 요구사항 원본으로 삼는다.
- 개발은 대표(풀스택 개발자) 1인이 진행한다.

### 성공 기준

1. 게스트가 영어로 방을 검색하고 지도에서 위치를 확인할 수 있다.
2. 게스트가 입주 신청 → 호스트 승인 → 24시간 내 결제(해외카드 또는 PayPal) → 예약 확정까지 완료할 수 있다.
3. 2회차 이후 월세가 청구서·결제 링크로 수납된다.
4. 관리자가 신청 승인, 입주자, 청구서, 보증금, 취소·환불을 관리할 수 있다.
5. 운영 도메인에서 HTTPS로 서비스되고, 실결제 채널로 결제가 이루어진다.

## 2. 확정된 비즈니스 규칙

| 항목 | 결정 |
|---|---|
| 사업자 | 국내 개인사업자 |
| 호스트 모델 | MVP는 대표가 운영하는 숙소만 등록. 데이터 모델은 다중 호스트를 지원하되 정산(Payout)은 제외 |
| 예약 흐름 | 신청 → 호스트 승인 시 24시간 방 확보 → 24시간 내 1회차 결제 시 확정, 미결제 시 자동 만료 |
| 호스트 응답 기한 | 신청 후 48시간 무응답 시 자동 거절 |
| 온라인 결제 범위 | 확정 시 첫 구간 월세 + 보증금. 이후 월세는 매 구간 청구서·결제 링크로 수납 |
| 가격 규칙 | 체크인일 기준 월 구간으로 분할. 온전한 구간은 월세 전액, 남는 일수는 `floor(월세 × 일수 / 30)` |
| 월 구간 | 다음 달 같은 날짜까지. 해당 날짜가 없으면 그 달 말일. 기준일은 항상 최초 체크인일 |
| 최소 체류 | 1개월 구간 이상 **그리고** 30박 이상 |
| 최대 체류 | 12개월(설정값) |
| 보증금 | 플랫폼(대표 사업자)이 수납·보관. 퇴실 후 관리자가 공제·반환 내역 기록, 송금은 오프라인 |
| 결제 통화 | 가격은 KRW 기준. 카드(엑심베이)는 KRW 결제. PayPal은 KRW 미지원이므로 결제 시점 환율 + 여유분 3%(설정값)로 USD 청구, 적용 환율 기록 |
| 취소 환불 | 입주 30일 전까지: 첫 달 월세·보증금 전액 / 7~29일 전: 첫 달 월세 50% + 보증금 전액 / 7일 이내: 보증금만. 관리자가 처리 |
| 중도 퇴실 | 관리자가 체크아웃일 단축 → 미발행 청구서는 생성하지 않음, 발행·미결제 청구서는 VOID |
| 위치 공개 | 확정 전에는 대략 좌표(100~300m 무작위 이동)와 반경 원, 확정 후 정확한 주소·핀 공개 |
| 언어 | UI는 영어(기본)·한국어. 호스트 입력 콘텐츠는 영어 단일 |
| 지도 | Google Maps |
| 로그인 | 이메일 매직링크 + Google 로그인 |

### 날짜 경계 정의

- "입주 N일 전"은 서울 시간대 기준 `checkIn - 취소일`의 일수로 계산한다. 30 이상 → 전액 단계, 7~29 → 50% 단계, 6 이하 → 보증금만 단계.
- 체류 기간은 `[checkIn, checkOut)` 반열린 구간이다. 숙박 수 = `checkOut - checkIn`.

## 3. 범위 밖 (MVP 제외)

- 외부 호스트 가입·심사·정산
- 리뷰, 호스트-게스트 메시지(문의는 이메일)
- 게스트 셀프 취소(관리자 처리)
- 해외카드 정기결제(빌링키)
- 위치 반경 검색(PostGIS), 다국어 콘텐츠 입력
- 미납 시 자동 강제 조치
- 모바일 앱

## 4. 아키텍처

### 4.1 기술 스택

- Next.js(App Router) + TypeScript, 단일 앱
- PostgreSQL(Supabase, 서울 리전) + Prisma
- Supabase Storage(이미지)
- PortOne V2: 엑심베이(해외카드, KRW), PayPal(USD) 채널
- Google Maps JavaScript API + Geocoding API
- Auth.js, next-intl, zod, shadcn/ui + Tailwind
- Resend(이메일), Sentry(오류 수집)
- Vercel(호스팅, Preview 배포, Cron)

### 4.2 모듈

각 모듈은 `src/modules/<이름>`의 서비스 함수로 구성한다. 화면(Server Component, Server Action)과 API 라우트는 서비스만 호출한다.

| 모듈 | 책임 | 의존 |
|---|---|---|
| `auth` | 로그인, 세션, 역할(GUEST/HOST/ADMIN) 확인 | DB |
| `listings` | 숙소·방 CRUD, 사진, 지오코딩, 대략 좌표 생성, RoomBlock | DB, Storage, Google Geocoding |
| `search` | 필터 검색, 가용성 판단, 지도 마커 데이터 | DB |
| `pricing` | 구간 분할, 견적, 체류 검증, 환불액, USD 환산 (순수 함수) | 없음 |
| `bookings` | 예약 상태 전이 전담, 만료·자동거절, 감사 로그 | DB, pricing, invoices, notifications |
| `payments` | 결제 준비, 결제 검증(멱등), 웹훅, 환불 | DB, PortOne, pricing |
| `invoices` | 청구서 생성·발행·연체 처리 | DB, pricing, notifications |
| `deposits` | 보증금 원장 기록 | DB |
| `notifications` | 영어·한국어 이메일 템플릿, 발송 | Resend |
| `fx` | 일 1회 KRW→USD 환율 수집·조회 | DB, 환율 API |
| `i18n` | UI 메시지, locale 라우팅 | next-intl |

MVP에서 대표 계정은 HOST와 ADMIN 역할을 모두 가진다.

### 4.3 화면

- 공개: 홈/검색(목록 + 지도, 모바일은 토글), 방 상세(가격 미리보기, 대략 위치)
- 게스트: 내 예약 목록·상세(확정 후 정확한 주소), 결제, 청구서 목록·결제
- 호스트·관리자: 숙소·방 관리, 입주 불가 기간, 신청 목록(충돌 표시)·승인·거절, 입주자 관리, 청구서, 보증금 원장, 취소·환불, 체크아웃일 단축
- 정적: 이용약관, 개인정보처리방침, 환불정책(문구는 대표가 준비)

URL은 `/en/...`, `/ko/...`. 기본 en. 첫 방문 시 브라우저 언어로 한 번 리다이렉트하고 선택한 언어는 쿠키에 저장한다.

### 4.4 정기 작업 (Vercel Cron)

| 작업 | 주기 | 내용 |
|---|---|---|
| `expire-holds` | 10분 | `holdExpiresAt` 지난 APPROVED 예약을 EXPIRED로. 진행 중인 PENDING 결제가 있으면 10분 유예 |
| `auto-reject` | 10분 | 생성 후 48시간 지난 REQUESTED를 REJECTED로 |
| `issue-invoices` | 매일 | 다음 구간 시작 7일 전인 CONFIRMED 예약에 청구서 생성 + 결제 링크 이메일 |
| `mark-overdue` | 매일 | 기한(구간 시작일) 지난 PENDING 청구서를 OVERDUE로, 독촉 메일, 관리자 표시 |
| `complete-stays` | 매일 | checkOut 지난 CONFIRMED를 COMPLETED로 |
| `fetch-fx` | 매일 | KRW→USD 환율 저장 |

모든 작업은 멱등이며 대상 행은 `FOR UPDATE SKIP LOCKED`로 잡는다. Cron 엔드포인트는 `CRON_SECRET` 헤더로 보호한다.

## 5. 데이터 모델

공통: 금액은 정수(KRW 원, USD 센트). 날짜는 `DATE`(서울 기준). 모든 테이블에 `id`, `createdAt`, `updatedAt`.

| 테이블 | 주요 필드 |
|---|---|
| User | email(고유), name, roles[], locale, nationality?, phone? |
| Property | hostId, title, description, address, addressDetail, lat, lng, approxLat, approxLng, district, amenities[], houseRules, status(DRAFT/PUBLISHED/HIDDEN) |
| Room | propertyId, name, roomType(PRIVATE/SHARED/STUDIO), capacity, monthlyRent, deposit, options[], photos[], status(DRAFT/PUBLISHED/HIDDEN) |
| RoomBlock | roomId, startDate, endDate, reason |
| Booking | roomId, guestId, checkIn, checkOut, status, holdExpiresAt?, guestMessage, priceSnapshot(JSON: monthlyRent, deposit, segments[], total) |
| Invoice | bookingId, seq, periodStart, periodEnd, rentAmount, depositAmount, dueDate, status(PENDING/PAID/VOID/OVERDUE) — (bookingId, seq) 고유 |
| Payment | invoiceId, channel(EXIMBAY/PAYPAL), portonePaymentId(고유), currency(KRW/USD), amount, amountKrw, fxRate?, status(PENDING/PAID/FAILED/CANCELLED/PARTIAL_CANCELLED), paidAt?, raw(JSON) |
| Refund | paymentId, amount, currency, reason, status(REQUESTED/DONE/FAILED), createdBy |
| DepositEntry | bookingId, type(HELD/DEDUCTION/RETURNED), amountKrw, memo, createdBy |
| FxRate | date(고유), krwPerUsd |
| WebhookEvent | eventId(고유), type, payload, processedAt |
| AuditLog | actorId?, entity, entityId, action, from?, to?, meta(JSON) |

### 이중 예약 방지

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Booking" ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist ("roomId" WITH =, daterange("checkIn", "checkOut") WITH &&)
  WHERE (status IN ('APPROVED', 'CONFIRMED'));
```

Prisma 마이그레이션에 SQL로 추가한다. RoomBlock과의 겹침은 승인 트랜잭션 안에서 앱이 검사한다.

## 6. 예약·결제 흐름

### 6.1 상태 전이

```
REQUESTED ──승인──▶ APPROVED ──1회차 결제 검증──▶ CONFIRMED ──checkOut 경과──▶ COMPLETED
    │                  │                              │
 거절/48h 무응답     24h 미결제                   관리자 취소
    ▼                  ▼                              ▼
 REJECTED           EXPIRED                       CANCELLED
```

APPROVED 상태에서도 관리자 취소(→ CANCELLED, 환불 없음)를 허용한다. 상태 전이는 `bookings` 서비스에서만 일어나며 모든 전이를 AuditLog에 기록한다.

### 6.2 단계별 처리

1. **신청**: 서버에서 `validateStay`, `quote` 실행 → priceSnapshot 저장 → 호스트 이메일. 신청 단계에서는 방을 잡지 않는다.
2. **승인**: 한 트랜잭션에서 RoomBlock 겹침 검사 → 상태 APPROVED, `holdExpiresAt = now + 24h` → 1회차 Invoice(첫 구간 월세 + 보증금) 생성. 배타 제약 위반 시 `BookingConflict`. 같은 방·기간의 다른 REQUESTED 신청은 호스트 화면에 "충돌"로 표시한다.
3. **결제 준비**: 게스트가 채널 선택 → 서버가 `portonePaymentId`, 통화, 금액(PayPal은 `toUsd`)을 정해 Payment(PENDING) 저장 → 브라우저가 PortOne SDK로 결제창 호출.
4. **결제 검증** `verifyPayment(portonePaymentId)`: PortOne 웹훅과 브라우저 복귀가 모두 호출한다. PortOne API로 결제를 조회해 금액·통화가 저장값과 일치하면 한 트랜잭션에서 Payment PAID → Invoice PAID → (1회차면) Booking CONFIRMED + DepositEntry HELD. 이미 처리된 경우 그대로 성공 반환(멱등).
5. **만료 경합**: 결제 검증 시점에 예약이 EXPIRED이면, 해당 방·기간에 APPROVED/CONFIRMED 예약이 없을 때 CONFIRMED로 복구한다. 있으면 전액 자동 환불하고 관리자에게 알린다.
6. **월세 청구**: `issue-invoices`가 다음 구간 청구서를 만들고 결제 링크(`/invoices/{id}/pay`, 로그인 필요)를 보낸다. 결제·검증 절차는 3~4단계와 같다.
7. **취소·환불**: 관리자가 취소 → `refundFor(booking, cancelDate)`로 금액 계산 → PortOne 부분취소. PayPal 결제는 원 결제 USD 금액에 같은 비율을 적용해 환불한다. 결과를 Refund에 기록한다.
8. **중도 퇴실**: 관리자가 checkOut 단축 → 남은 구간은 청구하지 않고, 발행·미결제 청구서는 VOID. 단축된 마지막 구간의 일할 차액 정산은 관리자가 오프라인으로 처리한다.
9. **보증금 반환**: 퇴실 후 관리자가 DEDUCTION/RETURNED 기록, 송금은 오프라인.

## 7. 가격 계산 (`pricing`)

DB에 의존하지 않는 순수 함수. 화면 미리보기와 서버가 같은 함수를 쓰되 최종 금액은 항상 서버가 다시 계산한다.

- `segments(checkIn, checkOut)`: 최초 체크인일을 기준일로 k번째 경계 = `addMonthsClamped(checkIn, k)`(말일 보정). 마지막 경계가 checkOut을 넘으면 그 구간은 일할 구간.
- `quote(room, checkIn, checkOut)`: 온전한 구간 = 월세, 일할 구간 = `floor(월세 × 일수 / 30)`. 반환: segments[], rentTotal, deposit.
- `validateStay(checkIn, checkOut)`: 첫 구간이 온전해야 하고(checkOut ≥ addMonthsClamped(checkIn, 1)) 숙박 수 ≥ 30, checkOut ≤ addMonthsClamped(checkIn, 12).
- `refundFor(booking, cancelDate)`: 2장의 환불 단계 적용. 반환: rentRefund, depositRefund.
- `toUsd(krw, krwPerUsd)`: `ceil(krw / krwPerUsd × 1.03 × 100)` 센트.

## 8. 검색·지도·다국어

- **검색 필터**: 지역(구), 입주일·퇴실일, 월세 범위, 방 유형, 옵션. 기간이 주어지면 APPROVED/CONFIRMED 예약 또는 RoomBlock과 겹치는 방을 제외한다. 정렬: 가격, 최신.
- **지도**: Property 단위 마커(대략 좌표). 방 상세는 대략 좌표 중심 반경 원. 확정 게스트에게만 정확한 핀·주소. 호스트는 주소 입력 → Geocoding → 핀 드래그로 보정. API 키는 HTTP 리퍼러 제한 + Google Cloud 예산 알림.
- **다국어**: next-intl, 이메일 템플릿도 사용자 locale. 금액은 KRW 표시 + USD "≈" 참고 표시, `Intl`로 포맷.
- **UI**: shadcn/ui + Tailwind, 모바일 우선.

## 9. 오류 처리

- 모든 서버 입력은 zod로 검증한다.
- 서비스는 타입이 정해진 도메인 오류(`BookingConflict`, `StayTooShort`, `HoldExpired`, `PaymentMismatch` 등)를 던지고, 화면은 오류 코드를 다국어 메시지로 변환한다.
- 결제 금액·통화 불일치: 확정하지 않고 Payment FAILED, 원본 응답 저장, 관리자 알림. 자동 환불하지 않는다.
- 웹훅: 서명 검증, WebhookEvent로 중복 차단, 처리 실패 시 500을 반환해 재전송 유도.
- Sentry로 예외 수집. 결제 실패·불일치·만료 경합 환불은 관리자 이메일 알림.

## 10. 테스트

- **단위(Vitest)**: `pricing` 경계값 — 1/31 입주, 2월·윤년, 정확히 1개월, 29박/30박, 12개월 초과, 환불 단계 경계(30일·7일 전), USD 올림.
- **통합(Docker PostgreSQL)**: 동시 이중 승인과 배타 제약, 승인→결제 검증→확정, 만료 경합, 웹훅 중복, 청구서 발행·연체 Cron, 취소 환불 금액.
- **결제 수동 E2E**: PortOne 테스트 채널(엑심베이, PayPal 샌드박스) 체크리스트.
- **E2E(Playwright)**: 검색 → 신청 → 관리자 승인 → 테스트 결제 → 확정 1개 흐름.

## 11. 운영·배포

- 환경: 로컬 / Preview(Vercel PR, 테스트 결제 채널) / Production(실결제 채널). 환경변수는 Vercel에서 관리.
- 도메인 연결, 자동 HTTPS, 이메일 발송 도메인 SPF·DKIM.
- Supabase 일일 백업, 출시 전 복구 절차 1회 연습.

## 12. 대표가 병행할 일 (개발 외)

1. PortOne 가입 및 엑심베이 계약 — 초기 월 한도(블로그 기준 USD 1,000/월)가 월세 결제에 부족하므로 계약 시 증액 협의. 수수료(약 4.5%)는 계약 시 최신 조건 확인.
2. PayPal 비즈니스 계정 개설 및 PortOne 연결.
3. 도메인 구매, Google Cloud 결제 계정, Resend·Sentry 계정.
4. 30일 이상 임대의 법적 성격(숙박업 해당 여부)과 세무 처리 확인(세무사·법률 전문가).
5. 이용약관, 개인정보처리방침, 환불정책 문구.

## 13. 확인이 남은 외부 사실

- PortOne V2의 엑심베이·PayPal 채널 연동 세부(파라미터, 웹훅 형식)는 구현 계획 단계에서 developers.portone.io 최신 문서로 확인한다.
- PayPal의 KRW 미지원은 개발자 보고 기준이며, 구현 전에 PayPal 공식 지원 통화 목록으로 재확인한다.
