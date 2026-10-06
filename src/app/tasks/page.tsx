"use client";

import { useState } from "react";
import { TaskManager } from "../../components/tasks/TaskManager";
import "../collection.css";

export default function TasksPage() {
  const [signal, setSignal] = useState(0);
  return <main className="page-wrap"><div className="page-heading"><div><h1>할 일 관리</h1><p>오늘 해야 할 일을 우선순위에 맞춰 정리하세요.</p></div><button className="button primary" onClick={() => setSignal((value) => value + 1)}>＋ 새 할 일</button></div><TaskManager key={signal} initialOpen={signal > 0} /></main>;
}
