import type { Tables } from "@/lib/supabase/database.types";
import { goalProgressPercent } from "@/lib/domain/goal-progress";

type HistoryEntry = Tables<"goal_progress_history"> & { displayName: string };

export function GoalProgressView({
  current,
  target,
  unit,
  history,
  timezone,
}: {
  current: number;
  target: number | null;
  unit: string | null;
  history: HistoryEntry[];
  timezone: string;
}) {
  const percent = goalProgressPercent(current, target);
  const quantity = `${formatAmount(current)}${unit ? ` ${unit}` : ""}`;

  return (
    <div className="goal-progress-view">
      <div className="goal-progress-summary">
        <span>Progress</span>
        <strong>{target === null ? quantity : `${quantity} of ${formatAmount(target)}${unit ? ` ${unit}` : ""}`}</strong>
      </div>
      {target !== null && percent !== null && (
        <div className="goal-progress-meter">
          <div
            aria-label="Goal progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-valuetext={`${quantity} of ${formatAmount(target)}${unit ? ` ${unit}` : ""}`}
            className="goal-progress-track"
            role="progressbar"
          >
            <span className="goal-progress-fill" style={{ width: `${percent}%` }} />
          </div>
          <span className="goal-progress-percent">{percent}% complete</span>
        </div>
      )}
      <details className="goal-progress-history">
        <summary>Progress updates <span>{history.length}</span></summary>
        {!history.length ? (
          <p className="quiet-copy">Progress changes will appear here.</p>
        ) : (
          <ol>
            {[...history].reverse().map((entry) => (
              <li key={entry.id}>
                <span><strong>{formatAmount(entry.progress_current)}{entry.progress_unit ? ` ${entry.progress_unit}` : ""}</strong> · {entry.displayName}</span>
                <time dateTime={entry.recorded_at}>{formatRecordedAt(entry.recorded_at, timezone)}</time>
              </li>
            ))}
          </ol>
        )}
      </details>
    </div>
  );
}

function formatAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function formatRecordedAt(value: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(value));
}
