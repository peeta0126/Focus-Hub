"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/common/Icon";

const items: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "홈", icon: "home" },
  { href: "/tasks", label: "할 일", icon: "tasks" },
  { href: "/planner", label: "플래너", icon: "calendar" },
  { href: "/habits", label: "습관", icon: "habit" },
  { href: "/more", label: "더보기", icon: "more" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  return <nav className="mobile-nav" aria-label="모바일 메뉴">{items.map((item) => <Link key={item.href} href={item.href} className={(item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)) ? "active" : ""}><span className="mobile-nav-icon"><Icon name={item.icon} /></span><span>{item.label}</span></Link>)}</nav>;
}
