import { mkdir } from "node:fs/promises";
import path from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

const mailpit = "http://127.0.0.1:54324/api/v1";
const testPassword = "RallyLocalTestPassword!2026";

type MailMessage = {
  ID?: string;
  Id?: string;
  To?: Array<{ Address?: string }> | string[];
};

async function waitForAuthLink(email: string, expectedType: "signup" | "recovery", timeoutMs = 30_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const response = await fetch(`${mailpit}/messages?limit=50`);
    if (!response.ok) throw new Error(`Mailpit returned ${response.status}.`);

    const result = (await response.json()) as { messages?: MailMessage[] };
    const messages = result.messages?.filter((item) => {
      const recipients = (item.To ?? []).map((recipient) =>
        typeof recipient === "string" ? recipient : recipient.Address ?? "",
      );
      return recipients.some((recipient) => recipient.toLowerCase() === email.toLowerCase());
    }) ?? [];

    for (const message of messages) {
      const messageId = message.ID ?? message.Id;
      if (!messageId) continue;
      const fullResponse = await fetch(`${mailpit}/message/${encodeURIComponent(messageId)}`);
      if (!fullResponse.ok) throw new Error(`Mailpit message lookup returned ${fullResponse.status}.`);
      const fullMessage = (await fullResponse.json()) as Record<string, unknown>;
      const body = Object.values(fullMessage).filter((value): value is string => typeof value === "string").join("\n");
      const link = [...body.matchAll(/https?:\/\/[^\s"'<>]+/g)]
        .map(([url]) => url.replaceAll("&amp;", "&"))
        .find((url) => url.includes("/auth/v1/verify?"));
      if (link && new URL(link).searchParams.get("type") === expectedType) return link;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`No confirmation or recovery email arrived for ${email}.`);
}

async function createConfirmedAccount(
  page: Page,
  email: string,
  name: string,
  next = "/app",
): Promise<void> {
  await page.goto(`/sign-up?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(testPassword);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("status")).toContainText("Check your email for a confirmation link");

  const confirmationLink = await waitForAuthLink(email, "signup");
  await page.goto(confirmationLink);
  await expect(page).toHaveURL(/localhost:3000\/(app|join\/)/, { timeout: 20_000 });
}

async function openRecordEditor(card: Locator): Promise<void> {
  const editor = card.locator("details.record-edit-details");
  const isOpen = await editor.evaluate((element) => (element as HTMLDetailsElement).open);
  if (!isOpen) await editor.locator("summary").click();
}

test("members can build, share, and protect real progress", async ({ browser }) => {
  test.setTimeout(240_000);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const ownerEmail = `owner-${suffix}@rally.test`;
  const memberEmail = `member-${suffix}@rally.test`;
  const outsiderEmail = `outsider-${suffix}@rally.test`;
  const workspaceName = "Sunday Practice";
  const challengeName = "Show up daily";
  const firstTaskTitle = "Plan a focused session";
  const updatedTaskTitle = "Book a quiet room";
  const initialGoalTitle = "Move each morning";
  const updatedGoalTitle = "Practice together";

  const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const owner = await ownerContext.newPage();

  await createConfirmedAccount(owner, ownerEmail, "Rally Owner");
  await expect(owner.getByRole("heading", { name: "Start a workspace." })).toBeVisible();
  await owner.getByLabel("Workspace name").fill(workspaceName);
  await owner.getByLabel("Timezone").selectOption("UTC");
  await owner.getByRole("button", { name: "Create workspace" }).click();
  await expect(owner.getByRole("heading", { name: /Choose a stretch worth sharing/ })).toBeVisible();
  await expect(owner.getByRole("link", { name: "Invite people" })).toHaveAttribute("href", /\/settings\?workspace=[a-f0-9-]{36}#invites-heading/);
  await owner.getByLabel("Challenge name").fill(challengeName);

  const startDate = await owner.getByLabel("Start date").inputValue();
  const suggestedEnd = await owner.getByLabel("End date").inputValue();
  const startOrdinal = Date.parse(`${startDate}T00:00:00Z`);
  const endOrdinal = Date.parse(`${suggestedEnd}T00:00:00Z`);
  expect((endOrdinal - startOrdinal) / 86_400_000 + 1).toBe(60);

  await owner.getByRole("button", { name: "Start challenge" }).click();
  await expect(owner.getByRole("heading", { name: "Today, together." })).toBeVisible();
  await expect(owner.getByRole("link", { name: "Invite people" })).toHaveAttribute("href", /\/settings\?workspace=[a-f0-9-]{36}#invites-heading/);
  await expect(owner.getByText(challengeName)).toBeVisible();
  await owner.getByLabel("What I accomplished").fill("Finished the first focused session.");
  await owner.getByLabel("What I plan to do next").fill("Set up tomorrow's session.");
  await owner.getByRole("button", { name: "Save check-in" }).click();
  await expect(owner.getByRole("heading", { name: "A steady return." })).toBeVisible();
  await expect(owner.locator(".streak-current strong")).toHaveText("1");

  const workspaceId = new URL(owner.url()).searchParams.get("workspace");
  expect(workspaceId).toMatch(/^[0-9a-f-]{36}$/i);

  await owner.goto("/tasks");
  await owner.getByText("Add a task").click();
  await owner.getByLabel("Task title").fill(firstTaskTitle);
  await owner.getByRole("button", { name: "Add task" }).click();
  const taskCard = owner.locator("li.record-card").filter({ hasText: firstTaskTitle });
  await expect(taskCard).toBeVisible();
  await openRecordEditor(taskCard);
  await taskCard.locator('input[name="title"]').fill(updatedTaskTitle);
  await taskCard.locator('select[name="status"]').selectOption("completed");
  await taskCard.getByRole("button", { name: "Save changes" }).click();
  const updatedTaskCard = owner.locator("li.record-card").filter({ hasText: updatedTaskTitle });
  await expect(updatedTaskCard.getByText("completed", { exact: true })).toBeVisible();
  await openRecordEditor(updatedTaskCard);
  await updatedTaskCard.locator('select[name="status"]').selectOption("todo");
  await updatedTaskCard.getByRole("button", { name: "Save changes" }).click();
  await expect(updatedTaskCard.getByText("todo", { exact: true })).toBeVisible();

  await owner.goto("/goals");
  await owner.getByText("Set a goal").click();
  await owner.getByLabel("Goal title").fill(initialGoalTitle);
  await owner.getByRole("button", { name: "Add goal" }).click();
  const goalCard = owner.locator("li.record-card").filter({ hasText: initialGoalTitle });
  await expect(goalCard).toBeVisible();
  await openRecordEditor(goalCard);
  await goalCard.locator('input[name="title"]').fill(updatedGoalTitle);
  await goalCard.getByRole("button", { name: "Save changes" }).click();
  await expect(owner.locator("li.record-card").filter({ hasText: updatedGoalTitle })).toBeVisible();

  await owner.goto("/settings");
  await owner.getByRole("button", { name: "Create invite link" }).click();
  const inviteLink = await owner.locator("#created-invite-link").inputValue();
  expect(inviteLink).toMatch(/^http:\/\/localhost:3000\/join\/[a-f0-9]{64}$/i);

  const memberContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const member = await memberContext.newPage();
  await member.goto(inviteLink);
  await expect(member.getByRole("heading", { name: "You have a Rally invite." })).toBeVisible();
  await expect(member.getByText(workspaceName)).toHaveCount(0);
  await expect(member.getByText(challengeName)).toHaveCount(0);
  await member.getByRole("link", { name: "Create account" }).click();
  await createConfirmedAccount(member, memberEmail, "Rally Member", new URL(inviteLink).pathname);
  await expect(member.getByRole("button", { name: "Accept invitation" })).toBeVisible();
  await member.getByRole("button", { name: "Accept invitation" }).click();
  await expect(member.getByRole("heading", { name: "Today, together." })).toBeVisible();
  await expect(member.getByRole("link", { name: "Invite people" })).toHaveCount(0);
  await member.getByLabel("What I accomplished").fill("Shared the first update with the group.");
  await member.getByLabel("What I plan to do next").fill("Keep the daily rhythm.");
  await member.getByRole("button", { name: "Save check-in" }).click();
  await expect(member.getByRole("heading", { name: "A steady return." })).toBeVisible();
  await expect(member.getByText("2 members", { exact: true })).toBeVisible();
  await expect(member.getByText("Rally Owner").first()).toBeVisible();

  await member.goto("/settings");
  await expect(member.getByRole("heading", { name: "Workspace members" })).toBeVisible();
  await expect(member.getByRole("heading", { name: "Bring someone in." })).toHaveCount(0);
  await expect(member.getByRole("button", { name: "Create invite link" })).toHaveCount(0);

  await owner.goto("/app");
  await expect(owner.getByText("Rally Member").first()).toBeVisible();
  await expect(owner.getByText("Checked in").first()).toBeVisible();
  await owner.goto("/history");
  await expect(owner.getByText("Finished the first focused session.")).toBeVisible();
  await expect(owner.getByText("Shared the first update with the group.")).toBeVisible();

  const screenshots = path.resolve(process.cwd(), "output/playwright");
  await mkdir(screenshots, { recursive: true });
  await owner.goto("/app");
  await owner.setViewportSize({ width: 1440, height: 1100 });
  await owner.screenshot({ path: path.join(screenshots, "rally-dashboard-desktop.png"), fullPage: true });
  await owner.setViewportSize({ width: 390, height: 844 });
  await owner.screenshot({ path: path.join(screenshots, "rally-dashboard-mobile.png"), fullPage: true });
  await expect(owner.locator("body")).toHaveJSProperty("scrollWidth", 390);

  await owner.goto("/settings");
  await owner.locator(".workspace-create-details > summary").click();
  const secondWorkspaceForm = owner.locator(".workspace-create-details form");
  await secondWorkspaceForm.getByLabel("Workspace name").fill("Second Space");
  await secondWorkspaceForm.getByLabel("Timezone").selectOption("UTC");
  await secondWorkspaceForm.getByRole("button", { name: "Create workspace" }).click();
  await expect(owner.getByRole("heading", { name: /Choose a stretch worth sharing/ })).toBeVisible();
  await owner.getByLabel("Switch workspace").last().selectOption({ label: workspaceName });
  await expect(owner.getByRole("heading", { name: "Today, together." })).toBeVisible();

  const replayContext = await browser.newContext();
  const replay = await replayContext.newPage();
  await createConfirmedAccount(replay, `replay-${suffix}@rally.test`, "Invite Replay");
  await replay.goto(inviteLink);
  await expect(replay.getByRole("heading", { name: "Ready to join?" })).toBeVisible();
  await replay.getByRole("button", { name: "Accept invitation" }).click();
  await expect(replay.locator(".form-message--error")).toContainText("This invite is unavailable.");

  const outsiderContext = await browser.newContext();
  const outsider = await outsiderContext.newPage();
  await createConfirmedAccount(outsider, outsiderEmail, "Rally Outsider");
  const deniedResponse = await outsider.goto(`/app?workspace=${workspaceId}`);
  expect(deniedResponse?.status()).toBe(404);
  await expect(outsider.getByText(workspaceName)).toHaveCount(0);
  await expect(outsider.getByText(challengeName)).toHaveCount(0);

  await ownerContext.close();
  await memberContext.close();
  await replayContext.close();
  await outsiderContext.close();
});

test("account recovery changes the password and preserves session control", async ({ browser }) => {
  test.setTimeout(120_000);
  const email = `recovery-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@rally.test`;
  const context = await browser.newContext();
  const page = await context.newPage();
  await createConfirmedAccount(page, email, "Recovery Member");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in/);

  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Send recovery link" }).click();
  await expect(page.getByRole("status")).toContainText("If an account uses that address");
  const recoveryLink = await waitForAuthLink(email, "recovery");
  await page.goto(recoveryLink);
  await expect(page).toHaveURL(/\/auth\/reset-password/);
  const updatedPassword = "RallyLocalChangedPassword!2026";
  await page.getByRole("textbox", { name: "New password", exact: true }).fill(updatedPassword);
  await page.getByRole("textbox", { name: "Confirm new password", exact: true }).fill(updatedPassword);
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page).toHaveURL(/\/app/);
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(updatedPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/app/);
  await context.close();
});
