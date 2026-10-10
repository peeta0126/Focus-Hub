"use client";

import { useEffect, type ReactNode } from "react";

export function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.documentElement.classList.add("modal-open");
    window.addEventListener("keydown", handleKey);
    return () => {
      document.documentElement.classList.remove("modal-open");
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" role="presentation" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head"><h2 id="modal-title">{title}</h2><button className="close-button" onClick={onClose} aria-label="닫기">×</button></div>
        {children}
      </section>
    </div>
  );
}
