"use client";

import { useState } from "react";
import type { Task } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

export function TodayGoals({ tasks }: { tasks?: Task[] }) {
  const [items, setItems] = useState(() => (tasks ?? []).slice(0, 5).map((task) => ({ id: task.id, title: task.title, done: task.status === "done" })));
  const done = items.filter((item) => item.done).length;
  const toggle = async (id: string, next: boolean) => {
    setItems((current) => current.map((value) => value.id === id ? { ...value, done: next } : value));
    const supabase = createClient();
    const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    const result = supabase && user ? await supabase.from("tasks").update({ status: next ? "done" : "todo" }).eq("id", id).eq("user_id", user.id) : { error: new Error("Not authenticated") };
    if (result.error) { console.error("Failed to update dashboard goal task", result.error); setItems((current) => current.map((value) => value.id === id ? { ...value, done: !next } : value)); }
  };
  return <section className="card card-pad today-goals"><div className="card-header"><h2 className="card-title">오늘의 목표</h2><span className="count-badge">{done} / {items.length}</span></div><div className="check-list">{items.map((item) => <label key={item.id} className={item.done ? "checked" : ""}><input type="checkbox" checked={item.done} onChange={() => toggle(item.id, !item.done)} /><span className="custom-check">{item.done ? "✓" : ""}</span><span>{item.title}</span></label>)}</div></section>;
}
