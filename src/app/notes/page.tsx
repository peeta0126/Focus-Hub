import { NotesManager } from "@/components/notes/NotesManager";
import "../collection.css";
export default function NotesPage() { return <main className="page-wrap"><div className="page-heading"><div><h1>노트</h1><p>아이디어와 배운 내용을 가볍게 기록하고 검색하세요.</p></div></div><NotesManager /></main>; }
