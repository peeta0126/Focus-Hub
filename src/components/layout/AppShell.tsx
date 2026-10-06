"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Modal } from "@/components/common/Modal";
import { getLocalDateString } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import { createUuid } from "@/lib/uuid";
import { Sidebar } from "./Sidebar";
import { MobileBottomNav } from "./MobileBottomNav";

const pathNames: Record<string, string> = { tasks: "할 일 관리", planner: "주간 플래너", projects: "프로젝트", goals: "목표", habits: "습관", notes: "노트", journal: "저널", cs: "CS 학습", resources: "자료 모음", more: "더보기", settings: "설정" };

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [quickType, setQuickType] = useState<string | null>(null);
  const section = pathNames[pathname.split("/")[1]] ?? "오늘의 대시보드";
  if (pathname === "/login") return children;
  return (
    <div className="app-shell">
      <Sidebar onQuickAdd={setQuickType} />
      <div className="main-area">
        <header className="topbar"><div className="topbar-path">Focus Hub&nbsp; / &nbsp;<span style={{ color: "var(--text)" }}>{section}</span></div><div className="topbar-actions"><button className="icon-button" aria-label="검색">⌕</button><a className="icon-button" href="/settings" aria-label="설정">⚙</a><div className="profile-dot" title="내 프로필">ME</div></div></header>
        {children}
      </div>
      <MobileBottomNav />
      <button className="fab" aria-label="빠른 추가" onClick={() => setQuickType("빠른 추가")}>＋</button>
      <Modal open={Boolean(quickType)} title={quickType ?? "빠른 추가"} onClose={() => setQuickType(null)}>
        <QuickAddForm type={quickType ?? ""} onDone={() => setQuickType(null)} />
      </Modal>
    </div>
  );
}

function QuickAddForm({ type, onDone }: { type: string; onDone: () => void }) {
  const [mobileChoice, setMobileChoice] = useState("");
  const [habits, setHabits] = useState<{ id: string; title: string }[]>([]);
  const [loadingHabits, setLoadingHabits] = useState(false);
  const [error, setError] = useState("");
  const [pendingTaskId, setPendingTaskId] = useState("");
  const router = useRouter();
  const isMobileQuick = type === "빠른 추가";
  const kind = isMobileQuick ? mobileChoice : type;

  useEffect(() => {
    if (kind !== "새 습관 기록") return;
    const supabase = createClient();
    if (!supabase) { console.error("Supabase is not configured"); return; }
    queueMicrotask(() => setLoadingHabits(true));
    supabase.auth.getUser().then(async ({ data: { user }, error: authError }) => {
      if (authError || !user) { setError("로그인 정보를 확인하지 못했습니다."); setLoadingHabits(false); return; }
      const { data, error: queryError } = await supabase.from("habits").select("id,title").eq("user_id", user.id).eq("active", true).order("created_at");
      if (queryError) { console.error("Failed to load quick-add habits", queryError); setError("습관 목록을 불러오지 못했습니다."); }
      setHabits(data ?? []);
      setLoadingHabits(false);
    });
  }, [kind]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") ?? "");
    const detail = String(form.get("detail") ?? "");
    const supabase = createClient();
    if (!supabase) { setError("데이터베이스 연결 설정을 확인해주세요."); return; }
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setError("로그인 정보를 확인하지 못했습니다."); return; }
    const settingsResult = await supabase.from("settings").select("timezone").eq("user_id", user.id).maybeSingle();
    if (settingsResult.error) console.error("Failed to load quick-add timezone", settingsResult.error);
    const today = getLocalDateString(settingsResult.data?.timezone);
    const common = { user_id: user.id, title };
    let writeError: { message: string } | null = null;
    if (kind === "새 할 일") {
      const taskId = pendingTaskId || createUuid();
      const task = { id: taskId, ...common, description: detail, due_date: today, due_time: null, category: "개인" };
      ({ error: writeError } = await supabase.from("tasks").upsert(task, { onConflict: "id" }));
      if (!writeError) {
        const { error: eventError } = await supabase.from("events").upsert({ user_id: user.id, source_task_id: taskId, title, description: detail, event_date: today, start_time: null, end_time: null, category: "개인" }, { onConflict: "source_task_id" });
        if (eventError) {
          console.error("Failed to sync quick-add task event", eventError);
          setPendingTaskId(taskId);
          setError("할 일은 저장됐지만 플래너 일정 동기화에 실패했습니다. 저장을 다시 눌러 재시도해주세요.");
          return;
        }
      }
    }
    else if (kind === "새 프로젝트") ({ error: writeError } = await supabase.from("projects").insert({ ...common, description: detail }));
    else if (kind === "새 노트") ({ error: writeError } = await supabase.from("notes").insert({ ...common, content: detail }));
    else if (kind === "새 일정") ({ error: writeError } = await supabase.from("events").insert({ ...common, description: detail, event_date: today }));
    else if (kind === "새 저널") ({ error: writeError } = await supabase.from("journal_entries").upsert({ user_id: user.id, entry_date: today, events: detail || title }, { onConflict: "user_id,entry_date" }));
    else if (kind === "새 CS 학습 기록") ({ error: writeError } = await supabase.from("cs_study_logs").insert({ ...common, key_points: detail, study_date: today }));
    else if (kind === "새 습관 기록") {
      const habitId = String(form.get("habitId") ?? "");
      if (!habits.some((habit) => habit.id === habitId)) { setError("기록할 습관을 선택해주세요."); return; }
      ({ error: writeError } = await supabase.from("habit_records").upsert({ user_id: user.id, habit_id: habitId, date: today, completed: true }, { onConflict: "habit_id,date" }));
    } else { setError("기록 종류를 선택해주세요."); return; }
    if (writeError) { console.error("Failed to quick-add item", writeError); setError("저장하지 못했습니다. 다시 시도해주세요."); return; }
    router.refresh();
    onDone();
  };
  return <form className="form-grid" onSubmit={submit}>
    {isMobileQuick && <div className="field"><label htmlFor="quick-kind">기록 종류</label><select id="quick-kind" className="input" value={mobileChoice} onChange={(event) => setMobileChoice(event.target.value)} required><option value="">선택하세요</option><option>새 할 일</option><option>새 일정</option><option>새 노트</option><option>새 습관 기록</option></select></div>}
    {kind === "새 습관 기록" ? <div className="field"><label htmlFor="quick-habit">습관</label><select id="quick-habit" name="habitId" className="input" required disabled={loadingHabits || habits.length === 0}><option value="">{loadingHabits ? "불러오는 중..." : habits.length ? "선택하세요" : "먼저 습관을 만들어주세요"}</option>{habits.map((habit) => <option key={habit.id} value={habit.id}>{habit.title}</option>)}</select></div> : <><div className="field"><label htmlFor="quick-title">제목</label><input id="quick-title" name="title" className="input" placeholder="무엇을 기록할까요?" required autoFocus /></div><div className="field"><label htmlFor="quick-detail">간단한 내용</label><textarea id="quick-detail" name="detail" className="input" placeholder="필요한 내용을 적어주세요." /></div></>}
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className="form-actions"><button type="button" className="button ghost" onClick={onDone}>취소</button><button className="button primary" type="submit" disabled={kind === "새 습관 기록" && (loadingHabits || habits.length === 0)}>저장</button></div>
  </form>;
}
