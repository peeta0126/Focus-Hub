"use client";

import { useState } from "react";
import { Icon } from "./Icon";
import { formatMonthLabel, getCalendarRange, getDateRangeStrings, shiftMonth, type CalendarView } from "@/lib/calendar";
import { addDaysToDateString, getLocalDateString } from "@/lib/date";

export function CalendarPicker({ selected, onSelect, items }: { selected: string; onSelect: (date: string) => void; items: { date: string; title: string }[] }) {
  const [view, setView] = useState<CalendarView>("month");
  const dates = getDateRangeStrings(getCalendarRange(selected, view));
  const labels = view === "month" ? ["일", "월", "화", "수", "목", "금", "토"] : ["월", "화", "수", "목", "금", "토", "일"];
  const today = getLocalDateString();
  return <section className={`planner-picker card picker-${view}`} aria-label="일정 날짜 선택">
    <div className="picker-toolbar"><div className="picker-period"><button type="button" className="icon-button" aria-label={view === "month" ? "이전 달" : "이전 주"} onClick={() => onSelect(view === "month" ? shiftMonth(selected, -1) : addDaysToDateString(selected, -7))}><Icon name="chevron-left" /></button><h2>{formatMonthLabel(selected)}</h2><button type="button" className="icon-button" aria-label={view === "month" ? "다음 달" : "다음 주"} onClick={() => onSelect(view === "month" ? shiftMonth(selected, 1) : addDaysToDateString(selected, 7))}><Icon name="chevron-right" /></button></div><div className="picker-actions"><button type="button" className="button" onClick={() => onSelect(today)}>오늘</button><div className="calendar-segmented" role="group" aria-label="플래너 보기"><button type="button" className={view === "month" ? "active" : ""} aria-pressed={view === "month"} onClick={() => setView("month")}>월간</button><button type="button" className={view === "week" ? "active" : ""} aria-pressed={view === "week"} onClick={() => setView("week")}>주간</button></div></div></div>
    <div className="picker-weekdays" aria-hidden="true">{labels.map((label) => <span key={label}>{label}</span>)}</div>
    <div className="picker-grid">{dates.map((date) => {
      const entries = items.filter((item) => item.date === date);
      return <button type="button" key={date} className={`picker-day${date === selected ? " selected" : ""}${date === today ? " today" : ""}${date.slice(0, 7) !== selected.slice(0, 7) ? " outside" : ""}`} onClick={() => onSelect(date)} aria-pressed={date === selected} aria-label={`${date}, 일정 ${entries.length}개`}><span className="picker-number">{Number(date.slice(-2))}</span><span className="picker-entries" aria-hidden="true">{entries.slice(0, 2).map((entry, index) => <span key={index}>{entry.title}</span>)}{entries.length > 2 && <small>+{entries.length - 2}개</small>}</span>{entries.length > 0 && <span className="picker-dot" aria-hidden="true" />}</button>;
    })}</div>
  </section>;
}
