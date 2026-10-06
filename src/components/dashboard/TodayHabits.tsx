"use client";

import { useState } from "react";
import { getLocalDateString } from "@/lib/date";
import type { Habit } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

export function TodayHabits({ initial = [], timeZone }: { initial?: Habit[]; timeZone?: string }) {
  const [habits, setHabits] = useState(initial);
  const done = habits.filter((item) => item.completedToday).length;
  const toggle = async (habit: Habit) => {
    const completed = !habit.completedToday;
    setHabits((current) => current.map((item) => item.id === habit.id ? { ...item, completedToday: completed } : item));
    const supabase = createClient();
    if (!supabase) { setHabits((current) => current.map((item) => item.id === habit.id ? habit : item)); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const result = user ? await supabase.from("habit_records").upsert({ user_id: user.id, habit_id: habit.id, date: getLocalDateString(timeZone), completed }, { onConflict: "habit_id,date" }) : { error: new Error("Not authenticated") };
    if (result.error) { console.error("Failed to update habit record", result.error); setHabits((current) => current.map((item) => item.id === habit.id ? habit : item)); }
  };
  return <section className="card card-pad today-habits"><div className="card-header"><h2 className="card-title">오늘의 습관</h2><span className="count-badge">{done} / {habits.length}</span></div><div className="habit-grid">{habits.map((habit) => <button key={habit.id} className={habit.completedToday ? "habit done" : "habit"} onClick={() => toggle(habit)} aria-pressed={habit.completedToday}><span>{habit.icon}</span><small>{habit.title}</small><i>{habit.completedToday ? "완료" : "대기"}</i></button>)}</div></section>;
}
