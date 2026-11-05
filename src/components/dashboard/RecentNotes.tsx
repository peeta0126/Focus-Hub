import Link from "next/link";
import type { Note } from "@/lib/types";

export function RecentNotes({ notes = [] }: { notes?: Note[] }) {
  return <section className="card card-pad notes-card"><div className="card-header"><h2 className="card-title">최근 노트</h2><Link href="/notes" className="link-more">전체 보기 →</Link></div><div className="recent-list">{notes.map((note) => <Link href="/notes" key={note.id}><span className="note-glyph">▤</span><div><strong>{note.title}</strong><span>{note.updatedAt}</span></div></Link>)}</div>{notes.length === 0 && <div className="empty-state"><Link href="/notes">아이디어를 기록해보세요 →</Link></div>}</section>;
}
