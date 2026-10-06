"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNavigation } from "./navigation";

export function Sidebar({ onQuickAdd }: { onQuickAdd: (type: string) => void }) {
  const pathname = usePathname();
  return (
    <aside className="sidebar">
      <div className="brand">
        <Link href="/" className="brand-title"><span className="brand-mark">☾</span><span>Focus Hub</span></Link>
        <small>오늘도, 조금 더 나은<br />내가 되는 하루</small>
      </div>
      <div className="nav-scroll">
        <nav aria-label="주 메뉴">
          {primaryNavigation.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return <Link key={item.href} href={item.href} className={`nav-link ${active ? "active" : ""}`}><span className="nav-icon">{item.icon}</span>{item.label}</Link>;
          })}
        </nav>
        <div className="nav-label" style={{ marginTop: 12 }}>빠른 추가</div>
        {["새 할 일", "새 프로젝트", "새 노트", "새 저널", "새 CS 학습 기록"].map((label) => <button key={label} className="quick-button" onClick={() => onQuickAdd(label)}><span>＋</span><span>{label}</span></button>)}
      </div>
      <div className="focus-card">
        <span className="focus-kicker">● 현재 집중 중</span>
        <strong>Focus Hub 완성하기</strong>
        <p>작은 진전도 기록하면 성취가 돼요.</p>
        <div className="focus-timer">00:42:18</div>
      </div>
    </aside>
  );
}
