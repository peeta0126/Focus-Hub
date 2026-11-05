"use client";

import { useEffect, useRef } from "react";

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; }, [onDone]);
  useEffect(() => { const timer = window.setTimeout(() => done.current(), 5000); return () => window.clearTimeout(timer); }, [message]);
  return <div className="toast" role="status"><span>{message}</span><button type="button" onClick={onDone} aria-label="알림 닫기">×</button></div>;
}
