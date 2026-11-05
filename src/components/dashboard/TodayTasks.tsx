"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Toast } from "@/components/common/Toast";
import { createClient } from "@/lib/supabase/client";
import { TASK_CATEGORIES } from "@/lib/taskCategories";
import type { Task } from "@/lib/types";

const filters = ["전체", ...TASK_CATEGORIES];
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

  return <section className="card card-pad tasks-card"><div className="card-header"><div><h2 className="card-title">할 일</h2><span className="card-meta">미완료 {tasks.filter((task) => task.status !== "done").length}개</span></div><Link href="/tasks" className="link-more">전체 보기 →</Link></div><div className="filter-tabs" role="tablist" aria-label="할 일 카테고리">{filters.map((item) => <button key={item} type="button" className={filter === item ? "active" : ""} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="task-list">{[...visible].sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority])).map((task) => <div key={task.id} className={`task-row ${task.status === "done" ? "done" : ""}`}><button type="button" className="task-check" aria-pressed={task.status === "done"} aria-label={`${task.title} 완료 처리`} onClick={() => toggle(task)}>{task.status === "done" ? "✓" : ""}</button><div className="task-main"><strong>{task.title}</strong><span>{task.category} · {task.dueDate}{task.dueTime ? ` ${task.dueTime}` : ""}</span></div><span className={`priority ${task.priority}`}>{priorityLabel[task.priority]}</span></div>)}</div>{visible.length === 0 && <div className="empty-state"><div>지금 처리할 할 일이 없어요.<br /><Link className="link-more" href="/tasks">할 일 관리로 이동 →</Link></div></div>}{error && <Toast message={error} onDone={() => setError("")} />}</section>;
}
