"use client";

import { useState, type FormEvent } from "react";
import { getLocalDateString } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import type { DailyGoal, Task } from "@/lib/types";
import { createUuid } from "@/lib/uuid";

type TodayGoalItem =
  | { source: "daily_goal"; id: string; title: string; completed: boolean }
  | { source: "task"; id: string; title: string; completed: boolean };

export function TodayGoals({ dailyGoals, urgentTasks, timeZone }: { dailyGoals: DailyGoal[]; urgentTasks: Task[]; timeZone: string }) {
  const [items, setItems] = useState<TodayGoalItem[]>(() => [
    ...dailyGoals.map((goal): TodayGoalItem => ({ source: "daily_goal", id: goal.id, title: goal.title, completed: goal.completed })),
    ...urgentTasks.map((task): TodayGoalItem => ({ source: "task", id: task.id, title: task.title, completed: task.status === "done" })),
  ]);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const done = items.filter((item) => item.completed).length;

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedTitle = title.trim();
    if (!normalizedTitle || saving) return;
    setSaving(true);
    setError("");
    const supabase = createClient();
    const { data: { user }, error: authError } = supabase ? await supabase.auth.getUser() : { data: { user: null }, error: new Error("Supabase is not configured") };
    if (!supabase || authError || !user) { setError("로그인 정보를 확인하지 못했습니다."); setSaving(false); return; }
    const item: TodayGoalItem = { source: "daily_goal", id: createUuid(), title: normalizedTitle, completed: false };
    const { error: insertError } = await supabase.from("daily_goals").insert({ id: item.id, user_id: user.id, title: item.title, goal_date: getLocalDateString(timeZone), completed: false });
    if (insertError) { console.error("Failed to add daily goal", insertError); setError("오늘의 목표를 추가하지 못했습니다."); setSaving(false); return; }
    setItems((current) => [item, ...current]);
    setTitle("");
    setSaving(false);
  };

  const toggle = async (item: TodayGoalItem) => {
    const completed = !item.completed;
    setItems((current) => current.map((value) => value.source === item.source && value.id === item.id ? { ...value, completed } : value));
    const supabase = createClient();
    const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    const result = supabase && user
      ? item.source === "daily_goal"
        ? await supabase.from("daily_goals").update({ completed }).eq("id", item.id).eq("user_id", user.id)
        : await supabase.from("tasks").update({ status: completed ? "done" : "todo" }).eq("id", item.id).eq("user_id", user.id)
      : { error: new Error("Not authenticated") };
    if (result.error) {
      console.error("Failed to update today's goal", result.error);
      setItems((current) => current.map((value) => value.source === item.source && value.id === item.id ? item : value));
      setError("완료 상태를 저장하지 못했습니다.");
    }
  };

  const remove = async (item: Extract<TodayGoalItem, { source: "daily_goal" }>) => {
    const previousItems = items;
    setItems((current) => current.filter((value) => value.source !== item.source || value.id !== item.id));
    const supabase = createClient();
    const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    const result = supabase && user
      ? await supabase.from("daily_goals").delete().eq("id", item.id).eq("user_id", user.id)
      : { error: new Error("Not authenticated") };
    if (result.error) { console.error("Failed to delete daily goal", result.error); setItems(previousItems); setError("오늘의 목표를 삭제하지 못했습니다."); }
  };

  return <section className="card card-pad today-goals"><div className="card-header"><h2 className="card-title">오늘의 목표</h2><span className="count-badge">{done} / {items.length}</span></div><div className="check-list">{items.map((item) => <div className="goal-item" key={`${item.source}-${item.id}`}><label className={item.completed ? "checked" : ""}><input type="checkbox" checked={item.completed} onChange={() => toggle(item)} /><span className="custom-check">{item.completed ? "✓" : ""}</span><span>{item.title}</span></label>{item.source === "daily_goal" ? <button type="button" className="goal-remove" onClick={() => remove(item)} aria-label={`${item.title} 삭제`}>×</button> : null}</div>)}</div><form className="daily-goal-form" onSubmit={add}><input className="input" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="오늘 할 일 입력..." aria-label="오늘의 목표" maxLength={100} /><button type="submit" className="button primary" disabled={saving || !title.trim()} aria-label="오늘의 목표 추가">＋</button></form>{error ? <p className="field-error" role="alert">{error}</p> : null}</section>;
}
