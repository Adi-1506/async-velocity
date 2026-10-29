import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
const password = createHash("sha256")
  .update("standup-e2e-fixture-only")
  .digest("hex");
test("member and administrator can complete the web workflow", async ({
  page,
}) => {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("member@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Team feed", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Team", { exact: true })).toHaveValue(/.+/);
  await page
    .locator("#sidebar")
    .getByRole("link", { name: "Post a check-in", exact: true })
    .click();
  await page
    .getByLabel("What did you finish?")
    .fill("Finished the API integration.");
  await page.getByLabel("What's next?").fill("Review the release checklist.");
  await page
    .getByLabel("Anything blocking you?")
    .fill("Waiting for a design decision.");
  await page.getByRole("button", { name: "Post check-in" }).click();
  await expect(page.getByRole("status")).toContainText("Check-in posted");
  await page.getByRole("link", { name: "Team feed", exact: true }).click();
  await expect(page.getByText("Finished the API integration.")).toBeVisible();
  await page.screenshot({
    path: "test-results/team-feed-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Mark resolved" }).click();
  await expect(
    page.getByRole("heading", { name: "Blocker resolved" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Insights", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Check-ins per day" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Notifications", exact: true }).click();
  await expect(
    page.getByText("Welcome! Share your first check-in."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark as read" }).click();
  await expect(page.getByRole("button", { name: "Mark as read" })).toHaveCount(
    0,
  );
  await page.getByRole("link", { name: /Account & security/ }).click();
  const passkeys = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "Passkeys", exact: true }),
    });
  await passkeys.getByLabel("Current password", { exact: true }).fill(password);
  await passkeys
    .getByRole("button", { name: "Register passkey", exact: true })
    .click();
  await expect(passkeys.getByRole("status")).toHaveText("Passkey registered");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.getByRole("button", { name: "Sign in with a passkey" }).click();
  await expect(
    page.getByRole("heading", { name: "Team feed", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const openNav = () =>
    page.getByRole("button", { name: "Open navigation" }).click();
  await openNav();
  await page.getByRole("link", { name: "Team feed", exact: true }).click();
  await expect(page.getByText("Finished the API integration.")).toBeVisible();
  await expect(page.locator("#sidebar")).toBeHidden();
  await page.screenshot({
    path: "test-results/team-feed-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await openNav();
  await page.getByRole("link", { name: /Account & security/ }).click();
  await page.getByText("Remove a passkey (1)", { exact: true }).click();
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Remove passkey and sign out", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill("admin@example.test");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Team settings", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Summary frequency").selectOption("weekly");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();
  await openNav();
  await page.getByRole("link", { name: "All teams", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Design team");
  await page.getByRole("button", { name: "Create team", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Design team", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("disclosure contact is served with no-store and recovery page is available", async ({ request, page }) => {
  const response = await request.get("/.well-known/security.txt");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toBe("no-store");
  expect(await response.text()).toContain("Contact: mailto:security@example.test");
  await page.goto("/recover-mfa");
  await expect(page.getByRole("heading", { name: "Recover authenticator access" })).toBeVisible();
});
