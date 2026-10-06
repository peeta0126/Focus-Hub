"use client";

import { SimpleManager, type SimpleEntity } from "@/components/common/SimpleManager";
import { emptyStringToNull } from "@/lib/date";
import "../collection.css";

const initial: SimpleEntity[] = [];

export default function GoalsPage() {
  return <main className="page-wrap"><div className="page-heading"><div><h1>목표 관리</h1><p>큰 목표를 작은 마일스톤으로 나누고 꾸준히 전진하세요.</p></div></div><SimpleManager table="goals" initial={initial} cardMode emptyText="첫 번째 목표를 만들어보세요." fields={[{ key: "title", label: "목표", required: true }, { key: "description", label: "설명", type: "textarea" }, { key: "icon", label: "아이콘(Emoji)" }, { key: "category", label: "카테고리" }, { key: "progress", label: "진행률", type: "number" }, { key: "targetDate", label: "목표일", type: "date" }, { key: "status", label: "상태", type: "select", options: ["active", "paused", "completed"] }]} renderMeta={(item) => `${item.icon} ${item.category} · ${item.progress}%`} toDatabase={(item, userId) => ({ id: item.id, user_id: userId, title: item.title, description: item.description, icon: item.icon, category: item.category, progress: item.progress, target_date: emptyStringToNull(item.targetDate), status: item.status })} /></main>;
}
