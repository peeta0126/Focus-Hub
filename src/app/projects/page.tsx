"use client";

import { SimpleManager, type SimpleEntity } from "@/components/common/SimpleManager";
import { emptyStringToNull } from "@/lib/date";
import "../collection.css";

const initial: SimpleEntity[] = [];

export default function ProjectsPage() {
  return <main className="page-wrap"><div className="page-heading"><div><h1>프로젝트 관리</h1><p>아이디어부터 배포까지, 진행 상황을 한 흐름으로 관리하세요.</p></div></div><SimpleManager table="projects" initial={initial} cardMode detailBase="/projects" emptyText="아직 프로젝트가 없어요." fields={[{ key: "title", label: "프로젝트 이름", required: true }, { key: "description", label: "설명", type: "textarea" }, { key: "status", label: "상태", type: "select", options: ["planning", "active", "paused", "completed"] }, { key: "progress", label: "진행률", type: "number" }, { key: "startDate", label: "시작일", type: "date" }, { key: "dueDate", label: "마감일", type: "date" }, { key: "githubUrl", label: "GitHub URL", type: "url" }, { key: "deployUrl", label: "배포 URL", type: "url" }, { key: "memo", label: "메모", type: "textarea" }]} renderMeta={(item) => `${item.status} · ${item.progress}%`} toDatabase={(item, userId) => ({ id: item.id, user_id: userId, title: item.title, description: item.description, status: item.status, progress: item.progress, start_date: emptyStringToNull(item.startDate), due_date: emptyStringToNull(item.dueDate), github_url: item.githubUrl || null, deploy_url: item.deployUrl || null, memo: item.memo || null })} /></main>;
}
