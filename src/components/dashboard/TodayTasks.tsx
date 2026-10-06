"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Toast } from "@/components/common/Toast";
import { createClient } from "@/lib/supabase/client";
import type { Task } from "@/lib/types";

const filters = ["전체", "몰입", "과제", "시험", "일정", "개인", "프로젝트"];
const priorityLabel = { high: "높음", medium: "보통", low: "낮음" };

export function TodayTasks({ initial = [] }: { initial?: Task[] }) {
  const [tasks, setTasks] = useState(initial);
  const [filter, setFilter] = useState("전체");
  const [error, setError] = useState("");
  const visible = useMemo(() => filter === "전체" ? tasks : tasks.filter((task) => task.category === filter), [filter, tasks]);

  const toggle = async (task: Task) => {
    const status = task.status === "done" ? "todo" : "done";
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status } : item));
    const supabase = createClient();
    const { data: { user } } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    const result = supabase && user
      ? await supabase.from("tasks").update({ status }).eq("id", task.id).eq("user_id", user.id)
      : { error: new Error("Not authenticated") };
    if (result.error) {
      console.error("Failed to update dashboard task", result.error);
      setTasks((current) => current.map((item) => item.id === task.id ? task : item));
      setError("완료 상태를 저장하지 못했습니다.");
    }
  };

  return <section className="card card-pad tasks-card"><div className="card-header"><div><h2 className="card-title">오늘 할 일</h2><span className="card-meta">남은 일 {tasks.filter((task) => task.status !== "done").length}개</span></div><Link href="/tasks" className="link-more">전체 보기 →</Link></div><div className="filter-tabs" role="tablist" aria-label="할 일 카테고리">{filters.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="task-list">{visible.map((task) => <div key={task.id} className={`task-row ${task.status === "done" ? "done" : ""}`}><button className="task-check" aria-label={`${task.title} 완료 처리`} onClick={() => toggle(task)}>{task.status === "done" ? "✓" : ""}</button><div className="task-main"><strong>{task.title}</strong><span>{task.category} · {task.dueTime}</span></div><span className={`priority ${task.priority}`}>{priorityLabel[task.priority]}</span></div>)}</div>{error && <Toast message={error} onDone={() => setError("")} />}</section>;
}
