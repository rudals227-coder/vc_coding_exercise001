import { expect, test } from "@playwright/test";

test.describe("admin listings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/api/test/login?email=admin@e2e.test");
    await expect(page).toHaveURL(/\/en\/admin\/properties$/);
  });

  test("create property and room, publish, see it in the list", async ({ page }) => {
    const title = `E2E Loft ${Date.now()}`;
    await page.getByRole("link", { name: "Add a property" }).click();
    await expect(page).toHaveURL(/\/en\/admin\/properties\/new$/);

    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Description").fill("Bright loft near Hongdae station.");
    await page.getByLabel("Address", { exact: true }).fill("Mapo-gu Yanghwa-ro 100, Seoul");
    await page.getByLabel("District").selectOption("mapo");
    await page.getByRole("button", { name: "Save" }).click();

    // 숙소 상세로 이동한다.
    await expect(page).toHaveURL(/\/en\/admin\/properties\/(?!new)[^/]+$/);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    // 방 생성: 금액은 콤마로 표시되고 정수로 저장된다.
    await page.getByLabel("Room name").fill("Room A");
    await page.getByLabel("Monthly rent (KRW)").fill("600000");
    await expect(page.getByLabel("Monthly rent (KRW)")).toHaveValue("600,000");
    await page.getByLabel("Deposit (KRW)").fill("1000000");
    await expect(page.getByLabel("Deposit (KRW)")).toHaveValue("1,000,000");
    await page.getByRole("button", { name: "Add room" }).click();

    const roomRow = page.getByTestId("room-row").filter({ hasText: "Room A" });
    await expect(roomRow).toBeVisible();
    await expect(roomRow).toContainText("600,000");
    await expect(roomRow).toContainText("Draft");

    // 방과 숙소를 게시한다.
    await roomRow.getByRole("button", { name: "Publish" }).click();
    await expect(roomRow).toContainText("Published");
    await page.getByTestId("property-status").getByRole("button", { name: "Publish" }).click();
    await expect(page.getByTestId("property-status")).toContainText("Published");

    // 목록에 게시 상태로 표시된다.
    await page.goto("/en/admin/properties");
    const row = page.getByTestId("property-row").filter({ hasText: title });
    await expect(row).toBeVisible();
    await expect(row).toContainText("Published");
  });

  test("shows the geocode error for an unknown address", async ({ page }) => {
    await page.goto("/en/admin/properties/new");
    await page.getByLabel("Title").fill("Nowhere");
    await page.getByLabel("Description").fill("x");
    await page.getByLabel("Address", { exact: true }).fill("__notfound__");
    await page.getByLabel("District").selectOption("mapo");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(
      page.getByText("We could not find that address. Please check it and try again."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/properties\/new$/);
  });

  test("map falls back to coordinate inputs without a maps key", async ({ page }) => {
    await page.goto("/en/admin/properties/new");
    await expect(page.getByTestId("map-fallback")).toBeVisible();
  });
});
