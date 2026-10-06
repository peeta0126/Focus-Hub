import Link from "next/link";
import { getLocalDateString, getWeekDateStrings } from "@/lib/date";
import type { CalendarEvent } from "@/lib/types";

const labels = ["월", "화", "수", "목", "금", "토", "일"];

function eventTime(event: CalendarEvent) {
  if (event.startTime && event.endTime) return `${event.startTime} — ${event.endTime}`;
  if (event.startTime) return event.startTime;
  if (event.endTime) return `종료 ${event.endTime}`;
  return "시간 미정";
}

export function WeeklyCalendar({ events = [], timeZone }: { events?: CalendarEvent[]; timeZone?: string }) {
  const dates = getWeekDateStrings(getLocalDateString(timeZone));
  const days = dates.map((full, index) => ({ label: labels[index], date: full.slice(8), full }));
  const rangeLabel = `${Number(dates[0].slice(5, 7))}월 ${Number(dates[0].slice(8))}일 — ${Number(dates[6].slice(5, 7))}월 ${Number(dates[6].slice(8))}일`;
  return <section className="card card-pad weekly-card"><div className="card-header"><div><h2 className="card-title">주간 일정</h2><span className="card-meta">{rangeLabel}</span></div><Link href="/planner" className="link-more">플래너 열기 →</Link></div><div className="week-grid">{days.map((day) => <div key={day.full} className="day-column"><div className="day-head"><span>{day.label}</span><b>{day.date}</b></div><div className="day-events">{events.filter((event) => event.date === day.full).map((event) => <article key={event.id} className={`event-block cat-${event.category}`}><strong>{event.title}</strong><span>{eventTime(event)}</span></article>)}</div></div>)}</div></section>;
}
