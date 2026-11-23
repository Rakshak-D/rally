"use client";

import { useEffect, useRef, useState } from "react";

import { aggregateWeeklyCheckins, type DailyCheckinCount } from "@/lib/domain/weekly-checkins";

function weekLabel(weekStart: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(`${weekStart}T00:00:00.000Z`));
}

export function WeeklyBars({ days, memberLabel }: { days: DailyCheckinCount[]; memberLabel: string }) {
  const chartRef = useRef<SVGSVGElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const weeks = aggregateWeeklyCheckins(days);
  const maxCount = Math.max(1, ...weeks.map((week) => week.checkinCount));
  const height = 116;
  const width = 640;
  const left = 28;
  const right = 14;
  const baseline = 132;
  const step = weeks.length > 1 ? (width - left - right) / weeks.length : 36;
  const barWidth = Math.min(26, Math.max(12, step * 0.56));

  useEffect(() => {
    const node = chartRef.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      node.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.25 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <section className="history-panel weekly-bars" aria-labelledby="weekly-bars-heading">
        <div className="records-section-heading"><div><h2 id="weekly-bars-heading">Check-ins per week</h2><p>{memberLabel}, grouped by challenge-local calendar week.</p></div></div>
      {!weeks.length ? (
        <p className="weekly-bars-empty">Weekly totals will appear when challenge days begin.</p>
      ) : (
        <>
          <div className="weekly-bars-scroll" role="region" tabIndex={0} aria-label="Scrollable weekly check-in bars">
            <svg
              ref={chartRef}
              className={`weekly-bars-chart${isVisible ? " is-visible" : ""}`}
              viewBox={`0 0 ${width} 166`}
              role="img"
              aria-label={`${weeks.length} weeks shown. ${weeks.reduce((total, week) => total + week.checkinCount, 0)} total check-ins.`}
            >
              <line x1={left} y1={baseline} x2={width - right} y2={baseline} className="weekly-bars-baseline" />
              {weeks.map((week, index) => {
                const barHeight = week.checkinCount ? Math.max(3, (week.checkinCount / maxCount) * height) : 0;
                const x = left + step * index + (step - barWidth) / 2;
                const y = baseline - barHeight;
                return (
                  <g key={week.weekStart}>
                    <rect
                      className="weekly-bars-bar"
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx="7"
                      style={{ animationDelay: `${index * 35}ms` }}
                    >
                      <title>{`${weekLabel(week.weekStart)}: ${week.checkinCount} ${week.checkinCount === 1 ? "check-in" : "check-ins"}`}</title>
                    </rect>
                    {weeks.length <= 10 || index % 2 === 0 || index === weeks.length - 1
                      ? <text className="weekly-bars-label" x={x + barWidth / 2} y="153" textAnchor="middle">{weekLabel(week.weekStart)}</text>
                      : null}
                  </g>
                );
              })}
            </svg>
          </div>
          <table className="visually-hidden">
            <caption>Check-ins per week</caption>
            <thead><tr><th scope="col">Week starting</th><th scope="col">Check-ins</th></tr></thead>
            <tbody>{weeks.map((week) => <tr key={week.weekStart}><th scope="row">{weekLabel(week.weekStart)}</th><td>{week.checkinCount}</td></tr>)}</tbody>
          </table>
        </>
      )}
    </section>
  );
}
