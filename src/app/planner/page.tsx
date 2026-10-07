"use client";

import { SimpleManager, type SimpleEntity } from "@/components/common/SimpleManager";
import { emptyStringToNull } from "@/lib/date";
import { Icon } from "@/components/common/Icon";
import "../collection.css";

const initial: SimpleEntity[] = [];

function eventMeta(item: SimpleEntity) {
  const startTime = String(item.startTime ?? "");
  const endTime = String(item.endTime ?? "");
  const time = startTime && endTime ? `${startTime}–${endTime}` : startTime || (endTime ? `종료 ${endTime}` : "시간 미정");
  return `${item.eventDate} · ${time}${item.sourceTaskId ? " · 할 일 연동" : ""}`;
}

export default function PlannerPage() {
  return <main className="page-wrap planner-page"><div className="page-heading"><div><h1>플래너</h1><p>이번 주의 수업, 약속, 집중 시간을 계획하세요.</p></div><span className="mobile-page-icon planner-heading-icon"><Icon name="calendar" /></span></div><SimpleManager table="events" initial={initial} emptyText="이번 주 일정이 비어 있어요." mobileTimeline fields={[{ key: "title", label: "일정 이름", required: true }, { key: "description", label: "설명", type: "textarea" }, { key: "eventDate", label: "날짜", type: "date", required: true }, { key: "startTime", label: "시작 시간", type: "time" }, { key: "endTime", label: "종료 시간", type: "time" }, { key: "category", label: "카테고리" }, { key: "sourceTaskId", label: "", type: "hidden" }]} renderMeta={eventMeta} toDatabase={(item, userId) => ({ id: item.id, user_id: userId, title: item.title, description: item.description, event_date: item.eventDate, start_time: emptyStringToNull(item.startTime), end_time: emptyStringToNull(item.endTime), category: item.category })} isItemLocked={(item) => Boolean(item.sourceTaskId)} lockedItemMessage="할 일에서 수정하세요" /></main>;
}
