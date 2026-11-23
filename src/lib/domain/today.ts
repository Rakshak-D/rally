const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100] as const;

export type StreakMilestoneProgress = {
  previous: number;
  next: number | null;
  daysRemaining: number;
  percent: number;
};

export function greetingForUser(now: Date, timeZone: string, displayName: string): string {
  const hourText = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const hour = Number(hourText);
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = displayName.trim().split(/\s+/)[0] || "there";
  return `${greeting}, ${firstName}`;
}

export function relativeTimeLabel(timestamp: string, now = new Date()): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.valueOf())) return "Earlier";

  const deltaMinutes = Math.round((parsed.valueOf() - now.valueOf()) / 60_000);
  const future = deltaMinutes > 0;
  const absoluteMinutes = Math.abs(deltaMinutes);
  if (absoluteMinutes < 1) return "Just now";
  if (absoluteMinutes < 60) return future ? `in ${absoluteMinutes}m` : `${absoluteMinutes}m ago`;

  const hours = Math.round(absoluteMinutes / 60);
  if (hours < 24) return future ? `in ${hours}h` : `${hours}h ago`;

  const days = Math.round(hours / 24);
  if (days < 7) return future ? `in ${days}d` : `${days}d ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(parsed);
}

export function streakMilestoneProgress(currentStreak: number): StreakMilestoneProgress {
  const current = Number.isFinite(currentStreak) ? Math.max(0, Math.floor(currentStreak)) : 0;
  const previous = [...STREAK_MILESTONES].reverse().find((milestone) => current >= milestone) ?? 0;
  const next = STREAK_MILESTONES.find((milestone) => current < milestone) ?? null;

  if (next === null) return { previous, next, daysRemaining: 0, percent: 100 };

  const span = next - previous;
  const progress = span === 0 ? 0 : Math.round(((current - previous) / span) * 100);
  return {
    previous,
    next,
    daysRemaining: next - current,
    percent: Math.min(100, Math.max(0, progress)),
  };
}
