"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/common/Icon";
import { getCalendarRange, getDateRangeStrings, shiftMonth, type CalendarView } from "@/lib/calendar";
import { addDaysToDateString, getLocalDateString } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import type { CalendarEvent, Priority, Task, TaskStatus } from "@/lib/types";

const VIEW_STORAGE_KEY = "focus-hub:calendar-view:v1";
const VIEW_CHANGE_EVENT = "focus-hub:calendar-view-changed";
const weekLabels = ["월", "화", "수", "목", "금", "토", "일"];
const monthLabels = ["일", "월", "화", "수", "목", "금", "토"];

interface CalendarData {
  events: CalendarEvent[];
  tasks: Task[];
}

function eventTime(event: CalendarEvent) {
  if (event.startTime && event.endTime) return `${event.startTime.slice(0, 5)} – ${event.endTime.slice(0, 5)}`;
  if (event.startTime) return event.startTime.slice(0, 5);
  if (event.endTime) return `종료 ${event.endTime.slice(0, 5)}`;
  return "시간 미정";
}

function rangeKey(view: CalendarView, start: string, end: string) {
  return `${view}:${start}:${end}`;
}

function dateNumber(date: string) {
  return Number(date.slice(8));
}

function subscribeToView(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(VIEW_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(VIEW_CHANGE_EVENT, callback);
  };
}

function getViewSnapshot(): CalendarView {
  return window.localStorage.getItem(VIEW_STORAGE_KEY) === "month" ? "month" : "week";
}

function getServerViewSnapshot(): CalendarView {
  return "week";
}

