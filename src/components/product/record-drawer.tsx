"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

import { Icon } from "@/components/ui/icons";

export function RecordDrawer({
  actionLabel,
  children,
  description,
  title,
}: {
  actionLabel: string;
  children: ReactNode;
  description: string;
  title: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = `record-drawer-title-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  useEffect(() => {
    function closeAfterCreate() {
      if (dialogRef.current?.open) dialogRef.current.close();
    }
    window.addEventListener("rally:record-created", closeAfterCreate);
    return () => window.removeEventListener("rally:record-created", closeAfterCreate);
  }, []);

  function close() {
    if (dialogRef.current?.open) dialogRef.current.close();
    else triggerRef.current?.focus();
  }

  return (
    <>
      <button ref={triggerRef} className="button button--primary" type="button" onClick={() => dialogRef.current?.showModal()}>
        <Icon name="plus" size={18} />{actionLabel}
      </button>
      <dialog
        className="record-dialog"
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => triggerRef.current?.focus()}
        onClick={(event) => { if (event.target === dialogRef.current) close(); }}
      >
        <section className="record-dialog-panel">
          <header className="record-dialog-heading">
            <div><h2 id={titleId}>{title}</h2><p>{description}</p></div>
            <button className="icon-button" type="button" onClick={close} aria-label={`Close ${title.toLowerCase()}`}><Icon name="close" /></button>
          </header>
          {children}
        </section>
      </dialog>
    </>
  );
}
