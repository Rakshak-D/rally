import { mkdir } from "node:fs/promises";
import { Buffer } from "node:buffer";
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

function observeBrowserDiagnostics(page: Page, consoleErrors: string[], hydrationWarnings: string[]) {
  const notFoundDocumentUrls = new Set<string>();
  const pathname = () => {
    try {
      return new URL(page.url()).pathname;
    } catch {
      return "unknown route";
    }
  };

  page.on("response", (response) => {
    if (response.status() === 404 && response.request().isNavigationRequest()) {
      notFoundDocumentUrls.add(response.url());
    }
  });
  page.on("console", (message) => {
    // The browser reports expected 404 document navigations as resource errors; they are asserted separately in the access tests.
    const isExpectedNotFoundDocument =
      message.type() === "error" &&
      /Failed to load resource: the server responded with a status of 404/i.test(message.text()) &&
      notFoundDocumentUrls.delete(page.url());
    if (message.type() === "error" && !isExpectedNotFoundDocument) consoleErrors.push(`${pathname()}: console error`);
    if (/hydration|did not match|hydrating/i.test(message.text())) hydrationWarnings.push(`${pathname()}: hydration warning`);
  });
  page.on("pageerror", () => consoleErrors.push(`${pathname()}: uncaught page error`));
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
  const menu = card.locator("details.record-overflow");
  const isOpen = await menu.evaluate((element) => (element as HTMLDetailsElement).open);
  if (!isOpen) await menu.locator("summary").click();
  await menu.getByRole("button", { name: /^Edit (goal|task)$/ }).click();
  await expect(card.locator(".record-edit-panel")).toBeVisible();
}

async function openRecordActions(card: Locator): Promise<void> {
  const menu = card.locator("details.record-overflow");
  const isOpen = await menu.evaluate((element) => (element as HTMLDetailsElement).open);
  if (!isOpen) await menu.locator("summary").click();
}

async function openCreateRecord(page: Page, actionLabel: "New goal" | "New task"): Promise<Locator> {
  await page.getByRole("button", { name: actionLabel }).click();
  const dialog = page.locator("dialog.record-dialog");
  await expect(dialog).toBeVisible();
  return dialog.locator("form");
}

async function switchWorkspace(page: Page, workspaceName: string): Promise<void> {
  await page.getByRole("button", { name: /switch workspace$/i }).click();
  await page.getByRole("menuitemradio", { name: new RegExp(workspaceName) }).click();
}

