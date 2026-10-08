"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/common/Icon";
import { Modal } from "@/components/common/Modal";
import { Toast } from "@/components/common/Toast";
import { emptyStringToNull } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import type { ProjectStatus } from "@/lib/types";
import { createUuid } from "@/lib/uuid";

export type ProjectWithTasks = {
  id: string;
  title: string;
  description: string;
  thumbnail: string | null;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  github_url: string | null;
  deploy_url: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
  tasks: { status: string }[];
};

type Sort = "newest" | "oldest" | "progress-desc" | "progress-asc";
type View = "grid" | "list";

const statusLabel: Record<ProjectStatus, string> = {
  planning: "기획 중",
  active: "진행 중",
  paused: "보류",
  completed: "완료",
};

function taskStats(project: ProjectWithTasks) {
  const total = project.tasks.length;
  const completed = project.tasks.filter((task) => task.status === "done").length;
  return { total, completed, progress: total === 0 ? 0 : Math.round((completed / total) * 100) };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

export function ProjectManager({ initialProjects, userId }: { initialProjects: ProjectWithTasks[]; userId: string }) {
  const [projects, setProjects] = useState(initialProjects);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | ProjectStatus>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [view, setView] = useState<View>("grid");
  const [editing, setEditing] = useState<ProjectWithTasks | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);

  const visible = useMemo(() => projects
    .filter((project) => {
      const searchTarget = `${project.title} ${project.description}`.toLocaleLowerCase("ko-KR");
      return searchTarget.includes(query.trim().toLocaleLowerCase("ko-KR")) && (status === "all" || project.status === status);
    })
    .sort((a, b) => {
      if (sort === "oldest") return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      if (sort === "progress-desc") return taskStats(b).progress - taskStats(a).progress;
      if (sort === "progress-asc") return taskStats(a).progress - taskStats(b).progress;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    }), [projects, query, sort, status]);

  const totals = useMemo(() => ({
    all: projects.length,
    active: projects.filter((project) => project.status === "active").length,
    completed: projects.filter((project) => project.status === "completed").length,
    paused: projects.filter((project) => project.status === "paused").length,
  }), [projects]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
    setMenuId(null);
  };

  const openEdit = (project: ProjectWithTasks) => {
    setEditing(project);
    setModalOpen(true);
    setMenuId(null);
  };

  const save = async (formData: FormData) => {
    const title = String(formData.get("title") ?? "").trim();
    if (!title) {
      setError("프로젝트 이름을 입력해주세요.");
      return;
    }

    setSaving(true);
    const now = new Date().toISOString();
    const editable = {
      title,
      description: String(formData.get("description") ?? "").trim(),
      status: String(formData.get("status") ?? "planning") as ProjectStatus,
      start_date: emptyStringToNull(String(formData.get("start_date") ?? "")),
      due_date: emptyStringToNull(String(formData.get("due_date") ?? "")),
      github_url: emptyStringToNull(String(formData.get("github_url") ?? "").trim()),
      deploy_url: emptyStringToNull(String(formData.get("deploy_url") ?? "").trim()),
      memo: emptyStringToNull(String(formData.get("memo") ?? "").trim()),
    };
    const next: ProjectWithTasks = editing
      ? { ...editing, ...editable, updated_at: now }
      : { id: createUuid(), user_id: userId, thumbnail: null, created_at: now, updated_at: now, tasks: [], ...editable } as ProjectWithTasks & { user_id: string };
    const previous = projects;
    setProjects((current) => editing ? current.map((item) => item.id === editing.id ? next : item) : [next, ...current]);

    const supabase = createClient();
    const result = !supabase
      ? { error: new Error("Supabase is not configured") }
      : editing
        ? await supabase.from("projects").update(editable).eq("id", editing.id).eq("user_id", userId)
        : await supabase.from("projects").insert({ id: next.id, user_id: userId, ...editable });

    setSaving(false);
    if (result.error) {
      console.error("Failed to save project", result.error);
      setProjects(previous);
      setError("프로젝트를 저장하지 못했습니다.");
      return;
    }
    setError("");
    setModalOpen(false);
    setEditing(null);
    setToast(editing ? "프로젝트를 수정했습니다." : "새 프로젝트를 만들었습니다.");
  };

  const remove = async (project: ProjectWithTasks) => {
    setMenuId(null);
    if (!window.confirm(`“${project.title}” 프로젝트를 삭제할까요?\n연결된 할 일은 삭제되지 않고 프로젝트 연결만 해제됩니다.`)) return;
    const previous = projects;
    setProjects((current) => current.filter((item) => item.id !== project.id));
    const supabase = createClient();
    const result = supabase
      ? await supabase.from("projects").delete().eq("id", project.id).eq("user_id", userId)
      : { error: new Error("Supabase is not configured") };
    if (result.error) {
      console.error("Failed to delete project", result.error);
      setProjects(previous);
      setError("프로젝트를 삭제하지 못했습니다.");
      return;
    }
    setError("");
    setToast("프로젝트를 삭제했습니다. 연결된 할 일은 유지됩니다.");
  };

  const statCards = [
    ["전체", totals.all, "folder"],
    ["진행 중", totals.active, "play"],
    ["완료", totals.completed, "check"],
    ["보류", totals.paused, "pause"],
  ] as const;

  return <main className="page-wrap projects-page">
    <header className="projects-heading">
      <div><h1>프로젝트</h1><p>아이디어부터 배포까지, 진행 상황을 한 흐름으로 관리하세요.</p></div>
      <button type="button" className="button primary project-create-button" onClick={openCreate}><Icon name="plus" /> 새 프로젝트</button>
    </header>

    <section className="project-stats" aria-label="프로젝트 통계">
      {statCards.map(([label, value, icon]) => <article className={`project-stat stat-${icon}`} key={label}><span className="project-stat-icon" aria-hidden="true">{icon === "folder" ? "▱" : icon === "play" ? "▷" : icon === "check" ? "✓" : "Ⅱ"}</span><div><span>{label}</span><strong>{value}</strong></div></article>)}
    </section>

    <div className="project-toolbar">
      <label className="project-search"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="프로젝트 제목이나 내용을 검색하세요..." aria-label="프로젝트 검색" /></label>
      <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} aria-label="프로젝트 상태 필터"><option value="all">상태 전체</option><option value="planning">기획 중</option><option value="active">진행 중</option><option value="completed">완료</option><option value="paused">보류</option></select>
      <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} aria-label="프로젝트 정렬"><option value="newest">최신순</option><option value="oldest">오래된순</option><option value="progress-desc">진행률 높은순</option><option value="progress-asc">진행률 낮은순</option></select>
      <div className="project-view-toggle" aria-label="보기 방식">
        <button type="button" className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} aria-label="그리드 보기" aria-pressed={view === "grid"}>▦</button>
        <button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="목록 보기" aria-pressed={view === "list"}>☷</button>
      </div>
    </div>

    {error && <p className="field-error" role="alert">{error}</p>}
    <section className={`project-cards ${view === "list" ? "is-list" : ""}`}>
      {visible.map((project) => {
        const { total, completed, progress } = taskStats(project);
        return <article className="project-card" key={project.id}>
          <Link href={`/projects/${project.id}`} className="project-card-link" aria-label={`${project.title} 상세 보기`}>
            <div className="project-card-top">
              <span className="project-card-icon" aria-hidden="true">{project.title.slice(0, 1).toUpperCase()}</span>
              <div className="project-card-title"><h2>{project.title}</h2><span className={`project-status status-${project.status}`}>{statusLabel[project.status]}</span></div>
            </div>
            <p className="project-description">{project.description || "프로젝트 설명이 없습니다."}</p>
            <div className="project-progress-heading"><span>진행률</span><strong>{progress}%</strong></div>
            <div className="project-progress-track" aria-label={`진행률 ${progress}%`}><span style={{ width: `${progress}%` }} /></div>
            <div className="project-card-meta"><span>완료한 할 일 <b>{completed}</b> / {total}</span><span>최근 업데이트 {formatDate(project.updated_at)}</span></div>
          </Link>
          <div className="project-card-menu-wrap">
            <button type="button" className="project-menu-button" onClick={() => setMenuId((current) => current === project.id ? null : project.id)} aria-label={`${project.title} 메뉴`} aria-expanded={menuId === project.id}><Icon name="more" /></button>
            {menuId === project.id && <div className="project-card-menu"><button type="button" onClick={() => openEdit(project)}>수정</button><button type="button" className="danger" onClick={() => remove(project)}>삭제</button></div>}
          </div>
        </article>;
      })}
      {visible.length === 0 && <div className="project-empty"><span aria-hidden="true">◇</span><h2>조건에 맞는 프로젝트가 없습니다.</h2><p>검색 조건을 바꾸거나 새 프로젝트를 만들어보세요.</p><button type="button" className="button primary" onClick={openCreate}>새 프로젝트</button></div>}
    </section>

    <Modal open={modalOpen} title={editing ? "프로젝트 수정" : "새 프로젝트"} onClose={() => { setModalOpen(false); setEditing(null); }}>
      <form className="form-grid" action={save}>
        <div className="field"><label htmlFor="project-title">프로젝트 이름 *</label><input id="project-title" name="title" className="input" required maxLength={100} defaultValue={editing?.title ?? ""} /></div>
        <div className="field"><label htmlFor="project-description">설명</label><textarea id="project-description" name="description" className="input" defaultValue={editing?.description ?? ""} /></div>
        <div className="project-form-columns"><div className="field"><label htmlFor="project-status">상태</label><select id="project-status" name="status" className="input" defaultValue={editing?.status ?? "planning"}><option value="planning">기획 중</option><option value="active">진행 중</option><option value="paused">보류</option><option value="completed">완료</option></select></div><div className="field project-auto-progress"><label>진행률</label><div>연결된 할 일에서 자동 계산</div></div></div>
        <div className="project-form-columns"><div className="field"><label htmlFor="project-start-date">시작일</label><input id="project-start-date" name="start_date" type="date" className="input" defaultValue={editing?.start_date ?? ""} /></div><div className="field"><label htmlFor="project-due-date">마감일</label><input id="project-due-date" name="due_date" type="date" className="input" defaultValue={editing?.due_date ?? ""} /></div></div>
        <div className="field"><label htmlFor="project-github">GitHub URL</label><input id="project-github" name="github_url" type="url" className="input" defaultValue={editing?.github_url ?? ""} /></div>
        <div className="field"><label htmlFor="project-deploy">배포 URL</label><input id="project-deploy" name="deploy_url" type="url" className="input" defaultValue={editing?.deploy_url ?? ""} /></div>
        <div className="field"><label htmlFor="project-memo">메모</label><textarea id="project-memo" name="memo" className="input" defaultValue={editing?.memo ?? ""} /></div>
        <div className="form-actions"><button type="button" className="button" onClick={() => setModalOpen(false)}>취소</button><button className="button primary" disabled={saving}>{saving ? "저장 중..." : "저장"}</button></div>
      </form>
    </Modal>
    {toast && <Toast message={toast} onDone={() => setToast("")} />}
  </main>;
}
