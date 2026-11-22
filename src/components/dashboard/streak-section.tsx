import type { WorkspaceDashboard } from "@/lib/data/dashboard";

export function StreakSection({ data, currentUserId }: { data: WorkspaceDashboard; currentUserId: string }) {
  const ownProgress = data.teamProgress.find((member) => member.userId === currentUserId);
  const current = ownProgress?.currentStreak ?? 0;
  const longest = ownProgress?.longestStreak ?? 0;

  return (
    <section className="streak-panel" aria-labelledby="streak-heading">
      <div className="section-heading section-heading--compact">
        <div>
          <p className="eyebrow">YOUR RHYTHM</p>
          <h2 id="streak-heading">A steady return.</h2>
        </div>
        <span className="streak-glyph" aria-hidden="true">↗</span>
      </div>
      <div className="streak-numbers">
        <div className="streak-current"><strong>{current}</strong><span>current</span></div>
        <div className="streak-longest"><strong>{longest}</strong><span>longest</span></div>
      </div>
      <p className="streak-note">{current > 0 ? "Your day counts through the challenge's local midnight." : "A check-in today begins your current streak."}</p>
    </section>
  );
}
