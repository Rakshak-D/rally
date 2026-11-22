import { mkdir } from "node:fs/promises";
import path from "node:path";

import AxeBuilder from "@axe-core/playwright";
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

async function waitForMailCount(email: string, expectedCount: number, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(`${mailpit}/messages?limit=50`);
    if (!response.ok) throw new Error(`Mailpit returned ${response.status}.`);
    const result = (await response.json()) as { messages?: MailMessage[] };
    const count = (result.messages ?? []).filter((item) => (item.To ?? []).some((recipient) => {
      const address = typeof recipient === "string" ? recipient : recipient.Address ?? "";
      return address.toLowerCase() === email.toLowerCase();
    })).length;
    if (count >= expectedCount) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Mailpit did not receive ${expectedCount} messages for ${email}.`);
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

  const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 1100 }, timezoneId: "Asia/Kolkata" });
  const owner = await ownerContext.newPage();
  const hydrationWarnings: string[] = [];
  const appActionNotes: Array<number | null> = [];
  owner.on("console", (message) => {
    if (/hydration|did not match|hydrating/i.test(message.text())) hydrationWarnings.push(message.text());
  });
  owner.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/app") {
      const body = request.postData() ?? "";
      const note = body.match(/name="(?:_1_)?notes"\r\n\r\n([\s\S]*?)\r\n------/);
      appActionNotes.push(note ? note[1].length : null);
    }
  });

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
  await expect(owner.getByLabel("Blockers or notes")).toBeHidden();
  await owner.locator(".checkin-notes-disclosure > summary").click();
  await owner.getByLabel("Blockers or notes").fill("Need a quieter room.");
  await owner.getByLabel("What I accomplished").fill("Finished the first focused session.");
  await owner.getByLabel("What I plan to do next").fill("Set up tomorrow's session.");
  await owner.getByRole("button", { name: "Save check-in" }).click();
  await expect(owner.getByRole("status")).toContainText("Today's check-in saved.");
  await expect(owner.getByRole("heading", { name: "A steady return." })).toBeVisible();
  await expect(owner.getByLabel("Blockers or notes")).toBeVisible();
  await expect(owner.getByLabel("Blockers or notes")).toHaveValue("Need a quieter room.");
  await owner.getByLabel("Blockers or notes").fill("");
  const submittedNotes = await owner.locator(".checkin-form").evaluate((form) => new FormData(form as HTMLFormElement).get("notes"));
  expect(submittedNotes).toBe("");
  const actionCountBeforeClearing = appActionNotes.length;
  await owner.getByRole("button", { name: "Update check-in" }).click();
  await expect(owner.getByRole("status")).toContainText("Today's check-in updated.");
  expect(appActionNotes.length).toBeGreaterThan(actionCountBeforeClearing);
  expect(appActionNotes.at(-1)).toBe(0);
  await owner.reload();
  await expect(owner.getByLabel("Blockers or notes")).toBeHidden();
  await expect(owner.locator(".streak-current strong")).toHaveText("1");

  const workspaceId = new URL(owner.url()).searchParams.get("workspace");
  expect(workspaceId).toMatch(/^[0-9a-f-]{36}$/i);

  await owner.goto(`/settings?workspace=${workspaceId}`);
  await owner.locator(".challenge-create-details > summary").click();
  const nextChallengeForm = owner.locator(".challenge-create-details form");
  await nextChallengeForm.getByLabel("Challenge name").fill("Next rhythm");
  await nextChallengeForm.getByRole("button", { name: "Start challenge" }).click();
  await owner.goto(`/settings?workspace=${workspaceId}`);
  const challengeInputs = owner.locator(".challenge-settings-item input[id]");
  const challengeIds = await challengeInputs.evaluateAll((items) => items.map((item) => item.id));
  expect(new Set(challengeIds).size).toBe(challengeIds.length);
  const labelControlsMatch = await owner.locator(".challenge-settings-item label").evaluateAll((labels) =>
    labels.every((label) => (label as HTMLLabelElement).control === label.querySelector("input, textarea")),
  );
  expect(labelControlsMatch).toBe(true);
  await owner.goto(`/app?workspace=${workspaceId}`);

  await owner.goto("/tasks");
  await owner.getByText("Add a task").click();
  const initialTaskForm = owner.locator(".create-record-details form");
  await initialTaskForm.getByRole("button", { name: "Add task" }).click();
  await expect(initialTaskForm.getByText("Enter a title.")).toBeVisible();
  await initialTaskForm.getByLabel("Task title").fill(firstTaskTitle);
  await owner.getByRole("button", { name: "Add task" }).click();
  const taskCard = owner.locator("li.record-card").filter({ hasText: firstTaskTitle });
  await expect(taskCard).toBeVisible();
  await openRecordEditor(taskCard);
  await taskCard.locator('input[name="title"]').fill(updatedTaskTitle);
  await taskCard.locator('select[name="status"]').selectOption("completed");
  await taskCard.getByRole("button", { name: "Save changes" }).click();
  const updatedTaskCard = owner.locator("li.record-card").filter({ hasText: updatedTaskTitle });
  await expect(updatedTaskCard.locator(".record-card-heading .status-chip")).toHaveText("Completed");
  await openRecordEditor(updatedTaskCard);
  await updatedTaskCard.locator('select[name="status"]').selectOption("todo");
  await updatedTaskCard.getByRole("button", { name: "Save changes" }).click();
  await expect(updatedTaskCard.locator(".record-card-heading .status-chip")).toHaveText("To do");

  await owner.goto("/goals");
  await owner.getByText("Set a goal").click();
  const initialGoalForm = owner.locator(".create-record-details form");
  await initialGoalForm.getByRole("button", { name: "Add goal" }).click();
  await expect(initialGoalForm.getByText("Enter a title.")).toBeVisible();
  await initialGoalForm.getByLabel("Goal title").fill(initialGoalTitle);
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

  const memberContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "UTC" });
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

  await owner.goto(`/tasks?workspace=${workspaceId}`);
  await owner.getByText("Add a task").click();
  const assignedTaskForm = owner.locator(".create-record-details form");
  await assignedTaskForm.getByLabel("Task title").fill("Prepare the shared session");
  await assignedTaskForm.getByLabel("Assign to").selectOption({ label: "Rally Member" });
  await assignedTaskForm.getByRole("button", { name: "Add task" }).click();
  const assignedTask = owner.locator("li.record-card").filter({ hasText: "Prepare the shared session" });
  await expect(assignedTask).toContainText("Assigned to Rally Member");

  await owner.goto(`/goals?workspace=${workspaceId}`);
  const sharedGoal = owner.locator("li.record-card").filter({ hasText: updatedGoalTitle });
  await openRecordEditor(sharedGoal);
  await sharedGoal.locator('input[name="progressCurrent"]').fill("2");
  await sharedGoal.locator('input[name="progressTarget"]').fill("5");
  await sharedGoal.locator('input[name="progressUnit"]').fill("sessions");
  await sharedGoal.getByRole("button", { name: "Save changes" }).click();
  await expect(sharedGoal.getByRole("progressbar", { name: "Goal progress" })).toHaveAttribute("aria-valuenow", "40");

  await member.goto(`/tasks?workspace=${workspaceId}`);
  const memberAssignedTask = member.locator("li.record-card").filter({ hasText: "Prepare the shared session" });
  await expect(memberAssignedTask.getByText("Assigned to Rally Member")).toBeVisible();
  await memberAssignedTask.getByLabel("Your status").selectOption("in_progress");
  await memberAssignedTask.getByRole("button", { name: "Update status" }).click();
  await expect(memberAssignedTask.locator(".record-card-heading .status-chip")).toHaveText("In progress");

  await member.goto(`/goals?workspace=${workspaceId}`);
  const memberGoal = member.locator("li.record-card").filter({ hasText: updatedGoalTitle });
  await expect(memberGoal.getByText("2 sessions of 5 sessions")).toBeVisible();
  await memberGoal.getByText(/Progress record/).click();
  await expect(memberGoal.getByText("Rally Owner").last()).toBeVisible();
  const goalProgressHistory = memberGoal.locator(".goal-progress-history time");
  await expect(goalProgressHistory).toHaveCount(2);
  await expect(goalProgressHistory.first()).toHaveAttribute("datetime", /.+/);

  await owner.goto(`/goals?workspace=${workspaceId}`);
  const goalToRemove = owner.locator("li.record-card").filter({ hasText: updatedGoalTitle });
  await openRecordEditor(goalToRemove);
  const goalDeleteDialog = owner.waitForEvent("dialog").then((dialog) => dialog.accept());
  await goalToRemove.getByRole("button", { name: "Move to deleted items" }).click();
  await goalDeleteDialog;
  await expect(owner.getByText("Recently deleted goals")).toBeVisible();
  const deletedGoals = owner.locator("details.deleted-records");
  await deletedGoals.locator("summary").click();
  await deletedGoals.getByRole("button", { name: "Restore" }).click();
  await expect(owner.locator("li.record-card").filter({ hasText: updatedGoalTitle })).toBeVisible();

  await owner.goto(`/tasks?workspace=${workspaceId}`);
  const taskToRemove = owner.locator("li.record-card").filter({ hasText: updatedTaskTitle });
  await openRecordEditor(taskToRemove);
  const taskDeleteDialog = owner.waitForEvent("dialog").then((dialog) => dialog.accept());
  await taskToRemove.getByRole("button", { name: "Move to deleted items" }).click();
  await taskDeleteDialog;
  await expect(owner.getByText("Recently deleted tasks")).toBeVisible();
  const deletedTasks = owner.locator("details.deleted-records");
  await deletedTasks.locator("summary").click();
  await deletedTasks.getByRole("button", { name: "Restore" }).click();
  await expect(owner.locator("li.record-card").filter({ hasText: updatedTaskTitle })).toBeVisible();

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

  const responsiveRoutes = [
    { href: "/app", name: "dashboard" },
    { href: "/history", name: "history" },
    { href: "/goals", name: "goals" },
    { href: "/tasks", name: "tasks" },
    { href: "/settings", name: "settings" },
  ];
  for (const width of [375, 390, 768, 1024, 1440]) {
    await owner.setViewportSize({ width, height: 900 });
    for (const route of responsiveRoutes) {
      await owner.goto(`${route.href}?workspace=${workspaceId}`);
      await expect(owner.locator("main h1")).toBeVisible();
      const documentWidth = await owner.evaluate(() =>
        Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
      );
      expect(documentWidth, `${route.href} overflows at ${width}px`).toBeLessThanOrEqual(width);

      if (width === 375 || width === 1440) {
        await owner.screenshot({
          path: path.join(screenshots, `rally-${route.name}-${width}.png`),
          fullPage: true,
        });
        const accessibility = await new AxeBuilder({ page: owner })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        expect(
          accessibility.violations.map(({ id, impact, help, nodes }) => ({
            id,
            impact,
            help,
            targets: nodes.map(({ target }) => target),
          })),
          `${route.href} at ${width}px has accessibility violations`,
        ).toEqual([]);
      }
    }
  }
  await owner.setViewportSize({ width: 390, height: 844 });

  await owner.goto("/settings");
  await owner.locator(".workspace-create-details > summary").click();
  const secondWorkspaceForm = owner.locator(".workspace-create-details form");
  await secondWorkspaceForm.getByLabel("Workspace name").fill("Second Space");
  await secondWorkspaceForm.getByLabel("Timezone").selectOption("UTC");
  await secondWorkspaceForm.getByRole("button", { name: "Create workspace" }).click();
  await expect(owner.getByRole("heading", { name: /Choose a stretch worth sharing/ })).toBeVisible();
  const secondWorkspaceId = new URL(owner.url()).searchParams.get("workspace");
  expect(secondWorkspaceId).toMatch(/^[0-9a-f-]{36}$/i);

  const todayUtc = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const challengeStart = new Date(`${todayUtc}T00:00:00.000Z`);
  challengeStart.setUTCDate(challengeStart.getUTCDate() - 10);
  const challengeEnd = new Date(`${todayUtc}T00:00:00.000Z`);
  challengeEnd.setUTCDate(challengeEnd.getUTCDate() - 1);
  await owner.goto(`/settings?workspace=${secondWorkspaceId}`);
  await owner.locator(".challenge-create-details > summary").click();
  const completedChallengeForm = owner.locator(".challenge-create-details form");
  await completedChallengeForm.getByLabel("Challenge name").fill("Finished rhythm");
  await completedChallengeForm.getByLabel("Start date").fill(challengeStart.toISOString().slice(0, 10));
  await completedChallengeForm.getByLabel("End date").fill(challengeEnd.toISOString().slice(0, 10));
  await completedChallengeForm.getByRole("button", { name: "Start challenge" }).click();
  await expect(owner).toHaveURL(new RegExp(`/app\\?workspace=${secondWorkspaceId}$`));
  await expect(owner.getByText("This challenge is complete. Check-ins, goals, and history remain available.")).toBeVisible();
  await expect(owner.getByRole("link", { name: /Plan the next challenge/ })).toBeVisible();

  await owner.goto(`/settings?workspace=${secondWorkspaceId}`);
  await owner.getByRole("button", { name: "Create invite link" }).click();
  const secondInviteLink = await owner.locator("#created-invite-link").inputValue();
  await member.goto(secondInviteLink);
  await member.getByRole("button", { name: "Accept invitation" }).click();
  await expect(member).toHaveURL(new RegExp(`/app\\?workspace=${secondWorkspaceId}$`));
  await expect(member.getByText("This challenge is complete. Check-ins, goals, and history remain available.")).toBeVisible();
  await expect(member.getByRole("link", { name: /Plan the next challenge/ })).toHaveCount(0);
  await expect(member.getByText("A workspace owner can set up the next challenge.")).toBeVisible();

  await owner.goto(`/tasks?workspace=${workspaceId}`);
  await owner.getByLabel("Switch workspace").last().selectOption({ label: "Second Space" });
  await expect(owner).toHaveURL(new RegExp(`/tasks\\?workspace=${secondWorkspaceId}$`));
  await expect(owner.getByRole("heading", { name: "Tasks." })).toBeVisible();

  await owner.goto(`/history?workspace=${workspaceId}`);
  const memberFilter = owner.getByLabel("Member");
  const challengeFilter = owner.getByLabel("Challenge");
  const memberFilterId = await memberFilter.locator("option").nth(1).getAttribute("value");
  const challengeFilterId = await challengeFilter.locator("option").nth(1).getAttribute("value");
  expect(memberFilterId).toBeTruthy();
  expect(challengeFilterId).toBeTruthy();
  await owner.goto(`/history?workspace=${workspaceId}&member=${memberFilterId}&challenge=${challengeFilterId}&page=2`);
  await owner.getByLabel("Switch workspace").last().selectOption({ label: "Second Space" });
  await expect(owner).toHaveURL(new RegExp(`/history\\?workspace=${secondWorkspaceId}$`));
  const switchedHistoryUrl = new URL(owner.url());
  expect(switchedHistoryUrl.pathname).toBe("/history");
  expect(switchedHistoryUrl.searchParams.get("workspace")).toBe(secondWorkspaceId);
  expect([...switchedHistoryUrl.searchParams.keys()]).toEqual(["workspace"]);
  await owner.getByLabel("Switch workspace").last().selectOption({ label: workspaceName });
  await expect(owner.getByRole("heading", { name: "History." })).toBeVisible();

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
  const malformedResponse = await outsider.goto("/app?workspace=not-a-uuid");
  expect(malformedResponse?.status()).toBe(404);
  const deniedResponse = await outsider.goto(`/app?workspace=${workspaceId}`);
  expect(deniedResponse?.status()).toBe(404);
  await expect(outsider.getByText(workspaceName)).toHaveCount(0);
  await expect(outsider.getByText(challengeName)).toHaveCount(0);

  await owner.goto(`/settings?workspace=${workspaceId}`);
  await owner.getByLabel("New owner").selectOption({ label: "Rally Member" });
  const transferDialog = owner.waitForEvent("dialog").then((dialog) => dialog.accept());
  await owner.getByRole("button", { name: "Transfer ownership" }).click();
  await transferDialog;
  await expect(owner.getByRole("button", { name: "Leave workspace" })).toBeVisible();
  await expect(owner.getByRole("button", { name: "Create invite link" })).toHaveCount(0);
  await member.goto(`/settings?workspace=${workspaceId}`);
  await expect(member.getByRole("button", { name: "Create invite link" })).toBeVisible();
  await expect(member.locator(".role-chip", { hasText: "owner" })).toBeVisible();

  expect(hydrationWarnings).toEqual([]);

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

test("auth callback redirects use the configured application origin", async ({ request }) => {
  const response = await request.get("http://localhost:3000/auth/callback?next=%2Fapp", {
    headers: { host: "attacker.example", "x-forwarded-host": "attacker.example" },
    maxRedirects: 0,
  });

  expect(response.status()).toBe(307);
  expect(response.headers().location).toBe("http://localhost:3000/sign-in?status=link-invalid");
});

test("signup confirmation can be resent without exposing account status", async ({ browser }) => {
  test.setTimeout(90_000);
  const email = `confirmation-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@rally.test`;
  const context = await browser.newContext({ timezoneId: "Asia/Kolkata" });
  const page = await context.newPage();
  await page.goto("/sign-up");
  await page.getByLabel("Your name").fill("Confirmation Member");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(testPassword);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("status")).toContainText("Check your email for a confirmation link");
  await waitForMailCount(email, 1);
  // Local Supabase enforces the configured one-second email resend frequency.
  await page.waitForTimeout(1_100);

  await page.goto("/sign-in");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(testPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("button", { name: "Resend confirmation email" })).toBeVisible();
  await page.getByRole("button", { name: "Resend confirmation email" }).click();
  await expect(page.getByRole("status")).toContainText("If this address still needs signup confirmation");
  await waitForMailCount(email, 2);
  const confirmationLink = await waitForAuthLink(email, "signup");
  await page.goto(confirmationLink);
  await expect(page).toHaveURL(/localhost:3000\/app/, { timeout: 20_000 });
  await context.close();
});

test("auth forms show inline validation and a keyboard skip path", async ({ page }) => {
  await page.goto("/sign-up");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator('[id="main-content"]')).toHaveCount(1);
  await expect(page.locator("main.auth-page")).toBeFocused();

  await page.getByLabel("Email address").fill("not-an-email");
  await page.getByLabel("Password").fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter your name.")).toBeVisible();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Use at least 12 characters.")).toBeVisible();
  await expect(page.getByLabel("Your name")).toBeFocused();
});
