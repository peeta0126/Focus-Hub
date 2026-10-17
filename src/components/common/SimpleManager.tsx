"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AssetImage } from "./AssetImage";
import { Modal } from "./Modal";
import { Toast } from "./Toast";
import { createClient } from "@/lib/supabase/client";
import { createUuid } from "@/lib/uuid";
import { addDaysToDateString, getLocalDateString, getWeekDateStrings } from "@/lib/date";
import { Icon } from "./Icon";

export type SimpleValue = string | number | boolean | string[];
export type SimpleEntity = { id: string; title: string; description: string; [key: string]: SimpleValue };
export type SimpleField = { key: string; label: string; type?: "text" | "textarea" | "date" | "time" | "number" | "url" | "select" | "emoji" | "hidden"; options?: string[]; required?: boolean };

interface SimpleManagerProps {
  table: string;
  initial: SimpleEntity[];
  fields: SimpleField[];
  emptyText: string;
  renderMeta: (item: SimpleEntity) => string;
  toDatabase: (item: SimpleEntity, userId: string) => Record<string, SimpleValue | null>;
  cardMode?: boolean;
  detailBase?: string;
  isItemLocked?: (item: SimpleEntity) => boolean;
  lockedItemMessage?: string;
  mobileTimeline?: boolean;
}