async function chooseTheme(page: Page, theme: "Light" | "Dark" | "System"): Promise<void> {
  const trigger = page.locator(".profile-menu:visible").getByRole("button");
  await expect(trigger).toHaveAccessibleName(/Rally Owner/);
  await trigger.click();
  await page.getByRole("menuitemradio", { name: theme, exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme-preference", theme.toLowerCase());
  if (theme !== "System") await expect(page.locator("html")).toHaveAttribute("data-theme", theme.toLowerCase());
}

test("members can build, share, and protect real progress", async ({ browser }) => {
  test.setTimeout(420_000);
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const ownerEmail = `owner-${suffix}@rally.test`;
  const memberEmail = `member-${suffix}@rally.test`;
  const outsiderEmail = `outsider-${suffix}@rally.test`;
  const workspaceName = "Sunday Practice";
  const challengeName = "Show up daily";
  const firstTaskTitle = "Plan a focused session";
  const secondTaskTitle = "Prepare the next session";
  const updatedTaskTitle = "Book a quiet room";
  const initialGoalTitle = "Move each morning";
  const updatedGoalTitle = "Practice together";

  const ownerContext = await browser.newContext({ viewport: { width: 1440, height: 1100 }, timezoneId: "Asia/Kolkata" });
  const hydrationWarnings: string[] = [];
  const consoleErrors: string[] = [];
  ownerContext.on("page", (page) => observeBrowserDiagnostics(page, consoleErrors, hydrationWarnings));
  const owner = await ownerContext.newPage();
  const appActionNotes: Array<number | null> = [];
  owner.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/app") {
      const body = request.postData() ?? "";
      const note = body.match(/name="(?:_1_)?notes"\r\n\r\n([\s\S]*?)\r\n------/);
      appActionNotes.push(note ? note[1].length : null);
    }
  });

  await createConfirmedAccount(owner, ownerEmail, "Rally Owner");
  const profileMenuButton = owner.getByRole("button", { name: /Rally Owner/ });
  await profileMenuButton.focus();
  await profileMenuButton.press("Enter");
  const profileMenu = owner.getByRole("menu", { name: "Profile menu" });
  await expect(profileMenu).toBeVisible();
  await expect(owner.getByRole("menuitem", { name: "View profile" })).toBeFocused();
  await owner.keyboard.press("ArrowDown");
  await expect(owner.getByRole("menuitem", { name: "Settings" })).toBeFocused();
  await owner.keyboard.press("End");
  await expect(owner.getByRole("menuitem", { name: "Sign out" })).toBeFocused();
  await owner.keyboard.press("Escape");
  await expect(profileMenuButton).toBeFocused();
  await expect(owner.getByRole("heading", { name: "Start with a shared challenge" })).toBeVisible();
  await owner.getByLabel("Workspace name").fill(workspaceName);
  await owner.getByLabel("Timezone").selectOption("UTC");
  await owner.getByRole("button", { name: "Create workspace" }).click();
  await expect(owner.getByRole("heading", { name: "Create your first challenge" })).toBeVisible();
  await expect(owner.getByRole("link", { name: "Invite people" })).toHaveAttribute("href", /\/settings\?workspace=[a-f0-9-]{36}&tab=people#invites-heading/);
  await owner.getByLabel("Challenge name").fill(challengeName);

  const startDate = await owner.getByLabel("Start date").inputValue();
  const suggestedEnd = await owner.getByLabel("End date").inputValue();
  const startOrdinal = Date.parse(`${startDate}T00:00:00Z`);
  const endOrdinal = Date.parse(`${suggestedEnd}T00:00:00Z`);
  expect((endOrdinal - startOrdinal) / 86_400_000 + 1).toBe(60);

  await owner.getByRole("button", { name: "Start challenge" }).click();
  await expect(owner.getByRole("heading", { name: challengeName })).toBeVisible();
  await expect(owner.getByRole("link", { name: "Invite people" })).toHaveAttribute("href", /\/settings\?workspace=[a-f0-9-]{36}&tab=people#invites-heading/);
  await expect(owner.getByText(challengeName)).toBeVisible();
  const screenshots = path.resolve(process.cwd(), "output/playwright/final-review-2026-11-24");
  await mkdir(screenshots, { recursive: true });
  await owner.locator(".stamp-lanes-desktop").screenshot({ path: path.join(screenshots, "rally-stamp-empty.png") });
  await owner.getByRole("button", { name: "Add a note or blocker" }).click();
  await owner.getByLabel("Note for the group").fill("Need a quieter room.");
  await owner.getByRole("button", { name: "Blocker" }).click();
  const newCheckinInput = owner.getByLabel("What did you move forward today?");
  await newCheckinInput.focus();
  await owner.keyboard.press("g");
  await owner.keyboard.press("h");
  await expect(owner).toHaveURL(/\/app\?workspace=[a-f0-9-]{36}$/i);
  await newCheckinInput.fill("Finished the first focused session.");
  await owner.getByLabel("What's next?").fill("Set up tomorrow's session.");
  await owner.getByRole("button", { name: "Save check-in" }).click();
  await expect(owner.getByRole("status")).toContainText("Today's check-in saved.");
  await expect(owner.getByText("Done for today")).toBeVisible();
  await expect(owner.locator(".checkin-done-summary .note-callout-text")).toHaveText("Need a quieter room.");
  await expect(owner.locator(".checkin-done-summary .note-callout-label")).toHaveText("Blocker");
  await owner.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(owner.locator(".toast-card")).toContainText("Check-in undone.");
  await expect(owner.getByText("Done for today")).toHaveCount(0);
  await expect(owner.locator(".today-run-mark strong")).toHaveText("0");
  await owner.locator(".stamp-lanes-desktop").screenshot({ path: path.join(screenshots, "rally-stamp-undone.png") });
  await owner.getByRole("button", { name: "Add a note or blocker" }).click();
  await owner.getByLabel("Note for the group").fill("Need a quieter room.");
  await owner.getByRole("button", { name: "Blocker" }).click();
  await newCheckinInput.fill("Finished the first focused session.");
  await owner.getByLabel("What's next?").fill("Set up tomorrow's session.");
  await owner.getByRole("button", { name: "Save check-in" }).click();
  await expect(owner.getByRole("status")).toContainText("Today's check-in saved.");
  await expect(owner.getByText("Done for today")).toBeVisible();
  await owner.locator(".stamp-lanes-desktop").screenshot({ path: path.join(screenshots, "rally-stamp-checked-in.png") });
  await expect(owner.getByRole("button", { name: "Undo", exact: true })).toBeVisible();
  await owner.getByRole("button", { name: "Edit" }).click();
  await expect(owner.getByRole("button", { name: "Undo", exact: true })).toHaveCount(0);
  await owner.getByLabel("Note for the group").fill("");
  await owner.getByRole("button", { name: "Blocker" }).click();
  const submittedNotes = await owner.locator(".checkin-form").evaluate((form) => new FormData(form as HTMLFormElement).get("notes"));
  expect(submittedNotes).toBe("");
  const actionCountBeforeClearing = appActionNotes.length;
  await owner.getByRole("button", { name: "Update check-in" }).click();
  await expect(owner.getByRole("status")).toContainText("Today's check-in updated.");
  expect(appActionNotes.length).toBeGreaterThan(actionCountBeforeClearing);
  expect(appActionNotes.at(-1)).toBe(0);
  await owner.reload();
  await expect(owner.getByText("Done for today")).toBeVisible();
  await expect(owner.locator(".today-run-mark strong")).toHaveText("1");

  const workspaceId = new URL(owner.url()).searchParams.get("workspace");
  expect(workspaceId).toMatch(/^[0-9a-f-]{36}$/i);

  await owner.goto("/profile");
  const avatarFixtureBase64 = await owner.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable in this test browser.");
    context.fillStyle = "#5b4bff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.arc(32, 32, 14, 0, Math.PI * 2);
    context.fill();
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await owner.getByLabel("Choose profile photo").setInputFiles({
    name: "rally-avatar.png",
    mimeType: "image/png",
    buffer: Buffer.from(avatarFixtureBase64, "base64"),
  });
  await expect(owner.getByRole("group", { name: /Photo crop area/ })).toBeVisible();
  await owner.getByLabel("Zoom photo").fill("1.25");
  await owner.getByRole("button", { name: "Move left" }).click();
  await owner.getByRole("button", { name: "Save photo" }).click();
  await expect(owner.locator(".toast-card")).toContainText("Profile photo updated.", { timeout: 15_000 });
  await expect(owner.locator(".avatar-uploader-current .member-avatar img")).toBeVisible();
  await expect.poll(() => owner.locator(".avatar-uploader-current .member-avatar img").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBe(256);

  await owner.goto(`/settings?workspace=${workspaceId}&tab=challenges`);
  await owner.locator(".challenge-create-details > summary").click();
  const nextChallengeForm = owner.locator(".challenge-create-details form");
  await nextChallengeForm.getByLabel("Challenge name").fill("Next rhythm");
  await nextChallengeForm.getByRole("button", { name: "Start challenge" }).click();
  await owner.goto(`/settings?workspace=${workspaceId}&tab=challenges`);
  const challengeInputs = owner.locator(".challenge-settings-item input[id]");
  const challengeIds = await challengeInputs.evaluateAll((items) => items.map((item) => item.id));
  expect(new Set(challengeIds).size).toBe(challengeIds.length);
  const labelControlsMatch = await owner.locator(".challenge-settings-item label").evaluateAll((labels) =>
    labels.every((label) => (label as HTMLLabelElement).control === label.querySelector("input, textarea")),
  );
  expect(labelControlsMatch).toBe(true);
  await owner.goto(`/app?workspace=${workspaceId}`);

  await owner.keyboard.press("Control+k");
  const commandDialog = owner.getByRole("dialog", { name: "Rally commands" });
  await expect(commandDialog).toBeVisible();
  await expect(commandDialog.getByRole("menuitem", { name: "New goal" })).toBeVisible();
  await owner.keyboard.press("Escape");
  await expect(commandDialog).toBeHidden();

  await owner.keyboard.press("g");
  await owner.keyboard.press("h");
  await expect(owner).toHaveURL(new RegExp(`/history\\?workspace=${workspaceId}$`));
  await owner.goto(`/app?workspace=${workspaceId}`);
  const desktopLane = owner.locator(".stamp-lanes-desktop");
  const desktopFirstStamp = desktopLane.locator(".stamp-lane-cell").first();
  await expect(desktopFirstStamp).toHaveAttribute("aria-label", /challenge day 1/);
  await desktopFirstStamp.focus();
  await owner.keyboard.press("ArrowRight");
  await expect(desktopLane.locator('[data-cell-index="1"]')).toBeFocused();

  await owner.setViewportSize({ width: 375, height: 844 });
  const mobileLane = owner.locator(".stamp-lanes-mobile");
  await expect(mobileLane.locator(".stamp-lanes-mobile-row")).toHaveCount(8);
  const firstMobileDay = mobileLane.locator(".stamp-lanes-mobile-row").nth(1);
  const nextMobileDay = mobileLane.locator(".stamp-lanes-mobile-row").nth(2);
  const firstMobileStamp = firstMobileDay.locator(".stamp-lane-cell").first();
  await expect(firstMobileStamp).toBeVisible();
  await firstMobileStamp.focus();
  await owner.keyboard.press("ArrowDown");
  await expect(nextMobileDay.locator(".stamp-lane-cell").first()).toBeFocused();
  await owner.setViewportSize({ width: 1440, height: 1100 });

  await owner.goto("/tasks");
  const initialTaskForm = await openCreateRecord(owner, "New task");
  await initialTaskForm.getByRole("button", { name: "Add task" }).click();
  await expect(initialTaskForm.getByText("Enter a title.")).toBeVisible();
  await initialTaskForm.getByLabel("Task title").fill(firstTaskTitle);
  await owner.getByRole("button", { name: "Add task" }).click();
  const taskCard = owner.locator("li.record-card").filter({ hasText: firstTaskTitle });
  await expect(taskCard).toBeVisible({ timeout: 30_000 });
  const secondTaskForm = await openCreateRecord(owner, "New task");
  await secondTaskForm.getByLabel("Task title").fill(secondTaskTitle);
  await owner.getByRole("button", { name: "Add task" }).click();
  const taskOrder = owner.locator(".task-card h2");
  await expect(taskOrder).toHaveText([firstTaskTitle, secondTaskTitle]);
  await taskCard.getByRole("button", { name: "Move down" }).click();
  await expect(taskOrder).toHaveText([secondTaskTitle, firstTaskTitle]);
  await owner.reload();
  await expect(taskOrder).toHaveText([secondTaskTitle, firstTaskTitle]);
  await openRecordEditor(taskCard);
  await taskCard.locator('input[name="title"]').fill(updatedTaskTitle);
  await taskCard.getByRole("button", { name: "Save changes" }).click();
  const updatedTaskCard = owner.locator("li.record-card").filter({ hasText: updatedTaskTitle });
  await expect(updatedTaskCard.locator(".task-status-control-label")).toHaveText("To do");
  await updatedTaskCard.getByRole("button", { name: `Mark ${updatedTaskTitle} in progress` }).click();
  await expect(updatedTaskCard.locator(".task-status-control-label")).toHaveText("In progress");
  await updatedTaskCard.getByRole("button", { name: `Mark ${updatedTaskTitle} done` }).click();
  await expect(updatedTaskCard.locator(".task-status-control-label")).toHaveText("Done");
  await updatedTaskCard.getByRole("button", { name: `Mark ${updatedTaskTitle} to do` }).click();
  await expect(updatedTaskCard.locator(".task-status-control-label")).toHaveText("To do");

  await owner.goto("/goals");
  const goalTrigger = owner.getByRole("button", { name: "New goal" });
  await goalTrigger.click();
  const goalDialog = owner.locator("dialog.record-dialog");
  await expect(goalDialog).toBeVisible();
  await owner.keyboard.press("Escape");
  await expect(goalDialog).not.toBeVisible();
  await expect(goalTrigger).toBeFocused();
  const initialGoalForm = await openCreateRecord(owner, "New goal");
  await initialGoalForm.getByRole("button", { name: "Add goal" }).click();
  await expect(initialGoalForm.getByText("Enter a title.")).toBeVisible();
  await initialGoalForm.getByLabel("Goal title").fill(initialGoalTitle);
  await owner.getByRole("button", { name: "Add goal" }).click();
  const goalCard = owner.locator("li.record-card").filter({ hasText: initialGoalTitle });
  await expect(goalCard).toBeVisible({ timeout: 30_000 });
  await openRecordEditor(goalCard);
  await goalCard.locator('input[name="title"]').fill(updatedGoalTitle);
  await goalCard.getByRole("button", { name: "Save changes" }).click();
  await expect(owner.locator("li.record-card").filter({ hasText: updatedGoalTitle })).toBeVisible();

  await owner.goto("/settings?tab=people");
  await owner.getByRole("button", { name: "Create invite link" }).click();
  const inviteLink = await owner.locator("#created-invite-link").inputValue();
  expect(inviteLink).toMatch(/^http:\/\/localhost:3000\/join\/[a-f0-9]{64}$/i);

  const memberContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "UTC" });
  memberContext.on("page", (page) => observeBrowserDiagnostics(page, consoleErrors, hydrationWarnings));
  const member = await memberContext.newPage();
  await member.goto(inviteLink);
  await expect(member.getByRole("heading", { name: "You have a Rally invite." })).toBeVisible();
  await expect(member.getByText(workspaceName)).toHaveCount(0);
  await expect(member.getByText(challengeName)).toHaveCount(0);
  await member.getByRole("link", { name: "Create account" }).click();
  await createConfirmedAccount(member, memberEmail, "Rally Member", new URL(inviteLink).pathname);
  await expect(member.getByRole("button", { name: "Accept invitation" })).toBeVisible();
  await member.getByRole("button", { name: "Accept invitation" }).click();
  await expect(member.getByRole("heading", { name: challengeName })).toBeVisible();
  await expect(member.getByRole("link", { name: "Invite people" })).toHaveCount(0);
  const longBlockerNote = "The shared room was unavailable, so I moved the practice outside and will book a backup space before tomorrow. ".repeat(2);
  await member.getByRole("button", { name: "Add a note or blocker" }).click();
  await member.getByLabel("Note for the group").fill(longBlockerNote);
  await member.getByRole("button", { name: "Blocker" }).click();
  const longAccomplishment = "Shared the first update with the group, then wrote down the changes so teammates could pick up the plan without waiting for another meeting. ".repeat(3);
  await member.getByLabel("What did you move forward today?").fill(longAccomplishment);
  await member.getByLabel("What's next?").fill("Keep the daily rhythm.");
  await member.getByRole("button", { name: "Save check-in" }).click();
  await expect(member.getByText("Done for today")).toBeVisible();
  await expect(member.getByText("2 members", { exact: true })).toBeVisible();
  await expect(member.getByText("Rally Owner").first()).toBeVisible();

  await member.goto("/settings?tab=people");
  await expect(member.getByRole("heading", { name: "Workspace members" })).toBeVisible();
  await expect(member.getByRole("heading", { name: "Bring someone in." })).toHaveCount(0);
  await expect(member.getByRole("button", { name: "Create invite link" })).toHaveCount(0);

  await owner.goto(`/tasks?workspace=${workspaceId}`);
  const assignedTaskForm = await openCreateRecord(owner, "New task");
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
  await memberAssignedTask.getByRole("button", { name: "Mark Prepare the shared session in progress" }).click();
  await expect(memberAssignedTask.locator(".task-status-control-label")).toHaveText("In progress");

  await member.goto(`/goals?workspace=${workspaceId}`);
  const memberGoal = member.locator("li.record-card").filter({ hasText: updatedGoalTitle });
  await expect(memberGoal.getByText("2 sessions of 5 sessions")).toBeVisible();
  await memberGoal.getByText(/Progress updates/).click();
  await expect(memberGoal.getByText("Rally Owner").last()).toBeVisible();
  const goalProgressHistory = memberGoal.locator(".goal-progress-history time");
  await expect(goalProgressHistory).toHaveCount(2);
  await expect(goalProgressHistory.first()).toHaveAttribute("datetime", /.+/);

  await owner.goto(`/goals?workspace=${workspaceId}`);
  const goalToRemove = owner.locator("li.record-card").filter({ hasText: updatedGoalTitle });
  await openRecordActions(goalToRemove);
  const goalDeleteDialog = owner.waitForEvent("dialog").then((dialog) => dialog.accept());
  await goalToRemove.getByRole("button", { name: "Move to deleted items" }).click();
  await goalDeleteDialog;
  const goalUndoToast = owner.locator(".toast-card");
  await expect(goalUndoToast).toContainText("Goal moved to deleted items.");
  await goalUndoToast.getByRole("button", { name: "Undo" }).click();
  await expect(owner.locator("li.record-card").filter({ hasText: updatedGoalTitle })).toBeVisible();
  await openRecordActions(goalToRemove);
  const goalDeleteAgain = owner.waitForEvent("dialog").then((dialog) => dialog.accept());
  await goalToRemove.getByRole("button", { name: "Move to deleted items" }).click();
  await goalDeleteAgain;
  await expect(owner.getByText("Recently deleted goals")).toBeVisible();
  const deletedGoals = owner.locator("details.deleted-records");
  await deletedGoals.locator("summary").click();
  await deletedGoals.getByRole("button", { name: "Restore" }).click();
  await expect(owner.locator("li.record-card").filter({ hasText: updatedGoalTitle })).toBeVisible();

  await owner.goto(`/tasks?workspace=${workspaceId}`);
  const taskToRemove = owner.locator("li.record-card").filter({ hasText: updatedTaskTitle });
  await openRecordActions(taskToRemove);
  const taskDeleteDialog = owner.waitForEvent("dialog").then((dialog) => dialog.accept());
  await taskToRemove.getByRole("button", { name: "Move to deleted items" }).click();
  await taskDeleteDialog;
  const taskUndoToast = owner.locator(".toast-card");
  await expect(taskUndoToast).toContainText("Task moved to deleted items.");
  await taskUndoToast.getByRole("button", { name: "Undo" }).click();
  await expect(owner.locator("li.record-card").filter({ hasText: updatedTaskTitle })).toBeVisible();
  await openRecordActions(taskToRemove);
  const taskDeleteAgain = owner.waitForEvent("dialog").then((dialog) => dialog.accept());
  await taskToRemove.getByRole("button", { name: "Move to deleted items" }).click();
  await taskDeleteAgain;
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
  await expect(owner.getByText("Shared the first update with the group", { exact: false })).toBeVisible();
  await owner.setViewportSize({ width: 375, height: 844 });
  const historyLanes = owner.locator(".history-lanes-panel .stamp-lanes");
  const historyLaneRows = historyLanes.locator(".stamp-lanes-mobile-row");
  await expect(historyLaneRows).toHaveCount(15);
  await expect(historyLanes.getByRole("button", { name: "Previous 14 days" })).toBeDisabled();
  await historyLanes.getByRole("button", { name: "Next 14 days" }).click();
  await expect(historyLanes.locator(".stamp-window-range")).toHaveText("Days 15–28 of 60");
  await historyLanes.getByRole("button", { name: "Show all 60 days" }).click();
  await expect(historyLaneRows).toHaveCount(61);
  await historyLanes.getByRole("button", { name: "Show 14-day view" }).click();
  await expect(historyLaneRows).toHaveCount(15);
  await expect(historyLanes.locator(".stamp-window-range")).toHaveText("Days 15–28 of 60");
  await owner.locator(".mobile-nav").getByRole("link", { name: "History" }).click();
  await expect(owner).toHaveURL(/\/history\?/);
  await expect(historyLaneRows).toHaveCount(15);
  await owner.evaluate(() => window.scrollTo(0, Math.min(600, document.documentElement.scrollHeight)));
  const historyScrollPosition = await owner.evaluate(() => window.scrollY);
  expect(historyScrollPosition).toBeGreaterThan(0);
  await owner.locator(".mobile-nav").getByRole("link", { name: "Tasks" }).click();
  await expect(owner).toHaveURL(/\/tasks\?/);
  await owner.goBack();
  await expect(owner.locator(".history-page")).toBeVisible();
  await expect.poll(() => owner.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await owner.setViewportSize({ width: 1440, height: 1100 });
  const historyNote = owner.locator(".history-record").filter({ hasText: "Shared the first update with the group" }).locator(".note-callout");
  await expect(historyNote.getByText("Blocker", { exact: true })).toBeVisible();
  await historyNote.getByRole("button", { name: "Show more" }).click();
  await expect(historyNote.getByRole("button", { name: "Show less" })).toBeVisible();

  await owner.goto("/app");
  await owner.setViewportSize({ width: 1440, height: 1100 });
  await owner.screenshot({ path: path.join(screenshots, "rally-dashboard-desktop.png"), fullPage: true });
  await owner.setViewportSize({ width: 390, height: 844 });
  await owner.screenshot({ path: path.join(screenshots, "rally-dashboard-mobile.png"), fullPage: true });
  await expect(owner.locator("body")).toHaveJSProperty("scrollWidth", 390);

  const responsiveRoutes = [
    { href: "/app", name: "today" },
    { href: "/history", name: "history" },
    { href: "/goals", name: "goals" },
    { href: "/tasks", name: "tasks" },
    { href: "/settings", name: "settings" },
    { href: "/profile", name: "profile" },
    { href: "/help", name: "help" },
  ];
  for (const theme of ["Light", "Dark"] as const) {
    await chooseTheme(owner, theme);
    for (const width of [375, 390, 768, 1024, 1440]) {
      await owner.setViewportSize({ width, height: 900 });
      for (const route of responsiveRoutes) {
        const href = route.href === "/profile" || route.href === "/help"
          ? route.href
          : `${route.href}?workspace=${workspaceId}`;
        await owner.goto(href);
        await expect(owner.locator("main h1")).toBeVisible();
        const documentWidth = await owner.evaluate(() =>
          Math.max(document.body.scrollWidth, document.documentElement.scrollWidth),
        );
        expect(documentWidth, `${route.href} overflows at ${width}px`).toBeLessThanOrEqual(width);

        if (width === 375 || width === 768 || width === 1440) {
          await owner.waitForTimeout(800);
          await owner.screenshot({
            path: path.join(screenshots, `rally-${route.name}-${width}-${theme.toLowerCase()}.png`),
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
            `${route.href} at ${width}px in ${theme} theme has accessibility violations`,
          ).toEqual([]);
        }
      }
    }
  }
  await owner.emulateMedia({ reducedMotion: "reduce" });
  await owner.goto(`/app?workspace=${workspaceId}`);
  const reducedMotionAnimation = await owner.locator(".stamp-lanes-desktop .stamp-lane-cell").first().evaluate((element) => getComputedStyle(element).animationName);
  expect(reducedMotionAnimation, "reduced motion keeps lane stamps static").toBe("none");
  await owner.emulateMedia({ reducedMotion: "no-preference" });
  await chooseTheme(owner, "System");
  await owner.setViewportSize({ width: 390, height: 844 });
  await owner.goto("/profile");
  await owner.getByRole("button", { name: "Remove photo" }).click();
  await expect(owner.locator(".toast-card")).toContainText("Profile photo removed.");
  await expect(owner.locator(".avatar-uploader-current .member-avatar img")).toHaveCount(0);

  await owner.goto("/settings?tab=workspace");
  await owner.locator(".workspace-create-details > summary").click();
  const secondWorkspaceForm = owner.locator(".workspace-create-details form");
  await secondWorkspaceForm.getByLabel("Workspace name").fill("Second Space");
  await secondWorkspaceForm.getByLabel("Timezone").selectOption("UTC");
  await secondWorkspaceForm.getByRole("button", { name: "Create workspace" }).click();
  await expect(owner.getByRole("heading", { name: "Create your first challenge" })).toBeVisible();
  const secondWorkspaceId = new URL(owner.url()).searchParams.get("workspace");
  expect(secondWorkspaceId).toMatch(/^[0-9a-f-]{36}$/i);

  const todayUtc = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const challengeStart = new Date(`${todayUtc}T00:00:00.000Z`);
  challengeStart.setUTCDate(challengeStart.getUTCDate() - 10);
  const challengeEnd = new Date(`${todayUtc}T00:00:00.000Z`);
  challengeEnd.setUTCDate(challengeEnd.getUTCDate() - 1);
  await owner.goto(`/settings?workspace=${secondWorkspaceId}&tab=challenges`);
  await owner.locator(".challenge-create-details > summary").click();
  const completedChallengeForm = owner.locator(".challenge-create-details form");
  await completedChallengeForm.getByLabel("Challenge name").fill("Finished rhythm");
  await completedChallengeForm.getByLabel("Start date").fill(challengeStart.toISOString().slice(0, 10));
  await completedChallengeForm.getByLabel("End date").fill(challengeEnd.toISOString().slice(0, 10));
  await completedChallengeForm.getByRole("button", { name: "Start challenge" }).click();
  await expect(owner).toHaveURL(new RegExp(`/app\\?workspace=${secondWorkspaceId}$`));
  await expect(owner.getByText("This challenge is complete. Check-ins, goals, and history remain available.")).toBeVisible();
  await expect(owner.getByRole("link", { name: /Plan the next challenge/ })).toBeVisible();

  await owner.goto(`/settings?workspace=${secondWorkspaceId}&tab=people`);
  await owner.getByRole("button", { name: "Create invite link" }).click();
  const secondInviteLink = await owner.locator("#created-invite-link").inputValue();
  await member.goto(secondInviteLink);
  await member.getByRole("button", { name: "Accept invitation" }).click();
  await expect(member).toHaveURL(new RegExp(`/app\\?workspace=${secondWorkspaceId}$`));
  await expect(member.getByText("This challenge is complete. Check-ins, goals, and history remain available.")).toBeVisible();
  await expect(member.getByRole("link", { name: /Plan the next challenge/ })).toHaveCount(0);
  await expect(member.getByText("A workspace owner can set up the next challenge.")).toBeVisible();

  await owner.goto(`/tasks?workspace=${workspaceId}`);
  await switchWorkspace(owner, "Second Space");
  await expect(owner).toHaveURL(new RegExp(`/tasks\\?workspace=${secondWorkspaceId}$`));
  await expect(owner.getByRole("heading", { name: "Tasks" })).toBeVisible();

  await owner.goto(`/history?workspace=${workspaceId}`);
  const memberFilter = owner.locator("#history-member");
  await expect(memberFilter).toBeVisible();
  const memberFilterId = await memberFilter.selectOption({ label: "Rally Member" });
  expect(memberFilterId).toBeTruthy();
  await expect(owner).toHaveURL(new RegExp(`member=${memberFilterId}`));

  const challengeFilterId = await owner.locator('.history-filters select[name="challenge"]').selectOption({ label: "Show up daily · active" });
  expect(challengeFilterId).toBeTruthy();
  await expect(owner).toHaveURL(new RegExp(`challenge=${challengeFilterId}`));
  await owner.goto(`/history?workspace=${workspaceId}&member=${memberFilterId}&challenge=${challengeFilterId}&page=2&view=compact`);
  await switchWorkspace(owner, "Second Space");
  await expect(owner).toHaveURL(new RegExp(`/history\\?.*workspace=${secondWorkspaceId}.*view=compact|/history\\?.*view=compact.*workspace=${secondWorkspaceId}`));
  const switchedHistoryUrl = new URL(owner.url());
  expect(switchedHistoryUrl.pathname).toBe("/history");
  expect(switchedHistoryUrl.searchParams.get("workspace")).toBe(secondWorkspaceId);
  expect([...switchedHistoryUrl.searchParams.keys()].sort()).toEqual(["view", "workspace"]);
  expect(switchedHistoryUrl.searchParams.get("view")).toBe("compact");
  await switchWorkspace(owner, workspaceName);
  await expect(owner.getByRole("heading", { name: "History" })).toBeVisible();

  const replayContext = await browser.newContext();
  replayContext.on("page", (page) => observeBrowserDiagnostics(page, consoleErrors, hydrationWarnings));
  const replay = await replayContext.newPage();
  await createConfirmedAccount(replay, `replay-${suffix}@rally.test`, "Invite Replay");
  await replay.goto(inviteLink);
  await expect(replay.getByRole("heading", { name: "Ready to join?" })).toBeVisible();
  await replay.getByRole("button", { name: "Accept invitation" }).click();
  await expect(replay.locator(".form-message--error")).toContainText("This invite is unavailable.");

  const outsiderContext = await browser.newContext();
  outsiderContext.on("page", (page) => observeBrowserDiagnostics(page, consoleErrors, hydrationWarnings));
  const outsider = await outsiderContext.newPage();
  await createConfirmedAccount(outsider, outsiderEmail, "Rally Outsider");
  const malformedResponse = await outsider.goto("/app?workspace=not-a-uuid");
  expect(malformedResponse?.status()).toBe(404);
  const deniedResponse = await outsider.goto(`/app?workspace=${workspaceId}`);
  expect(deniedResponse?.status()).toBe(404);
  await expect(outsider.getByText(workspaceName)).toHaveCount(0);
  await expect(outsider.getByText(challengeName)).toHaveCount(0);

  await owner.goto(`/settings?workspace=${workspaceId}&tab=people`);
  await owner.getByLabel("New owner").selectOption({ label: "Rally Member" });
  const transferDialog = owner.waitForEvent("dialog").then((dialog) => dialog.accept());
  await owner.getByRole("button", { name: "Transfer ownership" }).click();
  await transferDialog;
  await expect(owner.getByRole("button", { name: "Leave workspace" })).toBeVisible();
  await expect(owner.getByRole("button", { name: "Create invite link" })).toHaveCount(0);
  await member.goto(`/settings?workspace=${workspaceId}&tab=people`);
  await expect(member.getByRole("button", { name: "Create invite link" })).toBeVisible();
  await member.goto(`/settings?workspace=${workspaceId}&tab=workspace`);
  await expect(member.locator(".role-chip", { hasText: "owner" })).toBeVisible();

  await member.goto(`/settings?workspace=${workspaceId}&tab=people`);
  await member.getByRole("button", { name: "Create invite link" }).click();
  const thirdMemberInvite = await member.locator("#created-invite-link").inputValue();
  await replay.goto(thirdMemberInvite);
  await replay.getByRole("button", { name: "Accept invitation" }).click();
  await expect(replay).toHaveURL(new RegExp(`/app\\?workspace=${workspaceId}$`));
  await replay.goto(`/settings?workspace=${workspaceId}&tab=profile`);
  const longMemberName = "Alexandra Montgomery";
  await replay.getByLabel("Display name").fill(longMemberName);
  await replay.getByRole("button", { name: "Save profile" }).click();
  await expect(replay.locator(".toast-card")).toContainText("Profile saved.");
  await replay.setViewportSize({ width: 375, height: 844 });
  await replay.goto(`/app?workspace=${workspaceId}`);
  await expect(replay.getByText("3 members", { exact: true })).toBeVisible();
  const longNameHeader = replay.locator(".stamp-lanes-mobile-row--head .stamp-member-heading").filter({ hasText: longMemberName });
  await expect(longNameHeader).toBeVisible();
  await expect(longNameHeader.locator("span:not(.member-avatar)")).toHaveText(longMemberName);
  await replay.screenshot({ path: path.join(screenshots, "rally-today-three-members-mobile.png"), fullPage: true });
  await expect(replay.locator("body")).toHaveJSProperty("scrollWidth", 375);

  expect(hydrationWarnings).toEqual([]);
  expect(consoleErrors).toEqual([]);

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
  await page.getByRole("button", { name: /Recovery Member/ }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
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
  await page.getByRole("button", { name: /Recovery Member/ }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
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
