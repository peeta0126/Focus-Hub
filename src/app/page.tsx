import { ActiveProjects } from "@/components/dashboard/ActiveProjects";
import { ClockCard } from "@/components/dashboard/ClockCard";
import { GoalProgress } from "@/components/dashboard/GoalProgress";
import { RecentNotes } from "@/components/dashboard/RecentNotes";
import { TodayGoals } from "@/components/dashboard/TodayGoals";
import { TodayHabits } from "@/components/dashboard/TodayHabits";
import { TodayTasks } from "@/components/dashboard/TodayTasks";
import { WeatherCard } from "@/components/dashboard/WeatherCard";
import { WeeklyCalendar } from "@/components/dashboard/WeeklyCalendar";
import { AssetImage } from "@/components/common/AssetImage";
import { DASHBOARD_ASSETS } from "@/lib/assets";
import { DEFAULT_TIME_ZONE, getLocalDateString, getWeekDateStrings } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent, Goal, Habit, Note, Priority, Project, ProjectStatus, Task, TaskStatus } from "@/lib/types";
import { redirect } from "next/navigation";
import "./dashboard.css";

export default async function DashboardPage() {
  let dashboard: { tasks: Task[]; projects: Project[]; goals: Goal[]; habits: Habit[]; notes: Note[]; events: CalendarEvent[] } = { tasks: [], projects: [], goals: [], habits: [], notes: [], events: [] };
  let timeZone = DEFAULT_TIME_ZONE;
  let weatherLocation = "충주시";
  const supabase = await createClient();

  if (supabase) {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user) {
      if (authError && authError.name !== "AuthSessionMissingError") {
        console.error("Failed to read dashboard user", authError);
      }
      redirect("/login");
    }
    if (authError) console.error("Failed to read dashboard user", authError);
    if (user) {
    const settingsResult = await supabase.from("settings").select("timezone,weather_location").eq("user_id", user.id).maybeSingle();
    if (settingsResult.error) console.error("Failed to load dashboard settings", settingsResult.error);
    timeZone = settingsResult.data?.timezone || DEFAULT_TIME_ZONE;
    weatherLocation = settingsResult.data?.weather_location?.trim() || weatherLocation;
    const today = getLocalDateString(timeZone);
    const week = getWeekDateStrings(today);
    const [tasksResult, projectsResult, goalsResult, habitsResult, recordsResult, notesResult, eventsResult] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id", user.id).neq("status", "done").order("due_date").order("due_time", { nullsFirst: false }).limit(8),
      supabase.from("projects").select("*").eq("user_id", user.id).in("status", ["active", "planning"]).order("updated_at", { ascending: false }).limit(3),
      supabase.from("goals").select("*").eq("user_id", user.id).eq("status", "active").order("updated_at", { ascending: false }).limit(5),
      supabase.from("habits").select("*").eq("user_id", user.id).eq("active", true).limit(6),
      supabase.from("habit_records").select("habit_id,completed").eq("user_id", user.id).eq("date", today),
      supabase.from("notes").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(5),
      supabase.from("events").select("*").eq("user_id", user.id).gte("event_date", week[0]).lte("event_date", week[6]).order("event_date"),
    ]);
    for (const [name, result] of Object.entries({ tasksResult, projectsResult, goalsResult, habitsResult, recordsResult, notesResult, eventsResult })) {
      if (result.error) console.error(`Failed to load dashboard ${name}`, result.error);
    }
    const completed = new Set((recordsResult.data ?? []).filter((row) => row.completed).map((row) => row.habit_id));
    dashboard = {
      tasks: (tasksResult.data ?? []).map((row): Task => ({ id: row.id, title: row.title, description: row.description, status: row.status as TaskStatus, priority: row.priority as Priority, category: row.category, dueDate: row.due_date ?? "", dueTime: row.due_time ?? undefined, projectId: row.project_id ?? undefined })),
      projects: (projectsResult.data ?? []).map((row): Project => ({ id: row.id, title: row.title, description: row.description, thumbnail: row.thumbnail ?? "", status: row.status as ProjectStatus, progress: row.progress, startDate: row.start_date ?? "", dueDate: row.due_date ?? undefined, githubUrl: row.github_url ?? undefined, deployUrl: row.deploy_url ?? undefined, memo: row.memo ?? undefined, updatedAt: new Date(row.updated_at).toLocaleDateString("ko-KR", { timeZone }) })),
      goals: (goalsResult.data ?? []).map((row): Goal => ({ id: row.id, title: row.title, description: row.description, category: row.category, progress: row.progress, targetDate: row.target_date ?? "", status: row.status as Goal["status"], icon: row.icon ?? "◎" })),
      habits: (habitsResult.data ?? []).map((row): Habit => ({ id: row.id, title: row.title, icon: row.icon ?? "✓", frequency: row.frequency as Habit["frequency"], targetCount: row.target_count, active: row.active, completedToday: completed.has(row.id) })),
      notes: (notesResult.data ?? []).map((row): Note => ({ id: row.id, title: row.title, content: row.content, tags: row.tags ?? [], category: row.category, updatedAt: new Date(row.updated_at).toLocaleDateString("ko-KR", { timeZone }) })),
      events: (eventsResult.data ?? []).map((row): CalendarEvent => ({ id: row.id, title: row.title, date: row.event_date, startTime: row.start_time ?? "", endTime: row.end_time ?? "", category: row.category })),
    };
    }
  }

  return <main className="page-wrap">
    <div className="dashboard-intro">
      <div className="intro-art"><AssetImage src={DASHBOARD_ASSETS.hero} alt="달빛이 비치는 아늑한 야간 작업실" sizes="(max-width: 1024px) 100vw, calc(100vw - 224px)" priority /></div>
      <div className="intro-copy"><span className="eyebrow">GOOD EVENING,</span><h1>오늘도 차분하게 시작해볼까요?</h1><p>할 일과 기록을 한눈에 확인하고, 가장 중요한 일에 집중하세요.</p></div>
      <span className="sync-state">● 데이터 준비됨</span>
    </div>
    <div className="dashboard-grid">
      <ClockCard /><WeatherCard location={weatherLocation} /><TodayGoals tasks={dashboard.tasks} /><TodayHabits initial={dashboard.habits} timeZone={timeZone} /><TodayTasks initial={dashboard.tasks} />
      <WeeklyCalendar events={dashboard.events} timeZone={timeZone} /><ActiveProjects projects={dashboard.projects} /><GoalProgress goals={dashboard.goals} /><RecentNotes notes={dashboard.notes} />
    </div>
  </main>;
}
