"use client";

import { useState } from "react";
import { Toast } from "@/components/common/Toast";
import { getLocalDateString } from "@/lib/date";
import { createClient } from "@/lib/supabase/client";
import "../collection.css";

export default function JournalPage() {
  const [mood, setMood] = useState("🙂"); const [toast, setToast] = useState("");
  const save = async (form: FormData) => {
    const entryDate = String(form.get("date") ?? "").trim();
    if (!entryDate) { setToast("날짜를 선택해주세요."); return; }
    const supabase = createClient();
    if (!supabase) { setToast("데이터베이스 연결 설정을 확인해주세요."); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setToast("로그인 정보를 확인하지 못했습니다."); return; }
    const { error } = await supabase.from("journal_entries").upsert({ user_id: user.id, entry_date: entryDate, mood, events: form.get("events"), wins: form.get("wins"), regrets: form.get("regrets"), tomorrow: form.get("tomorrow") }, { onConflict: "user_id,entry_date" });
    if (error) { console.error("Failed to save journal", error); setToast("저널을 저장하지 못했습니다."); return; }
    setToast("오늘의 저널을 저장했습니다.");
  };
  return <main className="page-wrap"><div className="page-heading"><div><h1>저널</h1><p>하루를 천천히 돌아보고 내일을 가볍게 준비하세요.</p></div></div><form className="card card-pad form-grid" action={save}><div className="field"><label htmlFor="journal-date">날짜</label><input id="journal-date" name="date" type="date" className="input" defaultValue={getLocalDateString()} required /></div><div className="field"><label>오늘의 기분</label><div className="journal-moods">{["😄", "🙂", "😐", "😔", "😴"].map((item) => <button type="button" key={item} className={`mood-button ${mood === item ? "active" : ""}`} onClick={() => setMood(item)} aria-label={`기분 ${item}`}>{item}</button>)}</div></div>{[["events", "오늘 있었던 일"], ["wins", "오늘 잘한 일"], ["regrets", "아쉬운 점"], ["tomorrow", "내일 할 일"]].map(([name, label]) => <div className="field" key={name}><label htmlFor={`journal-${name}`}>{label}</label><textarea id={`journal-${name}`} name={name} className="input" /></div>)}<div className="form-actions"><button className="button primary">저널 저장</button></div></form>{toast && <Toast message={toast} onDone={() => setToast("")} />}</main>;
}
