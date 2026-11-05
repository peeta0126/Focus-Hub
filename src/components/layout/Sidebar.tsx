"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/common/Icon";
import { primaryNavigation } from "./navigation";

export function Sidebar({ onQuickAdd, collapsed, onToggle }: { onQuickAdd: (type: string) => void; collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  return <aside className="sidebar" aria-label="워크스페이스 탐색">
    <div className="brand"><Link href="/" className="brand-title" aria-label="Focus Hub 홈"><span className="brand-mark"><Icon name="target" /></span><span className="sidebar-copy">Focus Hub<span className="brand-caption">PERSONAL WORKSPACE</span></span></Link></div>
    <button type="button" className="sidebar-create" onClick={() => onQuickAdd("빠른 추가")} title="빠른 추가"><Icon name="plus" /><span className="sidebar-copy">빠른 추가</span></button>
    <div className="nav-scroll"><nav aria-label="주 메뉴">{primaryNavigation.map((item, index) => {
      const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
      return <div key={item.href}>{(index === 0 || item.group !== primaryNavigation[index - 1].group) && <div className="nav-label sidebar-copy">{item.group}</div>}<Link href={item.href} className={`nav-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined} title={item.label}><Icon name={item.icon} /><span className="sidebar-copy">{item.label}</span></Link></div>;
    })}</nav></div>
    <div className="sidebar-footer"><Link href="/settings" className={`nav-link ${pathname === "/settings" ? "active" : ""}`} aria-current={pathname === "/settings" ? "page" : undefined} title="설정"><Icon name="settings" /><span className="sidebar-copy">설정 및 환경</span></Link><button type="button" className="nav-link sidebar-collapse" aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"} aria-expanded={!collapsed} onClick={onToggle}><Icon name="panel" /><span className="sidebar-copy">사이드바 접기</span></button><p className="sidebar-copy sidebar-note">작은 진전이 쌓이는 공간.</p></div>
  </aside>;
}
