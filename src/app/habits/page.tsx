"use client";

import { SimpleManager, type SimpleEntity } from "@/components/common/SimpleManager";
import "../collection.css";

const initial: SimpleEntity[] = [];

export default function HabitsPage() {
  return <main className="page-wrap"><div className="page-heading"><div><h1>습관 관리</h1><p>작은 반복을 꾸준히 기록하세요.</p></div></div><SimpleManager table="habits" initial={initial} emptyText="관리할 습관을 추가해보세요." fields={[{ key: "title", label: "습관 이름", required: true }, { key: "description", label: "설명" }, { key: "icon", label: "아이콘(Emoji)" }, { key: "frequency", label: "주기", type: "select", options: ["daily", "weekly"] }, { key: "targetCount", label: "목표 횟수", type: "number" }]} renderMeta={(item) => `${item.icon} ${item.frequency} · ${item.targetCount}회`} toDatabase={(item, userId) => ({ id: item.id, user_id: userId, title: item.title, icon: item.icon, frequency: item.frequency, target_count: item.targetCount, active: typeof item.active === "boolean" ? item.active : true })} /></main>;
}