export function WeeklyCalendar({ events: initialEvents = [], tasks: initialTasks = [], timeZone }: { events?: CalendarEvent[]; tasks?: Task[]; timeZone?: string }) {
  const today = getLocalDateString(timeZone);
  const initialRange = getCalendarRange(today, "week");
  const cache = useRef(new Map<string, CalendarData>([[rangeKey("week", initialRange.start, initialRange.end), { events: initialEvents, tasks: initialTasks }]]));
  const requestId = useRef(0);
  const view = useSyncExternalStore(subscribeToView, getViewSnapshot, getServerViewSnapshot);
  const supabase = useMemo(() => createClient(), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [data, setData] = useState<CalendarData>({ events: initialEvents, tasks: initialTasks });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(() => supabase ? "" : "캘린더 연결 설정을 확인해주세요.");
  const [authVersion, setAuthVersion] = useState(0);

  const range = useMemo(() => getCalendarRange(selectedDate, view), [selectedDate, view]);
  const dates = useMemo(() => getDateRangeStrings(range), [range]);
  const currentMonth = selectedDate.slice(0, 7);

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        cache.current.clear();
        setData({ events: [], tasks: [] });
      }
      if (event === "SIGNED_IN") setAuthVersion((current) => current + 1);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    const key = rangeKey(view, range.start, range.end);
    const currentRequest = ++requestId.current;
    const cached = cache.current.get(key);
    if (cached) {
      setData(cached);
      setError("");
      setLoading(false);
      return;
    }

    if (!supabase) return;
    setLoading(true);
    setError("");
    setData({ events: [], tasks: [] });

    void (async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw authError ?? new Error("Not authenticated");
      const userId = authData.user.id;
      const [eventsResult, tasksResult] = await Promise.all([
        supabase.from("events").select("id,title,event_date,start_time,end_time,category,source_task_id").eq("user_id", userId).gte("event_date", range.start).lte("event_date", range.end).order("event_date").order("start_time"),
        supabase.from("tasks").select("id,title,description,status,priority,category,due_date,due_time,project_id").eq("user_id", userId).gte("due_date", range.start).lte("due_date", range.end).order("due_date").order("due_time", { nullsFirst: false }),
      ]);
      if (eventsResult.error) throw eventsResult.error;
      if (tasksResult.error) throw tasksResult.error;
      const nextData: CalendarData = {
        events: (eventsResult.data ?? []).map((row): CalendarEvent => ({ id: row.id, title: row.title, date: row.event_date, startTime: row.start_time ?? "", endTime: row.end_time ?? "", category: row.category, sourceTaskId: row.source_task_id ?? undefined })),
        tasks: (tasksResult.data ?? []).map((row): Task => ({ id: row.id, title: row.title, description: row.description, status: row.status as TaskStatus, priority: row.priority as Priority, category: row.category, dueDate: row.due_date, dueTime: row.due_time ?? undefined, projectId: row.project_id ?? undefined })),
      };
      if (currentRequest !== requestId.current) return;
      cache.current.set(key, nextData);
      setData(nextData);
    })().catch((queryError: unknown) => {
      if (currentRequest !== requestId.current) return;
      console.error("Failed to load calendar range", queryError);
      setError("이 기간의 일정과 할 일을 불러오지 못했습니다.");
    }).finally(() => {
      if (currentRequest === requestId.current) setLoading(false);
    });
  }, [authVersion, range.end, range.start, supabase, view]);

  const itemsByDate = useMemo(() => {
    const linkedTaskIds = new Set(data.events.map((event) => event.sourceTaskId).filter(Boolean));
    const result = new Map<string, { events: CalendarEvent[]; tasks: Task[] }>();
    for (const date of dates) result.set(date, { events: [], tasks: [] });
    for (const event of data.events) result.get(event.date)?.events.push(event);
    for (const task of data.tasks) {
      if (!linkedTaskIds.has(task.id)) result.get(task.dueDate)?.tasks.push(task);
    }
    return result;
  }, [data.events, data.tasks, dates]);

  const selectedItems = itemsByDate.get(selectedDate) ?? { events: [], tasks: [] };
  const setCalendarView = useCallback((nextView: CalendarView) => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, nextView);
    window.dispatchEvent(new Event(VIEW_CHANGE_EVENT));
  }, []);
  const move = useCallback((amount: number) => {
    setSelectedDate((current) => view === "week" ? addDaysToDateString(current, amount * 7) : shiftMonth(current, amount));
  }, [view]);

  const title = view === "week"
    ? `${Number(range.start.slice(5, 7))}월 ${dateNumber(range.start)}일 – ${Number(range.end.slice(5, 7))}월 ${dateNumber(range.end)}일`
    : new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${selectedDate}T12:00:00Z`));

  return <section className={`card card-pad weekly-card calendar-card calendar-${view}`} aria-busy={loading}>
    <div className="calendar-header">
      <div><h2 className="card-title">캘린더</h2><span className="card-meta">{title}</span></div>
      <div className="calendar-header-actions">
        <div className="calendar-segmented" role="group" aria-label="캘린더 보기">
          <button type="button" className={view === "week" ? "active" : ""} aria-pressed={view === "week"} onClick={() => setCalendarView("week")}>주간</button>
          <button type="button" className={view === "month" ? "active" : ""} aria-pressed={view === "month"} onClick={() => setCalendarView("month")}>월간</button>
        </div>
        <Link href="/planner" className="link-more">플래너 열기 →</Link>
      </div>
    </div>
    <div className="calendar-navigation">
      <button type="button" aria-label={view === "week" ? "이전 주" : "이전 달"} onClick={() => move(-1)}><Icon name="chevron-left" /></button>
      <button type="button" className="calendar-today" onClick={() => setSelectedDate(today)}>오늘</button>
      <button type="button" aria-label={view === "week" ? "다음 주" : "다음 달"} onClick={() => move(1)}><Icon name="chevron-right" /></button>
    </div>
    {error ? <p className="calendar-message" role="alert">{error}</p> : null}
    {view === "week" ? <div className="week-grid" role="group" aria-label={title}>
      {dates.map((date, index) => {
        const items = itemsByDate.get(date) ?? { events: [], tasks: [] };
        return <div key={date} className={`day-column${date === today ? " today" : ""}${date === selectedDate ? " selected" : ""}`}>
          <button type="button" className="day-head" aria-label={`${date} 선택`} aria-pressed={date === selectedDate} onClick={() => setSelectedDate(date)}><span>{weekLabels[index]}</span><b>{dateNumber(date)}</b></button>
          <div className="day-events">
            {items.events.map((event) => <article key={`event-${event.id}`} className={`event-block cat-${event.category}`}><strong>{event.title}</strong><span>{eventTime(event)}</span></article>)}
            {items.tasks.map((task) => <article key={`task-${task.id}`} className={`event-block calendar-task${task.status === "done" ? " done" : ""}`}><strong>{task.title}</strong><span>{task.status === "done" ? "완료" : task.dueTime?.slice(0, 5) || "할 일"}</span></article>)}
          </div>
        </div>;
      })}
    </div> : <div className="month-calendar" role="group" aria-label={title}>
      <div className="month-weekdays" aria-hidden="true">{monthLabels.map((label) => <span key={label}>{label}</span>)}</div>
      <div className="month-grid">
        {dates.map((date) => {
          const items = itemsByDate.get(date) ?? { events: [], tasks: [] };
          const count = items.events.length + items.tasks.length;
          const outside = date.slice(0, 7) !== currentMonth;
          return <button key={date} type="button" className={`month-day${outside ? " outside" : ""}${date === today ? " today" : ""}${date === selectedDate ? " selected" : ""}`} aria-label={`${date}${count ? `, 일정과 할 일 ${count}개` : ", 일정 없음"}`} aria-pressed={date === selectedDate} onClick={() => setSelectedDate(date)}>
            <span className="month-day-number">{dateNumber(date)}</span>
            <span className="month-day-items">
              {items.events.slice(0, 2).map((event) => <span key={`event-${event.id}`} className="month-item event">{event.title}</span>)}
              {items.tasks.slice(0, Math.max(0, 2 - items.events.length)).map((task) => <span key={`task-${task.id}`} className="month-item task">{task.status === "done" ? "✓ " : ""}{task.title}</span>)}
            </span>
            {count ? <span className="month-count" aria-hidden="true">{count}</span> : null}
          </button>;
        })}
      </div>
    </div>}
    <div className="calendar-detail" aria-live="polite">
      <div className="calendar-detail-head"><strong>{new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long", timeZone: "UTC" }).format(new Date(`${selectedDate}T12:00:00Z`))}</strong>{loading ? <span>불러오는 중…</span> : <span>{selectedItems.events.length + selectedItems.tasks.length}개</span>}</div>
      <div className="calendar-detail-list">
        {selectedItems.events.map((event) => <div key={`detail-event-${event.id}`}><i className="detail-marker event" /><span><b>{event.title}</b><small>{eventTime(event)} · {event.category}</small></span></div>)}
        {selectedItems.tasks.map((task) => <div key={`detail-task-${task.id}`}><i className="detail-marker task" /><span><b>{task.title}</b><small>{task.status === "done" ? "완료한 할 일" : `${task.dueTime?.slice(0, 5) || "시간 미정"} · 할 일`}</small></span></div>)}
        {!loading && selectedItems.events.length === 0 && selectedItems.tasks.length === 0 ? <p>이 날의 일정과 할 일이 비어 있어요.</p> : null}
      </div>
    </div>
  </section>;
}
