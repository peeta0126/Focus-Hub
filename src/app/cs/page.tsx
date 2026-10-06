"use client";

import { SimpleManager, type SimpleEntity } from "@/components/common/SimpleManager";
import "../collection.css";

const initial: SimpleEntity[] = [];

export default function CsPage() {
  return <main className="page-wrap"><div className="page-heading"><div><h1>CS 학습 기록</h1><p>공부한 핵심 내용과 코드를 나만의 언어로 남기세요.</p></div></div><SimpleManager table="cs_study_logs" initial={initial} emptyText="첫 학습 기록을 작성해보세요." fields={[{ key: "title", label: "제목", required: true }, { key: "category", label: "카테고리", type: "select", options: ["JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Network", "Database", "OS", "Algorithm", "Git", "기타"] }, { key: "studyDate", label: "공부 날짜", type: "date", required: true }, { key: "description", label: "핵심 내용", type: "textarea" }, { key: "code", label: "코드", type: "textarea" }, { key: "reflection", label: "느낀 점", type: "textarea" }, { key: "tags", label: "태그 (쉼표 구분)" }]} renderMeta={(item) => `${item.category} · ${item.studyDate}`} toDatabase={(item, userId) => ({ id: item.id, user_id: userId, title: item.title, category: item.category, study_date: item.studyDate, key_points: item.description, code: item.code, reflection: item.reflection, tags: String(item.tags).split(",").map((tag) => tag.trim()).filter(Boolean) })} /></main>;
}
