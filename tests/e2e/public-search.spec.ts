import { expect, test, type Locator } from "@playwright/test";
import { seedPublicListings } from "./fixtures";

// 하이드레이션 전에 채운 값은 React의 변경 추적과 어긋날 수 있어, 비웠다가 다시 채운다.
async function setStay(scope: Locator, checkIn: string, checkOut: string) {
  for (const [label, value] of [["Check-in", checkIn], ["Check-out", checkOut]] as const) {
    await scope.getByLabel(label).fill("");
    await scope.getByLabel(label).fill(value);
  }
}

let title: string;
let otherTitle: string;

test.beforeAll(async () => {
  ({ title, otherTitle } = await seedPublicListings());
});

test("search, open a room, get a quote, switch to Korean", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { name: "Find a monthly room in Seoul" })).toBeVisible();

  await page.getByLabel("District").selectOption("mapo");
  await page.getByLabel("Check-in").fill("2026-03-15");
  await page.getByLabel("Check-out").fill("2026-05-25");
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page).toHaveURL(/district=mapo/);
  await expect(page).toHaveURL(/checkIn=2026-03-15/);

  const cards = page.getByTestId("room-card").filter({ hasText: title });
  await expect(cards).toHaveCount(2);
  await expect(page.getByTestId("room-card").filter({ hasText: otherTitle })).toHaveCount(0);
  // 키가 없으면 지도는 폴백으로 표시된다.
  await expect(page.getByTestId("map-fallback")).toBeVisible();

  await cards.first().getByRole("link").first().click();
  await expect(page).toHaveURL(/\/en\/rooms\/[^/?]+/);
  const article = page.locator("article");
  await expect(article.getByRole("heading", { name: title })).toBeVisible();
  await expect(article.getByTestId("map-fallback")).toBeVisible();
  // 정확한 주소는 노출되지 않는다.
  await expect(page.getByText("Secret-ro")).toHaveCount(0);
  await expect(page.getByText("Unit 202")).toHaveCount(0);

  const quote = page.getByTestId("quote-preview");
  const segments = page.getByTestId("quote-segment");
  // 하이드레이션 전에 입력한 값은 상태에 반영되지 않을 수 있어 재시도한다.
  await expect(async () => {
    await setStay(quote, "2026-03-15", "2026-05-25");
    await expect(segments).toHaveCount(3, { timeout: 1500 });
  }).toPass();
  await expect(segments.first()).toContainText("2026-03-15");
  await expect(segments.first()).toContainText("Full month");
  await expect(segments.last()).toContainText("Partial month");
  await expect(page.getByTestId("quote-rent-total")).toContainText("1,400,000");
  await expect(page.getByTestId("quote-deposit")).toContainText("1,000,000");

  await page.getByLabel("Language").selectOption("ko");
  await expect(page).toHaveURL(/\/ko\/rooms\//);
  await expect(page.getByText("보증금").first()).toBeVisible();
  await expect(page.locator(`[data-testid="quote-segment"]:visible`).first()).toContainText("한 달");
  await expect(page.locator(`[data-testid="quote-rent-total"]:visible`)).toContainText("1,400,000");
});

test("shows a localized error for an invalid stay and no results", async ({ page }) => {
  await page.goto("/en?checkIn=2026-04-01&checkOut=2026-04-30");
  await expect(page.getByTestId("filter-error")).toContainText("The minimum stay is one month");
  await expect(page.getByTestId("room-card")).toHaveCount(0);
  await page.goto("/ko?checkIn=2026-04-01&checkOut=2026-04-30");
  await expect(page.getByTestId("filter-error")).toContainText("최소 체류");
});

test("quote preview shows the error for a too-short stay", async ({ page }) => {
  await page.goto("/en?district=mapo");
  await page.getByTestId("room-card").filter({ hasText: title }).first().getByRole("link").first().click();
  const quote = page.getByTestId("quote-preview");
  await expect(async () => {
    await setStay(quote, "2026-04-01", "2026-04-30");
    await expect(page.getByTestId("quote-error")).toContainText("The minimum stay is one month", { timeout: 1500 });
  }).toPass();
});

test("unknown room shows not found", async ({ page }) => {
  // 스트리밍 응답이라 상태 코드는 200이지만 not-found UI가 렌더링된다.
  await page.goto("/en/rooms/does-not-exist");
  await expect(page.getByText("This page could not be found")).toBeVisible();
});

test("mobile toggles between list and map", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/en?district=mapo");
  await expect(page.getByTestId("list-panel")).toBeVisible();
  await expect(page.getByTestId("map-panel")).toBeHidden();
  await page.getByRole("button", { name: "Map" }).click();
  await expect(page.getByTestId("map-panel")).toBeVisible();
  await expect(page.getByTestId("list-panel")).toBeHidden();
  await page.getByRole("button", { name: "List" }).click();
  await expect(page.getByTestId("list-panel")).toBeVisible();
});
