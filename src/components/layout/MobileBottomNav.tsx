"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Icon, type IconName } from "@/components/common/Icon";

const items: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "홈", icon: "home" },
  { href: "/tasks", label: "할 일", icon: "tasks" },
  { href: "/planner", label: "캘린더", icon: "calendar" },
  { href: "/habits", label: "습관", icon: "habit" },
  { href: "/more", label: "더보기", icon: "more" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname !== "/") return;
    const startMark = performance.getEntriesByName("home-navigation-start", "mark").at(-1);
    if (!startMark) return;
    requestAnimationFrame(() => {
      console.info(`[home-performance] navigation-click-to-commit: ${(performance.now() - startMark.startTime).toFixed(1)} ms`);
      performance.clearMarks("home-navigation-start");
    });
  }, [pathname]);

  return <nav className="mobile-nav" aria-label="모바일 메뉴">{items.map((item) => {
    const active = item.href === "/more" ? !items.filter((entry) => entry.href !== "/more").some((entry) => entry.href === "/" ? pathname === "/" : pathname.startsWith(entry.href)) : item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    return <Link key={item.href} href={item.href} onClick={() => { if (item.href === "/") performance.mark("home-navigation-start"); }} aria-current={active ? "page" : undefined} className={active ? "active" : ""}><span className="mobile-nav-icon"><Icon name={item.icon} /></span><span>{item.label}</span></Link>;
  })}</nav>;
}
