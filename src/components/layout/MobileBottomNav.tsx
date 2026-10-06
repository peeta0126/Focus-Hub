"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "홈", icon: "⌂" },
  { href: "/tasks", label: "할 일", icon: "☑" },
  { href: "/planner", label: "일정", icon: "▦" },
  { href: "/projects", label: "프로젝트", icon: "◆" },
  { href: "/more", label: "더보기", icon: "•••" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  return <nav className="mobile-nav" aria-label="모바일 메뉴">{items.map((item) => <Link key={item.href} href={item.href} className={(item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) ? "active" : ""}><span className="mobile-nav-icon">{item.icon}</span><span>{item.label}</span></Link>)}</nav>;
}
