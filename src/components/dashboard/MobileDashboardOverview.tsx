import Link from "next/link";
import { Icon, type IconName } from "@/components/common/Icon";
import type { DailyGoal, Habit, Note, Task } from "@/lib/types";

export function MobileDashboardOverview({ tasks, goals, habits, notes }: { tasks: Task[]; goals: DailyGoal[]; habits: Habit[]; notes: Note[] }) {
  const stats: { href: string; icon: IconName; label: string; value: string }[] = [
    { href: "/tasks", icon: "clock", label: "할 일 미리보기", value: `${tasks.length}개` },
    { href: "/goals", icon: "target", label: "오늘의 목표", value: `${goals.filter((item) => item.completed).length}/${goals.length}` },
    { href: "/habits", icon: "habit", label: "습관", value: `${habits.filter((item) => item.completedToday).length}/${habits.length}` },
    { href: "/notes", icon: "note", label: "노트", value: `${notes.length}개` },
  ];
  return <section className="dashboard-overview" aria-label="하루 요약"><div className="daily-stats">{stats.map((item) => <Link key={item.label} href={item.href} className="daily-stat"><span className="daily-stat-icon"><Icon name={item.icon} /></span><strong>{item.label}</strong><span>{item.value}</span></Link>)}</div></section>;
}

export function MobileQuickActions() {
  const actions: { href: string; icon: IconName; label: string }[] = [
    { href: "/tasks", icon: "plus", label: "할 일 추가" },
    { href: "/projects", icon: "project", label: "프로젝트" },
    { href: "/notes", icon: "note", label: "새 노트" },
    { href: "/planner", icon: "calendar", label: "일정 보기" },
  ];
  return <section className="mobile-only mobile-section quick-section"><div className="mobile-section-head"><h2>빠른 실행</h2></div><div className="quick-actions">{actions.map((item) => <Link key={item.label} href={item.href}><span><Icon name={item.icon} /></span><b>{item.label}</b></Link>)}</div></section>;
}
