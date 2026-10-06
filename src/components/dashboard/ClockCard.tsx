"use client";

import { useEffect, useState } from "react";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function ClockCard() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const date = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일 (${DAYS[now.getDay()]})`;
  const time = now.toLocaleTimeString("en-GB", { hour12: false });
  return <section className="card card-pad clock-card"><div className="clock-top"><span className="moon-pixel">☾</span><span className="card-meta">오늘의 기록</span></div><p className="clock-date" suppressHydrationWarning>{date}</p><div className="clock-time" aria-live="off" suppressHydrationWarning>{time}</div><p className="daily-quote">“오늘의 꾸준함이, 내일의 실력이 된다.”</p></section>;
}
