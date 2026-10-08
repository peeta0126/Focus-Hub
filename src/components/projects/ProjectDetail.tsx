"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/common/Icon";
import { Modal } from "@/components/common/Modal";
import { Toast } from "@/components/common/Toast";
import { addDaysToDateString, emptyStringToNull, getLocalDateString } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import { TASK_CATEGORIES } from "@/lib/taskCategories";
import type { Priority, ProjectStatus, TaskStatus } from "@/lib/types";
import { createUuid } from "@/lib/uuid";

export type ProjectDetailRow = {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  github_url: string | null;
  deploy_url: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectTaskRow = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  category: string;
  due_date: string;
  due_time: string | null;
  project_id: string;
  created_at: string;
};

const projectStatusLabel: Record<ProjectStatus, string> = {
  planning: "기획 중",
  active: "진행 중",
  paused: "보류",
  completed: "완료",
};
const priorityLabel: Record<Priority, string> = { low: "낮음", medium: "보통", high: "높음" };
const taskStatusLabel: Record<TaskStatus, string> = { todo: "할 일", in_progress: "진행 중", done: "완료" };

function formatDate(value: string | null) {
  if (!value) return "미정";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Seoul" }).format(new Date(`${value.slice(0, 10)}T12:00:00+09:00`));
}

function dueLabel(date: string, time: string | null) {
  const today = getLocalDateString();
  const day = date === today ? "오늘" : date === addDaysToDateString(today, 1) ? "내일" : formatDate(date);
  return `${day}${time ? ` · ${time.slice(0, 5)}` : ""}`;
}

