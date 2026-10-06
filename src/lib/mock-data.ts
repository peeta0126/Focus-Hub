import type { CalendarEvent, Goal, Habit, Note, Project, Task } from "./types";

export const tasks: Task[] = [
  { id: "1", title: "이번 주 스터디 그룹 일정 잡기", status: "todo", priority: "high", category: "몰입", dueDate: "2026-10-04", dueTime: "10:30" },
  { id: "2", title: "타로 프로젝트 관리자 페이지 확인", status: "in_progress", priority: "high", category: "프로젝트", dueDate: "2026-10-04", dueTime: "14:00" },
  { id: "3", title: "정보처리기사 기출 문제 풀기", status: "todo", priority: "medium", category: "시험", dueDate: "2026-10-04", dueTime: "17:00" },
  { id: "4", title: "강의 과제 아이디어 정리", status: "done", priority: "medium", category: "과제", dueDate: "2026-10-04", dueTime: "19:00" },
  { id: "5", title: "Blender 튜토리얼 1개 보기", status: "todo", priority: "low", category: "개인", dueDate: "2026-10-04", dueTime: "21:00" },
];

export const projects: Project[] = [
  { id: "1", title: "별빛 타로", description: "감성 타로 리딩 서비스", thumbnail: "/assets/project-tarot.webp", status: "active", progress: 80, startDate: "2026-08-02", dueDate: "2026-10-20", updatedAt: "오늘" },
  { id: "2", title: "AI 문제 출제 플랫폼", description: "학습 문제 자동 생성 도구", thumbnail: "/assets/project-ai-quiz.webp", status: "active", progress: 60, startDate: "2026-09-01", dueDate: "2026-11-12", updatedAt: "어제" },
  { id: "3", title: "CrewSpace", description: "팀 협업 공간", thumbnail: "/assets/project-crewspace.webp", status: "planning", progress: 40, startDate: "2026-09-17", updatedAt: "3일 전" },
];

export const goals: Goal[] = [
  { id: "1", title: "취업 준비", description: "지원 루틴 완성", category: "커리어", progress: 72, targetDate: "2026-12-31", status: "active", icon: "🚀" },
  { id: "2", title: "포트폴리오 완성", description: "핵심 프로젝트 정리", category: "개발", progress: 64, targetDate: "2026-11-30", status: "active", icon: "🧩" },
  { id: "3", title: "정보처리기사", description: "필기와 실기 합격", category: "학습", progress: 48, targetDate: "2027-01-15", status: "active", icon: "📚" },
  { id: "4", title: "건강 관리", description: "주 4회 운동", category: "건강", progress: 36, targetDate: "2026-12-31", status: "active", icon: "🌿" },
];

export const habits: Habit[] = [
  { id: "1", title: "물 2L 마시기", icon: "💧", frequency: "daily", targetCount: 1, active: true, completedToday: true },
  { id: "2", title: "운동하기", icon: "🏃", frequency: "daily", targetCount: 1, active: true, completedToday: true },
  { id: "3", title: "영어 공부", icon: "🔤", frequency: "daily", targetCount: 1, active: true, completedToday: false },
  { id: "4", title: "CS 학습", icon: "💻", frequency: "daily", targetCount: 1, active: true, completedToday: true },
  { id: "5", title: "독서하기", icon: "📖", frequency: "daily", targetCount: 1, active: true, completedToday: true },
  { id: "6", title: "일찍 자기", icon: "🌙", frequency: "daily", targetCount: 1, active: true, completedToday: false },
];

export const notes: Note[] = [
  { id: "1", title: "아이디어 정리", content: "새로운 프로젝트 아이디어", tags: ["아이디어"], category: "메모", updatedAt: "오늘 20:14" },
  { id: "2", title: "타로 페이지 UI 개선안", content: "카드 인터랙션 개선", tags: ["UI", "타로"], category: "프로젝트", updatedAt: "오늘 18:02" },
  { id: "3", title: "GS 발표 대본 초안", content: "발표 흐름 정리", tags: ["발표"], category: "학교", updatedAt: "어제" },
  { id: "4", title: "면접 예상 질문 정리", content: "기술 면접 질문", tags: ["취업"], category: "커리어", updatedAt: "10월 2일" },
  { id: "5", title: "Blender 단축키 정리", content: "자주 쓰는 단축키", tags: ["Blender"], category: "학습", updatedAt: "9월 29일" },
];

export const events: CalendarEvent[] = [
  { id: "1", title: "수업", date: "2026-10-05", startTime: "10:00", endTime: "12:00", category: "수업" },
  { id: "2", title: "CS 학습", date: "2026-10-05", startTime: "14:00", endTime: "16:00", category: "학습" },
  { id: "3", title: "면접 준비", date: "2026-10-06", startTime: "13:00", endTime: "15:00", category: "커리어" },
  { id: "4", title: "운동", date: "2026-10-06", startTime: "19:00", endTime: "20:00", category: "개인" },
  { id: "5", title: "프로젝트 회의", date: "2026-10-07", startTime: "16:00", endTime: "17:30", category: "프로젝트" },
  { id: "6", title: "알고리즘 스터디", date: "2026-10-09", startTime: "20:00", endTime: "22:00", category: "학습" },
];
