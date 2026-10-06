"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Modal } from "@/components/common/Modal";
import { Toast } from "@/components/common/Toast";
import { emptyStringToNull, getLocalDateString } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import { TASK_CATEGORIES } from "@/lib/taskCategories";
import type { Task } from "@/lib/types";
import { createUuid } from "@/lib/uuid";

const schema = z.object({
  title: z.string().min(1, "제목을 입력해주세요.").max(100),
  description: z.string(),
  status: z.enum(["todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high"]),
  category: z.string().min(1),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "마감일을 선택해주세요."),
  dueTime: z.string(),
});

type Values = z.infer<typeof schema>;

const createDefaults = (): Values => ({
  title: "",
  description: "",
  status: "todo",
  priority: "medium",
  category: "개인",
  dueDate: getLocalDateString(),
  dueTime: "",
});

const statusLabel = { todo: "할 일", in_progress: "진행 중", done: "완료" };
const priorityLabel = { low: "낮음", medium: "보통", high: "높음" };
export function TaskManager({ initialOpen = false }: { initialOpen?: boolean }) {
  const [items, setItems] = useState<Task[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("due");
  const [editing, setEditing] = useState<Task | null>(null);
  const [open, setOpen] = useState(initialOpen);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: createDefaults(),
  });

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { console.error("Supabase is not configured"); return; }
    supabase.auth.getUser().then(async ({ data: { user }, error: authError }) => {
      if (authError || !user) { setError("로그인 정보를 확인하지 못했습니다."); return; }
      const { data, error: queryError } = await supabase.from("tasks").select("*").eq("user_id", user.id).order("due_date");
      if (queryError) { console.error("Failed to load tasks", queryError); setError("할 일을 불러오지 못했습니다."); return; }
      setItems((data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        priority: row.priority,
        category: row.category,
        dueDate: row.due_date ?? "",
        dueTime: row.due_time ?? undefined,
        projectId: row.project_id ?? undefined,
      })) as Task[]);
      setError("");
    });
  }, []);

  const visible = useMemo(
    () => items
      .filter((task) => (status === "all" || task.status === status) && task.title.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => sort === "priority"
        ? ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority])
        : `${a.dueDate}${a.dueTime}`.localeCompare(`${b.dueDate}${b.dueTime}`)),
    [items, query, sort, status],
  );

  const close = useCallback(() => {
    setOpen(false);
    setEditing(null);
    reset(createDefaults());
  }, [reset]);

  const startEdit = (task: Task) => {
    setEditing(task);
    reset({
      title: task.title,
      description: task.description ?? "",
      status: task.status,
      priority: task.priority,
      category: task.category,
      dueDate: task.dueDate,
      dueTime: task.dueTime ?? "",
    });
    setOpen(true);
  };

  const save = async (values: Values) => {
    const task: Task = { ...(editing ?? { id: createUuid() }), ...values, dueTime: values.dueTime || undefined };
    const previousItems = items;
    setItems((current) => editing
      ? current.map((item) => item.id === editing.id ? task : item)
      : [task, ...current]);
    const supabase = createClient();
    if (!supabase) { setItems(previousItems); setError("데이터베이스 연결 설정을 확인해주세요."); return; }
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setItems(previousItems); setError("로그인 정보를 확인하지 못했습니다."); return; }
    const editable = {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      category: task.category,
      due_date: task.dueDate,
      due_time: emptyStringToNull(task.dueTime),
    };
    const result = editing
      ? await supabase.from("tasks").update(editable).eq("id", task.id).eq("user_id", user.id)
      : await supabase.from("tasks").insert({ id: task.id, user_id: user.id, ...editable });
    if (result.error) {
      console.error("Failed to save task", result.error);
      setItems(previousItems);
      setError("할 일을 저장하지 못했습니다.");
      return;
    }
    const { error: eventError } = await supabase.from("events").upsert({
      user_id: user.id,
      source_task_id: task.id,
      title: task.title,
      description: task.description ?? "",
      event_date: task.dueDate,
      start_time: emptyStringToNull(task.dueTime),
      end_time: null,
      category: task.category,
    }, { onConflict: "source_task_id" });
    if (eventError) {
      console.error("Failed to sync task event", eventError);
      setEditing(task);
      setError("할 일은 저장됐지만 플래너 일정 동기화에 실패했습니다. 저장을 다시 눌러 재시도해주세요.");
      setToast("할 일은 저장됐지만 플래너 일정 동기화에 실패했습니다.");
      return;
    }
    setError("");
    setToast(editing ? "할 일을 수정했습니다." : "새 할 일을 추가했습니다.");
    close();
  };

  const remove = async (task: Task) => {
    if (!window.confirm(`“${task.title}”을 삭제할까요?`)) return;
    const previousItems = items;
    setItems((current) => current.filter((item) => item.id !== task.id));
    const supabase = createClient();
    if (!supabase) { setItems(previousItems); setError("데이터베이스 연결 설정을 확인해주세요."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const result = user
      ? await supabase.from("tasks").delete().eq("id", task.id).eq("user_id", user.id)
      : { error: new Error("Not authenticated") };
    if (result.error) {
      console.error("Failed to delete task", result.error);
      setItems(previousItems);
      setError("할 일을 삭제하지 못했습니다.");
      return;
    }
    setError("");
    setToast("할 일을 삭제했습니다.");
  };

  const toggle = async (task: Task) => {
    const next = task.status === "done" ? "todo" : "done";
    setItems((current) => current.map((item) => item.id === task.id ? { ...item, status: next } : item));
    const supabase = createClient();
    if (!supabase) {
      setItems((current) => current.map((item) => item.id === task.id ? task : item));
      setError("데이터베이스 연결 설정을 확인해주세요.");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const result = user
      ? await supabase.from("tasks").update({ status: next }).eq("id", task.id).eq("user_id", user.id)
      : { error: new Error("Not authenticated") };
    if (result.error) {
      console.error("Failed to update task status", result.error);
      setItems((current) => current.map((item) => item.id === task.id ? task : item));
      setError("완료 상태를 저장하지 못했습니다.");
      return;
    }
    setError("");
  };

  return <>
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="toolbar">
      <div className="search-wrap"><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="할 일 검색" aria-label="할 일 검색" /></div>
      <select className="input select-compact" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="상태 필터"><option value="all">모든 상태</option><option value="todo">할 일</option><option value="in_progress">진행 중</option><option value="done">완료</option></select>
      <select className="input select-compact" value={sort} onChange={(event) => setSort(event.target.value)} aria-label="정렬"><option value="due">마감순</option><option value="priority">우선순위순</option></select>
    </div>
    <section className="card content-card"><div className="data-list">
      {visible.map((task) => <article className="data-row" key={task.id}><button className="task-check" onClick={() => toggle(task)} aria-label="완료 상태 변경">{task.status === "done" ? "✓" : ""}</button><div className="data-main"><strong style={task.status === "done" ? { textDecoration: "line-through", color: "var(--muted)" } : undefined}>{task.title}</strong><p>{task.category} · {task.dueDate} {task.dueTime} · 우선순위 {priorityLabel[task.priority]}</p></div><span className="status-pill">{statusLabel[task.status]}</span><div className="row-actions"><button className="row-action" onClick={() => startEdit(task)} aria-label="수정">✎</button><button className="row-action danger" onClick={() => remove(task)} aria-label="삭제">×</button></div></article>)}
      {visible.length === 0 && <div className="empty-state"><div><span>☾</span>조건에 맞는 할 일이 없어요.</div></div>}
    </div></section>
    <Modal open={open} title={editing ? "할 일 수정" : "새 할 일"} onClose={close}>
      <form className="form-grid" onSubmit={handleSubmit(save)}>
        <div className="field"><label htmlFor="title">제목</label><input id="title" className="input" {...register("title")} />{errors.title && <small className="field-error">{errors.title.message}</small>}</div>
        <div className="field"><label htmlFor="description">설명</label><textarea id="description" className="input" {...register("description")} /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><div className="field"><label htmlFor="status">상태</label><select id="status" className="input" {...register("status")}><option value="todo">할 일</option><option value="in_progress">진행 중</option><option value="done">완료</option></select></div><div className="field"><label htmlFor="priority">우선순위</label><select id="priority" className="input" {...register("priority")}><option value="low">낮음</option><option value="medium">보통</option><option value="high">높음</option></select></div></div>
        <div className="field"><label htmlFor="category">카테고리</label><select id="category" className="input" {...register("category")}>{editing?.category && !TASK_CATEGORIES.includes(editing.category as (typeof TASK_CATEGORIES)[number]) && <option value={editing.category}>{editing.category} (기존 값)</option>}{TASK_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><div className="field"><label htmlFor="dueDate">마감일</label><input id="dueDate" type="date" className="input" required aria-invalid={Boolean(errors.dueDate)} {...register("dueDate")} />{errors.dueDate && <small className="field-error">{errors.dueDate.message}</small>}</div><div className="field"><label htmlFor="dueTime">마감 시간</label><input id="dueTime" type="time" className="input" {...register("dueTime")} /></div></div>
        <div className="form-actions"><button type="button" className="button" onClick={close}>취소</button><button className="button primary" disabled={isSubmitting}>저장</button></div>
      </form>
    </Modal>
    {toast && <Toast message={toast} onDone={() => setToast("")} />}
  </>;
}