export function SimpleManager({ table, initial, fields, emptyText, renderMeta, toDatabase, cardMode = false, detailBase, isItemLocked, lockedItemMessage, mobileTimeline = false }: SimpleManagerProps) {
  const [items, setItems] = useState(initial);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SimpleEntity | null>(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const visible = useMemo(() => items.filter((item) => `${item.title} ${item.description}`.toLowerCase().includes(query.toLowerCase())), [items, query]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      console.error("Supabase is not configured");
      return;
    }
    supabase.auth.getUser().then(async ({ data: { user }, error: authError }) => {
      if (authError || !user) {
        setItems([]);
        setError("로그인 정보를 확인하지 못했습니다.");
        return;
      }
      const { data, error: queryError } = await supabase.from(table).select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
      if (queryError) {
        console.error(`Failed to load ${table}`, queryError);
        setItems([]);
        setError("데이터를 불러오지 못했습니다.");
        return;
      }
      setError("");
      setItems((data ?? []).map((source) => {
        const row = source as Record<string, unknown>;
        const entity: SimpleEntity = { id: String(row.id), title: String(row.title), description: String(row.description ?? row.key_points ?? "") };
        fields.forEach((field) => {
          if (field.key === "title" || field.key === "description") return;
          const databaseKey = field.key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
          const value = row[databaseKey];
          entity[field.key] = field.type === "number" ? Number(value ?? 0) : String(value ?? "");
        });
        if (typeof row.thumbnail === "string") entity.thumbnail = row.thumbnail;
        if (typeof row.active === "boolean") entity.active = row.active;
        if (typeof row.user_id === "string") entity.userId = row.user_id;
        if (typeof row.created_at === "string") entity.createdAt = row.created_at;
        if (typeof row.updated_at === "string") entity.updatedAt = row.updated_at;
        return entity;
      }));
    });
  }, [fields, table]);

  const close = useCallback(() => { setOpen(false); setEditing(null); }, []);
  const save = async (form: FormData) => {
    const missingRequiredField = fields.find((field) => field.required && String(form.get(field.key) ?? "").trim() === "");
    if (missingRequiredField) {
      setError(`${missingRequiredField.label} 항목을 입력해주세요.`);
      return;
    }
    const base: SimpleEntity = { id: editing?.id ?? createUuid(), title: String(form.get("title") ?? ""), description: String(form.get("description") ?? "") };
    fields.forEach((field) => {
      if (field.key === "title" || field.key === "description") return;
      const raw = form.get(field.key);
      base[field.key] = field.type === "number" ? Number(raw) : String(raw ?? "");
    });
    const updated = editing ? { ...editing, ...base } : base;
    const previousItems = items;
    setItems((current) => editing ? current.map((item) => item.id === editing.id ? updated : item) : [updated, ...current]);
    const supabase = createClient();
    if (!supabase) {
      setItems(previousItems);
      setError("데이터베이스 연결 설정을 확인해주세요.");
      return;
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setItems(previousItems);
      setError("로그인 정보를 확인하지 못했습니다.");
      return;
    }
    const databaseValue = toDatabase(updated, user.id);
    const result = editing
      ? await supabase.from(table).update(Object.fromEntries(Object.entries(databaseValue).filter(([key]) => !["id", "user_id", "created_at", "updated_at"].includes(key)))).eq("id", editing.id).eq("user_id", user.id)
      : await supabase.from(table).insert(databaseValue);
    if (result.error) {
      console.error(`Failed to save ${table}`, result.error);
      setItems(previousItems);
      setError("저장하지 못했습니다. 다시 시도해주세요.");
      return;
    }
    setError("");
    setToast(editing ? "항목을 수정했습니다." : "새 항목을 추가했습니다.");
    window.dispatchEvent(new CustomEvent("focus-hub:data-changed", { detail: { table } }));
    close();
  };
  const remove = async (item: SimpleEntity) => {
    if (!window.confirm(`“${item.title}”을 삭제할까요?`)) return;
    const previousItems = items;
    setItems((current) => current.filter((value) => value.id !== item.id));
    const supabase = createClient();
    if (!supabase) { setItems(previousItems); setError("데이터베이스 연결 설정을 확인해주세요."); return; }
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) { setItems(previousItems); setError("로그인 정보를 확인하지 못했습니다."); return; }
    const { error: deleteError } = await supabase.from(table).delete().eq("id", item.id).eq("user_id", user.id);
    if (deleteError) { console.error(`Failed to delete ${table}`, deleteError); setItems(previousItems); setError("삭제하지 못했습니다."); return; }
    setError("");
    setToast("항목을 삭제했습니다.");
    window.dispatchEvent(new CustomEvent("focus-hub:data-changed", { detail: { table } }));
  };

  const week = getWeekDateStrings(selectedDate);
  const dateLabel = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long", timeZone: "UTC" }).format(new Date(`${selectedDate}T12:00:00Z`));
  const timelineItems = visible.filter((item) => String(item.eventDate ?? "") === selectedDate).sort((a, b) => String(a.startTime ?? "99:99").localeCompare(String(b.startTime ?? "99:99")));

  return <>
    {mobileTimeline && <section className="mobile-planner"><div className="planner-date-controls"><button type="button" aria-label="이전 주" onClick={() => setSelectedDate(addDaysToDateString(week[0], -7))}><Icon name="chevron-left" /></button><strong>{dateLabel}</strong><button type="button" aria-label="다음 주" onClick={() => setSelectedDate(addDaysToDateString(week[0], 7))}><Icon name="chevron-right" /></button><button type="button" className="today-button" onClick={() => setSelectedDate(getLocalDateString())}>오늘</button></div><div className="planner-week" role="tablist" aria-label="날짜 선택">{week.map((date) => { const weekday = new Intl.DateTimeFormat("ko-KR", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)).replace("요일", ""); return <button key={date} type="button" role="tab" aria-selected={date === selectedDate} className={date === selectedDate ? "active" : ""} onClick={() => setSelectedDate(date)}><span>{weekday}</span><b>{Number(date.slice(-2))}</b></button>; })}</div><div className="mobile-timeline">{timelineItems.map((item) => <article key={item.id} className="timeline-row"><time>{String(item.startTime || "종일").slice(0, 5)}</time><div className="timeline-card"><div><strong>{item.title}</strong><p>{String(item.startTime || "시간 미정").slice(0, 5)}{item.endTime ? ` – ${String(item.endTime).slice(0, 5)}` : ""}</p></div><RowActions onEdit={() => { setEditing(item); setOpen(true); }} onRemove={() => remove(item)} disabled={isItemLocked?.(item) ?? false} disabledMessage={lockedItemMessage} /></div></article>)}{timelineItems.length === 0 && <div className="timeline-empty">이 날의 일정이 비어 있어요.</div>}</div><button type="button" className="mobile-planner-add" onClick={() => { setEditing(null); setOpen(true); }}>＋ <span>새 일정 추가</span></button></section>}
    <div className={mobileTimeline ? "desktop-manager" : undefined}><div className="toolbar"><div className="search-wrap"><input className="input" aria-label="검색" placeholder="제목이나 내용 검색" value={query} onChange={(event) => setQuery(event.target.value)} /></div><button type="button" className="button primary" onClick={() => { setEditing(null); setOpen(true); }}>＋ 새 항목</button></div>
    {error && <p className="field-error" role="alert">{error}</p>}
    <div className={cardMode ? "section-grid" : "card content-card data-list"}>
      {visible.map((item) => cardMode ? <article className="card entity-card" key={item.id}>
        {typeof item.thumbnail === "string" && <div className="entity-thumbnail"><AssetImage src={item.thumbnail} alt={`${item.title} 썸네일`} sizes="(max-width: 767px) 100vw, 33vw" /></div>}
        <h3>{detailBase ? <Link href={`${detailBase}/${item.id}`}>{item.title}</Link> : item.title}</h3><p>{item.description}</p>
        {typeof item.progress === "number" && <div className="progress-track"><div className="progress-fill" style={{ width: `${item.progress}%` }} /></div>}
        <div className="entity-meta"><span>{renderMeta(item)}</span><RowActions onEdit={() => { setEditing(item); setOpen(true); }} onRemove={() => remove(item)} disabled={isItemLocked?.(item) ?? false} disabledMessage={lockedItemMessage} /></div>
      </article> : <article className="data-row" key={item.id}><div className="data-main"><strong>{item.title}</strong><p>{item.description || renderMeta(item)}</p></div><span className="status-pill">{renderMeta(item)}</span><RowActions onEdit={() => { setEditing(item); setOpen(true); }} onRemove={() => remove(item)} disabled={isItemLocked?.(item) ?? false} disabledMessage={lockedItemMessage} /></article>)}
      {visible.length === 0 && <div className="empty-state"><div><span>✦</span>{emptyText}</div></div>}
    </div></div>
    <Modal open={open} title={editing ? "항목 수정" : "새 항목"} onClose={close}><form className="form-grid" action={save}>{fields.map((field) => { const defaultValue = editing?.[field.key] ?? (mobileTimeline && field.key === "eventDate" ? selectedDate : ""); return field.type === "hidden" ? <input key={field.key} name={field.key} type="hidden" defaultValue={String(defaultValue)} /> : <div className="field" key={field.key}><label htmlFor={`entity-${field.key}`}>{field.label}</label>{field.type === "textarea" ? <textarea id={`entity-${field.key}`} className="input" name={field.key} defaultValue={String(defaultValue)} required={field.required} /> : field.type === "select" ? <select id={`entity-${field.key}`} className="input" name={field.key} defaultValue={String(editing?.[field.key] ?? field.options?.[0] ?? "")}>{field.options?.map((option) => <option key={option}>{option}</option>)}</select> : field.type === "emoji" ? <EmojiField id={`entity-${field.key}`} name={field.key} initialValue={String(defaultValue)} options={field.options ?? []} required={field.required} /> : <input id={`entity-${field.key}`} className="input" name={field.key} type={field.type ?? "text"} defaultValue={String(defaultValue)} required={field.required} min={field.type === "number" ? 0 : undefined} max={field.key === "progress" ? 100 : undefined} />}</div>; })}<div className="form-actions"><button type="button" className="button" onClick={close}>취소</button><button className="button primary">저장</button></div></form></Modal>
    {toast && <Toast message={toast} onDone={() => setToast("")} />}
  </>;
}

function EmojiField({ id, name, initialValue, options, required }: { id: string; name: string; initialValue: string; options: string[]; required?: boolean }) {
  const [value, setValue] = useState(initialValue);

  return <><input id={id} className="input" name={name} value={value} onChange={(event) => setValue(event.target.value)} required={required} /><div className="emoji-options" role="group" aria-label="아이콘 프리셋">{options.map((emoji) => <button key={emoji} type="button" className={`emoji-option${value === emoji ? " active" : ""}`} onClick={() => setValue(emoji)} aria-label={`${emoji} 아이콘 선택`} aria-pressed={value === emoji}>{emoji}</button>)}</div></>;
}

function RowActions({ onEdit, onRemove, disabled = false, disabledMessage }: { onEdit: () => void; onRemove: () => void; disabled?: boolean; disabledMessage?: string }) {
  const message = disabled ? disabledMessage : undefined;
  return <div className="row-actions"><button type="button" className="row-action" onClick={onEdit} disabled={disabled} title={message} aria-label={message ? `수정 불가: ${message}` : "수정"}>✎</button><button type="button" className="row-action danger" onClick={onRemove} disabled={disabled} title={message} aria-label={message ? `삭제 불가: ${message}` : "삭제"}>×</button></div>;
}
