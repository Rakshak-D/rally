"use client";

import { useId, useState } from "react";

import { Icon } from "@/components/ui/icons";
import { parseCheckinNote } from "@/lib/domain/checkin-note";

export function NoteCallout({ note }: { note: string }) {
  const parsed = parseCheckinNote(note);
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const canExpand = parsed.text.length > 180;

  if (!parsed.text) return null;

  return (
    <div className={`note-callout${parsed.isBlocker ? " note-callout--blocker" : ""}`}>
      <Icon name={parsed.isBlocker ? "warning" : "note"} size={18} />
      <div className="note-callout-content">
        <span className="note-callout-label">{parsed.isBlocker ? "Blocker" : "Note"}</span>
        <p id={contentId} className={canExpand && !expanded ? "note-callout-text note-callout-text--clamped" : "note-callout-text"}>
          {parsed.text}
        </p>
        {canExpand && (
          <button className="note-callout-toggle" type="button" aria-controls={contentId} aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
            {expanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
}
