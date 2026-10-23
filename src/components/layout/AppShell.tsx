"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Icon } from "@/components/common/Icon";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "./Sidebar";
import { MobileBottomNav } from "./MobileBottomNav";
import { ThemeToggle } from "./ThemeToggle";

const QuickAddModal = dynamic(() => import("./QuickAddModal").then((module) => module.QuickAddModal));

const pathNames: Record<string, string> = { tasks: "할 일 관리", planner: "주간 플래너", projects: "프로젝트", goals: "목표", habits: "습관", notes: "노트", journal: "저널", cs: "CS 학습", resources: "자료 모음", more: "더보기", settings: "설정" };

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [quickType, setQuickType] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const section = pathNames[pathname.split("/")[1]] ?? "오늘의 대시보드";

  const logout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError("");
    try {
      const supabase = createClient();
      if (!supabase) throw new Error("Supabase is not configured");
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Failed to sign out", error);
      setLogoutError("로그아웃하지 못했습니다. 다시 시도해주세요.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (pathname === "/login") return children;
  return (
    <div className="app-shell">
      <Sidebar onQuickAdd={setQuickType} />
      <div className="main-area">
        <header className="topbar"><div className="topbar-path">Focus Hub&nbsp; / &nbsp;<span style={{ color: "var(--text-primary)" }}>{section}</span></div><div className="topbar-actions"><ThemeToggle /><Link className="icon-button" href="/settings" aria-label="설정"><Icon name="settings" /></Link><button type="button" className="logout-button" onClick={logout} disabled={isLoggingOut}>{isLoggingOut ? "로그아웃 중…" : "로그아웃"}</button><div className="profile-dot" title="내 프로필">ME</div></div></header>
        <header className="mobile-header"><Link href="/" className="mobile-brand" aria-label="Focus Hub 홈"><span className="mobile-brand-mark"><Icon name="target" /></span><span>Focus <b>Hub</b></span></Link><div className="mobile-header-actions"><button type="button" className="logout-button" onClick={logout} disabled={isLoggingOut}>{isLoggingOut ? "처리 중…" : "나가기"}</button><Link className="profile-dot" href="/settings" aria-label="프로필 및 설정">ME</Link></div></header>
        {children}
      </div>
      <MobileBottomNav />
      <button className="fab" aria-label="빠른 추가" onClick={() => setQuickType("빠른 추가")}><Icon name="plus" /></button>
      {quickType && <QuickAddModal type={quickType} onClose={() => setQuickType(null)} />}
      {logoutError && <p className="logout-error" role="alert">{logoutError}</p>}
    </div>
  );
}
