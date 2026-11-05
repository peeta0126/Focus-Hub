import type { IconName } from "@/components/common/Icon";

export const primaryNavigation: { href: string; label: string; icon: IconName; group: string }[] = [
  { href: "/", label: "대시보드", icon: "home", group: "워크스페이스" },
  { href: "/planner", label: "캘린더", icon: "calendar", group: "워크스페이스" },
  { href: "/tasks", label: "할 일", icon: "tasks", group: "워크스페이스" },
  { href: "/projects", label: "프로젝트", icon: "project", group: "워크스페이스" },
  { href: "/goals", label: "목표", icon: "target", group: "성장과 기록" },
  { href: "/habits", label: "습관", icon: "habit", group: "성장과 기록" },
  { href: "/notes", label: "노트", icon: "note", group: "성장과 기록" },
  { href: "/journal", label: "저널", icon: "moon", group: "성장과 기록" },
  { href: "/cs", label: "CS 학습", icon: "code", group: "라이브러리" },
  { href: "/resources", label: "자료 모음", icon: "bookmark", group: "라이브러리" },
];
