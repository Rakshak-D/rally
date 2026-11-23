"use client";

import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";

import { MemberAvatar } from "@/components/dashboard/member-avatar";
import { NoteCallout } from "@/components/dashboard/note-callout";
import { Icon } from "@/components/ui/icons";
import type { LaneCheckin } from "@/lib/data/dashboard";
import type { StampDay } from "@/lib/domain/stamp-lanes";

export type StampLaneMember = {
  id: string;
  name: string;
  avatarPath?: string | null;
  isSelf?: boolean;
};

type LaneCell = { member: StampLaneMember; day: StampDay; checkin: LaneCheckin | null };

export function StampLanes({
  members,
  days,
  checkins,
  orientation = "members",
  windowMode = true,
  windowSize = 14,
  allowExpand = false,
  animate = false,
  onOpenCheckin,
}: {
  members: StampLaneMember[];
  days: StampDay[];
  checkins: LaneCheckin[];
  orientation?: "members" | "days";
  windowMode?: boolean;
  windowSize?: number;
  allowExpand?: boolean;
  animate?: boolean;
  onOpenCheckin?: (checkin: LaneCheckin | null, member: StampLaneMember, day: StampDay) => void;
}) {
  const [compact, setCompact] = useState(false);
  const pageSize = Math.max(1, Math.floor(windowSize));
  const rangeKey = `${days[0]?.date ?? ""}:${days.at(-1)?.date ?? ""}:${pageSize}`;
  const initialWindowStart = Math.max(0, days.findIndex(({ state }) => state === "today") - Math.floor(pageSize * 0.65));
  const [windowCursor, setWindowCursor] = useState({ rangeKey, startIndex: initialWindowStart });
  const [showAllDays, setShowAllDays] = useState(false);
  const [activeCell, setActiveCell] = useState(0);
  const [focusAnnouncement, setFocusAnnouncement] = useState("");
  const [selectedCell, setSelectedCell] = useState<LaneCell | null>(null);
  const detailsRef = useRef<HTMLDialogElement>(null);
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const checkinByMemberDate = new Map(checkins.map((checkin) => [`${checkin.user_id}:${checkin.checkin_date}`, checkin]));

  useEffect(() => {
    const media = window.matchMedia("(max-width: 899px)");
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (selectedCell) detailsRef.current?.showModal();
    else if (detailsRef.current?.open) detailsRef.current.close();
  }, [selectedCell]);

  const windowStartIndex = windowCursor.rangeKey === rangeKey ? windowCursor.startIndex : initialWindowStart;
  const canPage = compact && windowMode && days.length > pageSize;
  const compactWindow = canPage && !showAllDays;
  const visibleDays = compactWindow ? days.slice(windowStartIndex, windowStartIndex + pageSize) : days;
  const maxWindowStart = Math.max(0, days.length - pageSize);

  function moveWindow(update: (startIndex: number) => number) {
    setWindowCursor((current) => ({
      rangeKey,
      startIndex: update(current.rangeKey === rangeKey ? current.startIndex : initialWindowStart),
    }));
  }

  function cellFor(member: StampLaneMember, day: StampDay): LaneCell {
    return { member, day, checkin: checkinByMemberDate.get(`${member.id}:${day.date}`) ?? null };
  }

  function dateLabel(date: string, options: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
    return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(new Date(`${date}T00:00:00.000Z`));
  }

  function openDetails(cell: LaneCell) {
    setSelectedCell(cell);
    onOpenCheckin?.(cell.checkin, cell.member, cell.day);
  }

  function handleCellKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, memberIndex: number, dayIndex: number) {
    const horizontal = orientation === "members" ? !compact : compact;
    let nextMember = memberIndex;
    let nextDay = dayIndex;
    if (horizontal && event.key === "ArrowLeft") nextDay -= 1;
    else if (horizontal && event.key === "ArrowRight") nextDay += 1;
    else if (horizontal && event.key === "ArrowUp") nextMember -= 1;
    else if (horizontal && event.key === "ArrowDown") nextMember += 1;
    else if (!horizontal && event.key === "ArrowLeft") nextMember -= 1;
    else if (!horizontal && event.key === "ArrowRight") nextMember += 1;
    else if (!horizontal && event.key === "ArrowUp") nextDay -= 1;
    else if (!horizontal && event.key === "ArrowDown") nextDay += 1;
    else return;

    event.preventDefault();
    if (nextMember < 0 || nextMember >= members.length || nextDay < 0 || nextDay >= days.length) return;
    const nextIndex = compact ? nextDay * members.length + nextMember : nextMember * days.length + nextDay;
    setActiveCell(nextIndex);
    const container = compact ? mobileRef.current : desktopRef.current;
    window.requestAnimationFrame(() => container?.querySelector<HTMLButtonElement>(`[data-cell-index="${nextIndex}"]`)?.focus());
  }

  function renderCell(cell: LaneCell, memberIndex: number, day: StampDay, inCompactLayout: boolean) {
    const checkin = cell.checkin;
    const todayIndexForDate = days.findIndex(({ date }) => date === day.date);
    const index = inCompactLayout ? todayIndexForDate * members.length + memberIndex : memberIndex * days.length + todayIndexForDate;
    const state = checkin ? "stamped" : day.state === "past" ? "missed" : day.state;
    const statusText = checkin ? "checked in" : day.state === "future" ? "not started" : day.state === "today" ? "not checked in yet" : "missed";
    const label = `${cell.member.name}, ${dateLabel(day.date)}, challenge day ${day.dayNumber}, ${statusText}${checkin ? `: ${checkin.accomplishment}` : ""}`;
    return (
      <button
        key={`${cell.member.id}:${day.date}`}
        className={`stamp-lane-cell${checkin ? " is-stamped" : ""}`}
        type="button"
        data-state={state}
        data-cell-index={index}
        aria-label={label}
        title={label}
        tabIndex={activeCell === index ? 0 : -1}
        style={{ "--cell-delay": `${Math.min(index * 12, 350)}ms` } as React.CSSProperties}
        onFocus={() => { setActiveCell(index); setFocusAnnouncement(label); }}
        onClick={() => openDetails(cell)}
        onKeyDown={(event) => handleCellKeyDown(event, memberIndex, todayIndexForDate)}
      >
        {checkin ? <Icon name="check" size={12} /> : day.state === "past" ? <span aria-hidden="true">·</span> : null}
      </button>
    );
  }

  function renderDayHeading(day: StampDay) {
    return (
      <div className={`stamp-day-heading${day.state === "today" ? " is-today" : ""}`} key={day.date} title={`${dateLabel(day.date)}, challenge day ${day.dayNumber}`}>
        {day.milestone && <span className="stamp-milestone-flag">{day.milestone}</span>}
        <span>{dateLabel(day.date, { day: "numeric" })}</span>
      </div>
    );
  }

  function renderMember(member: StampLaneMember) {
    return (
      <div className="stamp-member-heading" key={member.id} title={member.name}>
        <MemberAvatar name={member.name} userId={member.id} src={member.avatarPath} isSelf={member.isSelf} size="sm" />
        <span>{member.name}</span>
        {member.isSelf && <small>You</small>}
      </div>
    );
  }

  const rangeLabel = showAllDays
    ? `All ${days.length} challenge days`
    : visibleDays.length
      ? `Days ${visibleDays[0]?.dayNumber}–${visibleDays.at(-1)?.dayNumber} of ${days.at(-1)?.dayNumber ?? 0}`
      : "No challenge days";

  return (
    <section className={`stamp-lanes stamp-lanes--${orientation}`} aria-label="Challenge progress lanes">
      {canPage && (
        <div className={`stamp-window-controls${showAllDays ? " stamp-window-controls--expanded" : ""}`} role="group" aria-label="Challenge history dates">
          {showAllDays ? (
            <span className="stamp-window-range" aria-live="polite">{rangeLabel}</span>
          ) : (
            <>
              <button type="button" className="button button--secondary" aria-label={`Previous ${pageSize} days`} disabled={windowStartIndex === 0} onClick={() => moveWindow((index) => Math.max(0, index - pageSize))}>
                <Icon name="arrow" size={16} className="stamp-window-arrow stamp-window-arrow--previous" /> <span>Previous</span>
              </button>
              <span className="stamp-window-range" aria-live="polite">{rangeLabel}</span>
              <button type="button" className="button button--secondary" aria-label={`Next ${pageSize} days`} disabled={windowStartIndex >= maxWindowStart} onClick={() => moveWindow((index) => Math.min(maxWindowStart, index + pageSize))}>
                <span>Next</span> <Icon name="arrow" size={16} className="stamp-window-arrow" />
              </button>
            </>
          )}
          {allowExpand && <button type="button" className="button button--ghost stamp-window-expand" aria-expanded={showAllDays} onClick={() => setShowAllDays((expanded) => !expanded)}>{showAllDays ? `Show ${pageSize}-day view` : `Show all ${days.length} days`}</button>}
        </div>
      )}
      {!members.length || !days.length ? (
        <p className="stamp-lanes-empty">Check-ins will appear here when the challenge begins.</p>
      ) : (
        <>
          <div
            className="stamp-lanes-desktop-scroll"
            ref={desktopRef}
            aria-label="Member progress by challenge day"
            style={{ "--stamp-day-count": days.length } as React.CSSProperties}
          >
            <div className="stamp-lanes-desktop" data-animate={animate ? "true" : "false"}>
              <div className="stamp-lane-row stamp-lane-row--head">
                <span className="stamp-lane-name-heading">Members</span>
                {days.map(renderDayHeading)}
              </div>
              {members.map((member, memberIndex) => (
                <div className="stamp-lane-row" key={member.id}>
                  {renderMember(member)}
                  {days.map((day) => {
                    const cell = cellFor(member, day);
                    return renderCell(cell, memberIndex, day, false);
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className="stamp-lanes-mobile-scroll" ref={mobileRef} aria-label="Daily progress by member" style={{ "--stamp-member-count": members.length } as React.CSSProperties}>
            <div className="stamp-lanes-mobile">
              <div className="stamp-lanes-mobile-row stamp-lanes-mobile-row--head">
                <span>Day</span>
                {members.map(renderMember)}
              </div>
              {visibleDays.map((day) => (
                <div className="stamp-lanes-mobile-row" key={day.date}>
                  <div className="stamp-mobile-day-label"><strong>Day {day.dayNumber}</strong><span>{dateLabel(day.date)}</span>{day.milestone && <small>{day.milestone}-day milestone</small>}</div>
                  {members.map((member, memberIndex) => renderCell(cellFor(member, day), memberIndex, day, true))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      <p className="stamp-lanes-legend"><span className="stamp-lane-cell is-stamped" aria-hidden="true"><Icon name="check" size={12} /></span> Checked in <span className="stamp-lane-cell is-missed" aria-hidden="true">·</span> Missed <span className="stamp-lane-cell is-future" aria-hidden="true" /> Future day</p>
      <dialog className="stamp-details-dialog" ref={detailsRef} aria-label="Check-in details" onCancel={() => setSelectedCell(null)} onClose={() => setSelectedCell(null)}>
        {selectedCell && (
          <div className="stamp-details-content">
            <header><div><span>Challenge day {selectedCell.day.dayNumber}</span><h3>{selectedCell.member.name}</h3></div><button className="icon-button" type="button" aria-label="Close check-in details" onClick={() => setSelectedCell(null)}><Icon name="close" /></button></header>
            <time dateTime={selectedCell.day.date}>{dateLabel(selectedCell.day.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</time>
            {selectedCell.checkin ? <><p>{selectedCell.checkin.accomplishment}</p><p className="stamp-details-next"><strong>Next</strong> {selectedCell.checkin.next_plan}</p>{selectedCell.checkin.notes && <NoteCallout note={selectedCell.checkin.notes} />}</> : <p>{selectedCell.day.state === "future" ? "This challenge day has not started." : "No check-in was recorded for this day."}</p>}
          </div>
        )}
      </dialog>
      <span className="visually-hidden" aria-live="polite">{focusAnnouncement}</span>
    </section>
  );
}
