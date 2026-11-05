"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId();
  const dialog = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const shell = document.querySelector<HTMLElement>(".main-area");
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    const nav = document.querySelector<HTMLElement>(".mobile-nav");
    const background = [shell, sidebar, nav, document.querySelector<HTMLElement>(".fab")].filter((element): element is HTMLElement => !!element);
    const previousInert = background.map((element) => element.inert);
    background.forEach((element) => { element.inert = true; });
    const focusable = () => Array.from(dialog.current?.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input:not(:disabled):not([type="hidden"]), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]') ?? []).filter((element) => element.getClientRects().length);
    const frame = requestAnimationFrame(() => { (dialog.current?.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea') ?? focusable()[0] ?? dialog.current)?.focus(); });
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0]; const last = elements.at(-1);
      if (!first) { event.preventDefault(); dialog.current?.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.documentElement.classList.add("modal-open");
    window.addEventListener("keydown", handleKey);
    return () => {
      document.documentElement.classList.remove("modal-open");
      window.removeEventListener("keydown", handleKey);
      cancelAnimationFrame(frame);
      background.forEach((element, index) => { element.inert = previousInert[index]; });
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className="modal-backdrop" role="presentation" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialog} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="sheet-handle" aria-hidden="true" />
        <div className="modal-head"><h2 id={titleId}>{title}</h2><button type="button" className="close-button" onClick={onClose} aria-label="닫기">×</button></div>
        {children}
      </section>
    </div>, document.body
  );
}
