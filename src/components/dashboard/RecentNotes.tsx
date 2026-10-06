import Link from "next/link";
import type { Note } from "@/lib/types";

export function RecentNotes({ notes = [] }: { notes?: Note[] }) {
  return <section className="card card-pad notes-card"><div className="card-header"><h2 className="card-title">최근 노트</h2><Link href="/notes" className="link-more">전체 보기 →</Link></div><div className="recent-list">{notes.map((note) => <Link href="/notes" key={note.id}><span className="note-glyph">▤</span><div><strong>{note.title}</strong><span>{note.updatedAt}</span></div></Link>)}</div></section>;
}