export function ProjectDetail({ initialProject, initialTasks, userId }: { initialProject: ProjectDetailRow; initialTasks: ProjectTaskRow[]; userId: string }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [editing, setEditing] = useState<ProjectTaskRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const summary = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((task) => task.status === "done").length;
    return { total, completed, progress: total === 0 ? 0 : Math.round((completed / total) * 100) };
  }, [tasks]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (task: ProjectTaskRow) => {
    setEditing(task);
    setModalOpen(true);
  };

  const saveTask = async (formData: FormData) => {
    const title = String(formData.get("title") ?? "").trim();
    const dueDate = String(formData.get("due_date") ?? "");
    if (!title || !dueDate) {
      setError("할 일 제목과 마감일을 입력해주세요.");
      return;
    }

    setSaving(true);
    const editable = {
      title,
      description: String(formData.get("description") ?? "").trim(),
      status: String(formData.get("status") ?? "todo") as TaskStatus,
      priority: String(formData.get("priority") ?? "medium") as Priority,
      category: String(formData.get("category") ?? "프로젝트"),
      due_date: dueDate,
      due_time: emptyStringToNull(String(formData.get("due_time") ?? "")),
      project_id: initialProject.id,
    };
    const next: ProjectTaskRow = editing
      ? { ...editing, ...editable }
      : { id: createUuid(), created_at: new Date().toISOString(), ...editable };
    const previous = tasks;
    setTasks((current) => editing ? current.map((task) => task.id === editing.id ? next : task) : [next, ...current]);

    const supabase = createClient();
    if (!supabase) {
      setTasks(previous);
      setSaving(false);
      setError("데이터베이스 연결 설정을 확인해주세요.");
      return;
    }
    const taskResult = editing
      ? await supabase.from("tasks").update(editable).eq("id", next.id).eq("user_id", userId)
      : await supabase.from("tasks").insert({ id: next.id, user_id: userId, ...editable });
    if (taskResult.error) {
      console.error("Failed to save project task", taskResult.error);
      setTasks(previous);
      setSaving(false);
      setError("할 일을 저장하지 못했습니다.");
      return;
    }

    const { error: eventError } = await supabase.from("events").upsert({
      user_id: userId,
      source_task_id: next.id,
      title: next.title,
      description: next.description,
      event_date: next.due_date,
      start_time: next.due_time,
      end_time: null,
      category: next.category,
    }, { onConflict: "source_task_id" });

    setSaving(false);
    if (eventError) {
      console.error("Failed to sync project task event", eventError);
      setError("할 일은 저장됐지만 플래너 일정 동기화에 실패했습니다.");
      setToast("할 일은 저장되었습니다.");
      return;
    }
    setError("");
    setModalOpen(false);
    setEditing(null);
    setToast(editing ? "할 일을 수정했습니다." : "프로젝트에 할 일을 추가했습니다.");
  };

  const toggleTask = async (task: ProjectTaskRow) => {
    const nextStatus: TaskStatus = task.status === "done" ? "todo" : "done";
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: nextStatus } : item));
    const supabase = createClient();
    const result = supabase
      ? await supabase.from("tasks").update({ status: nextStatus }).eq("id", task.id).eq("user_id", userId)
      : { error: new Error("Supabase is not configured") };
    if (result.error) {
      console.error("Failed to update project task", result.error);
      setTasks((current) => current.map((item) => item.id === task.id ? task : item));
      setError("완료 상태를 저장하지 못했습니다.");
      return;
    }
    setError("");
  };

  const removeTask = async (task: ProjectTaskRow) => {
    if (!window.confirm(`“${task.title}” 할 일을 삭제할까요?\n전체 할 일 화면에서도 삭제됩니다.`)) return;
    const previous = tasks;
    setTasks((current) => current.filter((item) => item.id !== task.id));
    const supabase = createClient();
    const result = supabase
      ? await supabase.from("tasks").delete().eq("id", task.id).eq("user_id", userId)
      : { error: new Error("Supabase is not configured") };
    if (result.error) {
      console.error("Failed to delete project task", result.error);
      setTasks(previous);
      setError("할 일을 삭제하지 못했습니다.");
      return;
    }
    setError("");
    setToast("할 일을 삭제했습니다.");
  };

  return <main className="page-wrap project-detail-page">
    <Link href="/projects" className="project-back-link">← 프로젝트 목록</Link>
    <header className="project-detail-heading">
      <div><div className="project-title-line"><h1>{initialProject.title}</h1><span className={`project-status status-${initialProject.status}`}>{projectStatusLabel[initialProject.status]}</span></div><p>{initialProject.description || "프로젝트 설명이 없습니다."}</p></div>
    </header>

    <section className="project-summary" aria-label="프로젝트 요약">
      <article className="project-summary-progress"><div><span>진행률</span><strong>{summary.progress}%</strong></div><div className="project-progress-track"><span style={{ width: `${summary.progress}%` }} /></div><small>연결된 할 일의 완료율을 기준으로 자동 계산됩니다.</small></article>
      <article><span>완료한 할 일</span><strong>{summary.completed} <small>/ {summary.total}</small></strong></article>
      <article><span>시작일</span><strong>{formatDate(initialProject.start_date)}</strong></article>
      <article><span>최근 작업</span><strong>{formatDate(initialProject.updated_at)}</strong></article>
    </section>

    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="project-detail-layout">
      <div className="project-detail-main">
        <section className="card project-detail-card project-overview-card">
          <div className="project-section-head"><div><span className="project-section-kicker">OVERVIEW</span><h2>프로젝트 개요</h2></div></div>
          <p>{initialProject.description || "프로젝트 설명을 추가해 작업의 목표와 범위를 정리해보세요."}</p>
          <dl><div><dt>상태</dt><dd>{projectStatusLabel[initialProject.status]}</dd></div><div><dt>시작일</dt><dd>{formatDate(initialProject.start_date)}</dd></div><div><dt>마감일</dt><dd>{formatDate(initialProject.due_date)}</dd></div></dl>
        </section>

        <section className="card project-detail-card project-tasks-card">
          <div className="project-section-head"><div><span className="project-section-kicker">TASKS</span><h2>연결된 할 일</h2></div><button type="button" className="button primary" onClick={openCreate}><Icon name="plus" /> 할 일 추가</button></div>
          {tasks.length > 0 ? <div className="project-task-list">{tasks.map((task) => <article className={`project-task ${task.status === "done" ? "is-done" : ""}`} key={task.id}>
            <button type="button" className="project-task-check" onClick={() => toggleTask(task)} aria-label={`${task.title} 완료 상태 변경`}>{task.status === "done" ? "✓" : ""}</button>
            <div className="project-task-copy"><strong>{task.title}</strong><span>{task.status === "done" ? "완료됨" : dueLabel(task.due_date, task.due_time)}</span></div>
            <span className={`priority ${task.priority}`}>{priorityLabel[task.priority]}</span>
            <span className="project-task-status">{taskStatusLabel[task.status]}</span>
            <div className="project-task-actions"><button type="button" onClick={() => openEdit(task)} aria-label={`${task.title} 수정`}>✎</button><button type="button" className="danger" onClick={() => removeTask(task)} aria-label={`${task.title} 삭제`}>×</button></div>
          </article>)}</div> : <div className="project-task-empty"><span aria-hidden="true">✓</span><h3>아직 연결된 할 일이 없습니다.</h3><p>할 일을 추가하면 진행률이 자동으로 계산됩니다.</p><button type="button" className="button primary" onClick={openCreate}><Icon name="plus" /> 첫 할 일 추가</button></div>}
        </section>
      </div>

      <aside className="project-detail-side">
        <section className="card project-detail-card"><div className="project-section-head"><h2>연결 링크</h2></div><div className="project-links">{initialProject.github_url && <a href={initialProject.github_url} target="_blank" rel="noreferrer"><span>⌘</span><div><strong>GitHub</strong><small>저장소 열기 ↗</small></div></a>}{initialProject.deploy_url && <a href={initialProject.deploy_url} target="_blank" rel="noreferrer"><span>↗</span><div><strong>배포 페이지</strong><small>서비스 열기 ↗</small></div></a>}{!initialProject.github_url && !initialProject.deploy_url && <p className="project-muted">등록된 링크가 없습니다.</p>}</div></section>
        <section className="card project-detail-card"><div className="project-section-head"><h2>프로젝트 메모</h2></div><p className="project-note">{initialProject.memo || "등록된 메모가 없습니다."}</p></section>
        <section className="card project-detail-card"><div className="project-section-head"><h2>프로젝트 정보</h2></div><dl className="project-info-list"><div><dt>생성일</dt><dd>{formatDate(initialProject.created_at)}</dd></div><div><dt>마감일</dt><dd>{formatDate(initialProject.due_date)}</dd></div><div><dt>상태</dt><dd>{projectStatusLabel[initialProject.status]}</dd></div></dl></section>
      </aside>
    </div>

    <Modal open={modalOpen} title={editing ? "할 일 수정" : "프로젝트에 할 일 추가"} onClose={() => { setModalOpen(false); setEditing(null); }}>
      <form className="form-grid" action={saveTask}>
        <div className="field"><label htmlFor="project-task-title">할 일 제목 *</label><input id="project-task-title" name="title" className="input" required maxLength={100} defaultValue={editing?.title ?? ""} /></div>
        <div className="field"><label htmlFor="project-task-description">설명</label><textarea id="project-task-description" name="description" className="input" defaultValue={editing?.description ?? ""} /></div>
        <div className="project-form-columns"><div className="field"><label htmlFor="project-task-status">상태</label><select id="project-task-status" name="status" className="input" defaultValue={editing?.status ?? "todo"}><option value="todo">할 일</option><option value="in_progress">진행 중</option><option value="done">완료</option></select></div><div className="field"><label htmlFor="project-task-priority">우선순위</label><select id="project-task-priority" name="priority" className="input" defaultValue={editing?.priority ?? "medium"}><option value="low">낮음</option><option value="medium">보통</option><option value="high">높음</option></select></div></div>
        <div className="field"><label htmlFor="project-task-category">카테고리</label><select id="project-task-category" name="category" className="input" defaultValue={editing?.category ?? "프로젝트"}>{editing?.category && !TASK_CATEGORIES.includes(editing.category as (typeof TASK_CATEGORIES)[number]) && <option value={editing.category}>{editing.category} (기존 값)</option>}{TASK_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
        <div className="project-form-columns"><div className="field"><label htmlFor="project-task-date">마감일 *</label><input id="project-task-date" name="due_date" type="date" className="input" required defaultValue={editing?.due_date ?? getLocalDateString()} /></div><div className="field"><label htmlFor="project-task-time">마감 시간</label><input id="project-task-time" name="due_time" type="time" className="input" defaultValue={editing?.due_time?.slice(0, 5) ?? ""} /></div></div>
        <div className="form-actions"><button type="button" className="button" onClick={() => setModalOpen(false)}>취소</button><button className="button primary" disabled={saving}>{saving ? "저장 중..." : "저장"}</button></div>
      </form>
    </Modal>
    {toast && <Toast message={toast} onDone={() => setToast("")} />}
  </main>;
}
