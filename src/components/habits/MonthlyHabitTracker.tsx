"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/common/Icon";
import { getCalendarRange, getDateRangeStrings, getMonthRange, shiftMonth } from "@/lib/calendar";
import { DEFAULT_TIME_ZONE, getDateStringInTimeZone, getLocalDateString } from "@/lib/date";
import { calculateAllHabitStatistics, calculateHabitStatistics, type HabitCompletion, type TrackedHabit } from "@/lib/habits";
import { createClient } from "@/lib/supabase/client";

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

function statValue(value: number | null, suffix = "") {
  return value === null ? "—" : `${value}${suffix}`;
}

export function MonthlyHabitTracker() {
  const [timeZone, setTimeZone] = useState(DEFAULT_TIME_ZONE);
  const today = getLocalDateString(timeZone);
  const [monthDate, setMonthDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedHabitId, setSelectedHabitId] = useState("all");
  const [habits, setHabits] = useState<TrackedHabit[]>([]);
  const [records, setRecords] = useState<HabitCompletion[]>([]);
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(() => Boolean(supabase));
  const [error, setError] = useState(() => supabase ? "" : "습관 기록 연결 설정을 확인해주세요.");
  const [refreshKey, setRefreshKey] = useState(0);
  const requestId = useRef(0);

  const monthRange = useMemo(() => getMonthRange(monthDate), [monthDate]);
  const calendarRange = useMemo(() => getCalendarRange(monthDate, "month"), [monthDate]);
  const dates = useMemo(() => getDateRangeStrings(calendarRange), [calendarRange]);
  const selectedHabit = habits.find((habit) => habit.id === selectedHabitId) ?? null;

  useEffect(() => {
    const refresh = () => setRefreshKey((current) => current + 1);
    window.addEventListener("focus-hub:data-changed", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("focus-hub:data-changed", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setHabits([]);
        setRecords([]);
      }
      if (event === "SIGNED_IN") setRefreshKey((current) => current + 1);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    const currentRequest = ++requestId.current;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- A new external data range request starts when the month or refresh signal changes.
    setLoading(true);
    setError("");
    void (async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw authError ?? new Error("Not authenticated");
      const userId = authData.user.id;
      const [settingsResult, habitsResult, recordsResult] = await Promise.all([
        supabase.from("settings").select("timezone").eq("user_id", userId).maybeSingle(),
        supabase.from("habits").select("id,title,icon,frequency,target_count,active,created_at").eq("user_id", userId).eq("active", true).order("created_at"),
        supabase.from("habit_records").select("habit_id,date,completed").eq("user_id", userId).gte("date", monthRange.start).lte("date", monthRange.end),
      ]);
      if (settingsResult.error) throw settingsResult.error;
      if (habitsResult.error) throw habitsResult.error;
      if (recordsResult.error) throw recordsResult.error;
      if (currentRequest !== requestId.current) return;
      const resolvedTimeZone = settingsResult.data?.timezone || DEFAULT_TIME_ZONE;
      const resolvedToday = getLocalDateString(resolvedTimeZone);
      setTimeZone(resolvedTimeZone);
      setMonthDate((current) => current === today ? resolvedToday : current);
      setSelectedDate((current) => current === today ? resolvedToday : current);
      const nextHabits = (habitsResult.data ?? []).map((row): TrackedHabit => ({ id: row.id, title: row.title, icon: row.icon ?? "✓", frequency: row.frequency === "weekly" ? "weekly" : "daily", targetCount: row.target_count, active: row.active, createdDate: getDateStringInTimeZone(new Date(row.created_at), resolvedTimeZone) }));
      setHabits(nextHabits);
      setRecords((recordsResult.data ?? []).map((row): HabitCompletion => ({ habitId: row.habit_id, date: row.date, completed: row.completed })));
      setSelectedHabitId((current) => current === "all" || nextHabits.some((habit) => habit.id === current) ? current : "all");
    })().catch((queryError: unknown) => {
      if (currentRequest !== requestId.current) return;
      console.error("Failed to load monthly habit tracker", queryError);
      setHabits([]);
      setRecords([]);
      setError("이 달의 습관 기록을 불러오지 못했습니다.");
    }).finally(() => {
      if (currentRequest === requestId.current) setLoading(false);
    });
  }, [monthRange.end, monthRange.start, refreshKey, supabase, today]);

  const activeRecords = useMemo(() => {
    const activeHabitIds = new Set(habits.map((habit) => habit.id));
    return records.filter((record) => activeHabitIds.has(record.habitId));
  }, [habits, records]);

  const completedByDate = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const record of activeRecords) {
      if (!record.completed) continue;
      const ids = map.get(record.date) ?? new Set<string>();
      ids.add(record.habitId);
      map.set(record.date, ids);
    }
    return map;
  }, [activeRecords]);

  const statistics = useMemo(() => selectedHabit
    ? calculateHabitStatistics(selectedHabit, activeRecords, monthDate, today)
    : calculateAllHabitStatistics(habits, activeRecords, monthDate, today), [activeRecords, habits, monthDate, selectedHabit, today]);

  const moveMonth = useCallback((amount: number) => {
    setMonthDate((current) => {
      const next = shiftMonth(current, amount);
      const range = getMonthRange(next);
      const nextSelected = range.start <= today && today <= range.end ? today : range.start;
      setSelectedDate(nextSelected);
      return next;
    });
  }, [today]);

  const selectToday = useCallback(() => {
    setMonthDate(today);
    setSelectedDate(today);
  }, [today]);

  const monthLabel = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${monthDate}T12:00:00Z`));
  const selectedDateLabel = new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long", timeZone: "UTC" }).format(new Date(`${selectedDate}T12:00:00Z`));
  const selectedCompletions = completedByDate.get(selectedDate) ?? new Set<string>();

  return <section className="card habit-tracker" aria-busy={loading}>
    <div className="habit-tracker-header">
      <div><span className="eyebrow">MONTHLY RECORD</span><h2>월간 습관 트래커</h2><p>한 달의 반복과 달성 흐름을 살펴보세요.</p></div>
      <label className="habit-select"><span>습관 선택</span><select value={selectedHabitId} onChange={(event) => setSelectedHabitId(event.target.value)} aria-label="통계를 확인할 습관"><option value="all">전체 습관</option>{habits.map((habit) => <option key={habit.id} value={habit.id}>{habit.icon} {habit.title}</option>)}</select></label>
    </div>
    <div className="habit-stat-grid" role="group" aria-label={`${monthLabel} 습관 통계`}>
      <div><span>완료 일수</span><strong>{statistics.completedDays}<small>일</small></strong></div>
      <div><span>달성률</span><strong>{statValue(statistics.achievementRate, "%")}</strong></div>
      <div><span>현재 연속</span><strong>{statValue(statistics.currentStreak, "일")}</strong></div>
      <div><span>최장 연속</span><strong>{statValue(statistics.longestStreak, "일")}</strong></div>
    </div>
    <div className="habit-tracker-body">
      <div className="habit-month-panel">
        <div className="habit-month-nav"><button type="button" aria-label="이전 달" onClick={() => moveMonth(-1)}><Icon name="chevron-left" /></button><div><strong>{monthLabel}</strong><button type="button" onClick={selectToday}>오늘</button></div><button type="button" aria-label="다음 달" onClick={() => moveMonth(1)}><Icon name="chevron-right" /></button></div>
        {error ? <p className="habit-tracker-message" role="alert">{error}</p> : null}
        <div className="habit-weekdays" aria-hidden="true">{weekdayLabels.map((label) => <span key={label}>{label}</span>)}</div>
        <div className="habit-month-grid" role="group" aria-label={`${monthLabel} 습관 완료 달력`}>
          {dates.map((date) => {
            const outside = date < monthRange.start || date > monthRange.end;
            const future = date > today;
            const completedIds = completedByDate.get(date) ?? new Set<string>();
            const completionCount = selectedHabit ? Number(completedIds.has(selectedHabit.id)) : completedIds.size;
            const beforeCreation = selectedHabit ? date < selectedHabit.createdDate : false;
            const nonTarget = selectedHabit?.frequency === "weekly" && completionCount === 0;
            const intensity = selectedHabit ? (completionCount ? 3 : 0) : Math.min(3, completionCount);
            const className = [`habit-day`, outside ? "outside" : "", future ? "future" : "", beforeCreation || nonTarget ? "neutral" : "", date === today ? "today" : "", date === selectedDate ? "selected" : "", intensity ? `level-${intensity}` : ""].filter(Boolean).join(" ");
            const stateText = selectedHabit ? (completionCount ? "완료" : beforeCreation ? "생성 전" : nonTarget ? "대상 요일 미설정" : "미완료") : `${completionCount}개 완료`;
            return <button key={date} type="button" className={className} disabled={outside} aria-label={`${date}, ${stateText}`} aria-pressed={date === selectedDate} onClick={() => setSelectedDate(date)}><span>{Number(date.slice(8))}</span>{!outside && completionCount > 0 ? <b aria-hidden="true">{selectedHabit ? "✓" : completionCount}</b> : null}</button>;
          })}
        </div>
        <div className="habit-legend" role="group" aria-label="완료 강도 범례"><span><i className="level-0" />0</span><span><i className="level-1" />1</span><span><i className="level-2" />2</span><span><i className="level-3" />3+</span></div>
        {selectedHabit?.frequency === "weekly" ? <p className="habit-method-note">주간 습관은 요일 설정이 없어 주별 목표 {selectedHabit.targetCount}회로 달성률을 계산하며, 요일 기반 연속 기록은 표시하지 않습니다.</p> : selectedHabitId === "all" ? <p className="habit-method-note">전체 달성률은 각 습관의 목표 기회를 합산합니다. 연속 기록은 개별 일간 습관을 선택하면 확인할 수 있습니다.</p> : <p className="habit-method-note">통계 기간: {monthLabel} · 오늘 이후와 습관 생성 이전 날짜는 달성률에서 제외됩니다.</p>}
      </div>
      <aside className="habit-day-detail" aria-live="polite"><div className="habit-day-detail-head"><div><span>선택한 날짜</span><h3>{selectedDateLabel}</h3></div><span>{selectedCompletions.size} / {habits.length}</span></div><div className="habit-record-list">{habits.map((habit) => { const done = selectedCompletions.has(habit.id); return <div key={habit.id} className={done ? "done" : ""}><span className="habit-record-check" aria-hidden="true">{done ? "✓" : ""}</span><span className="habit-record-icon">{habit.icon}</span><strong title={habit.title}>{habit.title}</strong><small>{done ? "완료" : selectedDate > today ? "예정" : "미완료"}</small></div>; })}{!loading && habits.length === 0 ? <p className="habit-empty">활성 습관을 추가하면 이곳에 월간 기록이 표시됩니다.</p> : null}</div></aside>
    </div>
  </section>;
}
