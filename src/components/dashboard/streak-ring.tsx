"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

import { Icon } from "@/components/ui/icons";
import { TiltCard } from "@/components/ui/tilt-card";
import { streakMilestoneProgress } from "@/lib/domain/today";

const milestones = [3, 7, 14, 30] as const;
const radius = 49;
const circumference = 2 * Math.PI * radius;

export function StreakRing({ current, longest }: { current: number; longest: number }) {
  const progress = streakMilestoneProgress(current);
  const [celebrating, setCelebrating] = useState(false);
  const celebrationTimer = useRef<number | null>(null);

  useEffect(() => {
    const onSaved = () => {
      setCelebrating(true);
      if (celebrationTimer.current !== null) window.clearTimeout(celebrationTimer.current);
      celebrationTimer.current = window.setTimeout(() => setCelebrating(false), 1200);
    };
    window.addEventListener("rally:checkin-saved", onSaved);
    return () => {
      window.removeEventListener("rally:checkin-saved", onSaved);
      if (celebrationTimer.current !== null) window.clearTimeout(celebrationTimer.current);
    };
  }, []);

  const offset = circumference * (1 - progress.percent / 100);
  const ringStyle = { "--ring-offset": offset, "--ring-circumference": circumference } as CSSProperties;
  const countStyle = { "--streak-count": Math.max(0, Math.floor(current)), "--streak-number": Math.max(0, Math.floor(current)) } as CSSProperties;
  const badgeDescription = milestones.map((milestone) => `${milestone} day badge ${current >= milestone ? "earned" : "locked"}`).join(", ");

  return (
    <TiltCard as="section" className={`streak-ring-card${celebrating ? " is-celebrating" : ""}`} aria-label={`Streak. ${current} current days, ${longest} longest days. ${badgeDescription}`}>
      <div className="streak-ring-visual">
        <svg className="streak-ring-svg" viewBox="0 0 120 120" aria-hidden="true">
          <circle className="streak-ring-track" cx="60" cy="60" r={radius} />
          <circle
            className="streak-ring-progress"
            cx="60"
            cy="60"
            r={radius}
            style={ringStyle}
          />
        </svg>
        <div className={`streak-ring-core${current > 0 ? " is-lit" : ""}`} style={countStyle}>
          <svg className="streak-flame" viewBox="0 0 30 36" aria-hidden="true">
            <path className="streak-flame-back" d="M16 2c2 8-3 10-4 14-2-2-2-4-1-6C5 15 4 20 5 25a10 10 0 0 0 20-1c0-8-4-15-9-22Z" />
            <path className="streak-flame-front" d="M15 18c1 4-2 5-2 8a3 3 0 0 0 6 0c0-3-1-5-4-8Z" />
          </svg>
          <strong className="streak-counter" aria-hidden="true">{current}</strong>
          <span className="visually-hidden">{current} day streak</span>
        </div>
      </div>
      <div className="streak-ring-copy">
        <span className="streak-ring-title">Day streak</span>
        <p>{progress.next === null ? "100-day badge earned. Keep your rhythm going." : `${progress.daysRemaining} more ${progress.daysRemaining === 1 ? "day" : "days"} to your ${progress.next}-day badge`}</p>
        <span className="streak-longest-label">Longest: <strong>{longest}</strong> {longest === 1 ? "day" : "days"}</span>
      </div>
      <div className="streak-badges" role="list" aria-label="Streak milestones">
        {milestones.map((milestone) => {
          const earned = current >= milestone;
          return (
            <span className={`streak-badge${earned ? " is-earned" : ""}`} key={milestone} role="listitem" aria-label={`${milestone}-day badge ${earned ? "earned" : "locked"}`}>
              <Icon name={earned ? "check" : "lock"} size={13} /> {milestone}
            </span>
          );
        })}
      </div>
      <div className="streak-sparkles" aria-hidden="true"><i /><i /><i /><i /></div>
    </TiltCard>
  );
}
