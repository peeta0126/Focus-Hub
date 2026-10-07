"use client";

import { useState } from "react";
import { TaskManager } from "../../components/tasks/TaskManager";
import { Icon } from "@/components/common/Icon";
import "../collection.css";

export default function TasksPage() {
  const [signal, setSignal] = useState(0);
  return <main className="page-wrap task-page"><div className="page-heading"><div><h1>할 일</h1><p>오늘 해야 할 일을 우선순위에 맞춰 정리하세요.</p></div><div className="page-heading-actions"><button className="mobile-page-icon" type="button" aria-label="할 일 검색" onClick={() => document.querySelector<HTMLInputElement>('[aria-label="할 일 검색"]')?.focus()}><Icon name="search" /></button><button className="mobile-page-icon" type="button" aria-label="더보기"><Icon name="more" /></button><button className="button primary desktop-add-task" onClick={() => setSignal((value) => value + 1)}>＋ 새 할 일</button></div></div><TaskManager key={signal} initialOpen={signal > 0} /></main>;
}
