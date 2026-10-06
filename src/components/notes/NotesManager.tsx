"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Note } from "@/lib/types";
import { createUuid } from "@/lib/uuid";
import { Toast } from "@/components/common/Toast";

export function NotesManager() {
  const [items, setItems] = useState<Note[]>([]); const [persistedIds, setPersistedIds] = useState<Set<string>>(new Set()); const [activeId, setActiveId] = useState(""); const [query, setQuery] = useState(""); const [toast, setToast] = useState("");
  const active = items.find((note) => note.id === activeId); const visible = items.filter((note) => note.title.toLowerCase().includes(query.toLowerCase()));
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { console.error("Supabase is not configured"); return; }
    supabase.auth.getUser().then(async ({ data: { user }, error: authError }) => {
      if (authError || !user) { setToast("로그인 정보를 확인하지 못했습니다."); return; }
      const { data, error } = await supabase.from("notes").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
      if (error) { console.error("Failed to load notes", error); setToast("노트를 불러오지 못했습니다."); return; }
      const next: Note[] = (data ?? []).map((row) => ({ id: row.id, title: row.title, content: row.content, tags: row.tags ?? [], category: row.category, updatedAt: new Date(row.updated_at).toLocaleDateString("ko-KR") }));
      setItems(next); setPersistedIds(new Set(next.map((note) => note.id))); setActiveId(next[0]?.id ?? "");
    });
  }, []);
  const update = (patch: Partial<Note>) => setItems((current) => current.map((note) => note.id === activeId ? { ...note, ...patch } : note));
  const add = () => { const note: Note = { id: createUuid(), title: "제목 없는 노트", content: "", tags: [], category: "메모", updatedAt: "방금" }; setItems((current) => [note, ...current]); setActiveId(note.id); };
  const save = async () => { if (!active) return; const supabase = createClient(); if (!supabase) { setToast("데이터베이스 연결 설정을 확인해주세요."); return; } const { data: { user } } = await supabase.auth.getUser(); if (!user) { setToast("로그인 정보를 확인하지 못했습니다."); return; } const payload = { title: active.title, content: active.content, tags: active.tags, category: active.category }; const result = persistedIds.has(active.id) ? await supabase.from("notes").update(payload).eq("id", active.id).eq("user_id", user.id) : await supabase.from("notes").insert({ id: active.id, user_id: user.id, ...payload }); if (result.error) { console.error("Failed to save note", result.error); setToast("노트를 저장하지 못했습니다."); return; } setPersistedIds((current) => new Set(current).add(active.id)); setToast("노트를 저장했습니다."); };
  const remove = async () => { if (!active || !window.confirm("이 노트를 삭제할까요?")) return; const previousItems = items; setItems((current) => current.filter((note) => note.id !== active.id)); setActiveId(items.find((note) => note.id !== active.id)?.id ?? ""); const supabase = createClient(); if (!supabase) { setItems(previousItems); setActiveId(active.id); setToast("데이터베이스 연결 설정을 확인해주세요."); return; } const { data: { user } } = await supabase.auth.getUser(); const result = user ? await supabase.from("notes").delete().eq("id", active.id).eq("user_id", user.id) : { error: new Error("Not authenticated") }; if (result.error) { console.error("Failed to delete note", result.error); setItems(previousItems); setActiveId(active.id); setToast("노트를 삭제하지 못했습니다."); return; } setToast("노트를 삭제했습니다."); };
  return <><div className="editor-layout"><aside className="card note-sidebar"><div className="toolbar"><div className="search-wrap"><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="노트 검색" aria-label="노트 검색" /></div></div><button className="button primary" style={{ width: "100%", marginBottom: 8 }} onClick={add}>＋ 새 노트</button>{visible.map((note) => <button className="note-list-button" key={note.id} onClick={() => setActiveId(note.id)} style={note.id === activeId ? { background: "rgba(101,230,180,.06)" } : undefined}><strong>{note.title}</strong><span>{note.category} · {note.updatedAt}</span></button>)}</aside><section className="card note-editor">{active ? <div className="form-grid"><div className="field"><label htmlFor="note-title">제목</label><input id="note-title" className="input" value={active.title} onChange={(event) => update({ title: event.target.value })} /></div><div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}><div className="field"><label htmlFor="note-category">카테고리</label><input id="note-category" className="input" value={active.category} onChange={(event) => update({ category: event.target.value })} /></div><div className="field"><label htmlFor="note-tags">태그 (쉼표 구분)</label><input id="note-tags" className="input" value={active.tags.join(", ")} onChange={(event) => update({ tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} /></div></div><div className="field"><label htmlFor="note-content">본문 (Markdown 입력 가능)</label><textarea id="note-content" className="input" value={active.content} onChange={(event) => update({ content: event.target.value })} /></div><div className="form-actions"><button className="button" onClick={remove}>삭제</button><button className="button primary" onClick={save}>저장</button></div></div> : <div className="empty-state"><div><span>▤</span>새 노트를 작성해보세요.</div></div>}</section></div>{toast && <Toast message={toast} onDone={() => setToast("")} />}</>;
}
