import { ActiveProjects } from "@/components/dashboard/ActiveProjects";
import { ClockCard } from "@/components/dashboard/ClockCard";
import { GoalProgress } from "@/components/dashboard/GoalProgress";
import { RecentNotes } from "@/components/dashboard/RecentNotes";
import { TodayGoals } from "@/components/dashboard/TodayGoals";
import { TodayHabits } from "@/components/dashboard/TodayHabits";
import { TodayTasks } from "@/components/dashboard/TodayTasks";
import { WeatherCard } from "@/components/dashboard/WeatherCard";
import { WeeklyCalendar } from "@/components/dashboard/WeeklyCalendar";
import { MobileDashboardOverview, MobileQuickActions } from "@/components/dashboard/MobileDashboardOverview";
import { AssetImage } from "@/components/common/AssetImage";
import { DASHBOARD_ASSETS } from "@/lib/assets";
import { addDaysToDateString, DEFAULT_TIME_ZONE, getLocalDateString, getWeekDateStrings, isDueWithinHours } from "@/lib/date";
import { createClient } from "@/lib/supabase/server";
import type { CalendarEvent, DailyGoal, Goal, Habit, Note, Priority, Project, ProjectStatus, Task, TaskStatus } from "@/lib/types";
import { redirect } from "next/navigation";
import "./dashboard.css";

async function measureHomeStep<T>(label: string, operation: () => PromiseLike<T>): Promise<T> {
  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    console.info(`[home-performance] ${label}: ${(performance.now() - startedAt).toFixed(1)} ms`);
  }
}

export default async function DashboardPage() {
  // eslint-disable-next-line react-hooks/purity -- Temporary server-side performance instrumentation.
  const pageStartedAt = performance.now();
  let dashboard: { tasks: Task[]; calendarTasks: Task[]; projects: Project[]; goals: Goal[]; habits: Habit[]; notes: Note[]; events: CalendarEvent[] } = { tasks: [], calendarTasks: [], projects: [], goals: [], habits: [], notes: [], events: [] };
  let dailyGoals: DailyGoal[] = [];
  let urgentTasks: Task[] = [];
  let timeZone = DEFAULT_TIME_ZONE;
  let weatherLocation = "충주시";
  let displayName = "오늘";
  const supabase = await measureHomeStep("create-client", () => createClient());

  if (supabase) {
    const { data: { user }, error: authError } = await measureHomeStep("auth", () => supabase.auth.getUser());
    if (!user) {
      if (authError && authError.name !== "AuthSessionMissingError") {
        console.error("Failed to read dashboard user", authError);
      }
      redirect("/login");
    }
    if (authError) console.error("Failed to read dashboard user", authError);
    if (user) {
    displayName = String(user.user_metadata?.display_name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "오늘");
    const settingsResult = await measureHomeStep("settings", () => supabase.from("settings").select("timezone,weather_location").eq("user_id", user.id).maybeSingle());
    if (settingsResult.error) console.error("Failed to load dashboard settings", settingsResult.error);
    timeZone = settingsResult.data?.timezone || DEFAULT_TIME_ZONE;
    weatherLocation = settingsResult.data?.weather_location?.trim() || weatherLocation;
    const today = getLocalDateString(timeZone);
    const tomorrow = addDaysToDateString(today, 1);
    const week = getWeekDateStrings(today);
    const [tasksResult, calendarTasksResult, urgentTasksResult, dailyGoalsResult, projectsResult, goalsResult, habitsResult, recordsResult, notesResult, eventsResult] = await Promise.all([
      measureHomeStep("tasks", () => supabase.from("tasks").select("*").eq("user_id", user.id).neq("status", "done").order("due_date").order("due_time", { nullsFirst: false }).limit(8)),
      measureHomeStep("calendar-tasks", () => supabase.from("tasks").select("*").eq("user_id", user.id).gte("due_date", week[0]).lte("due_date", week[6]).order("due_date").order("due_time", { nullsFirst: false })),
      measureHomeStep("urgent-tasks", () => supabase.from("tasks").select("*").eq("user_id", user.id).neq("status", "done").gte("due_date", today).lte("due_date", tomorrow).order("due_date").order("due_time", { nullsFirst: false })),
      measureHomeStep("daily-goals", () => supabase.from("daily_goals").select("*").eq("user_id", user.id).eq("goal_date", today).order("created_at")),
      measureHomeStep("projects", () => supabase.from("projects").select("*,tasks(status)").eq("user_id", user.id).in("status", ["active", "planning"]).order("updated_at", { ascending: false }).limit(3)),
      measureHomeStep("goals", () => supabase.from("goals").select("*").eq("user_id", user.id).eq("status", "active").order("updated_at", { ascending: false }).limit(5)),
      measureHomeStep("habits", () => supabase.from("habits").select("*").eq("user_id", user.id).eq("active", true).limit(6)),
      measureHomeStep("habit-records", () => supabase.from("habit_records").select("habit_id,completed").eq("user_id", user.id).eq("date", today)),
      measureHomeStep("notes", () => supabase.from("notes").select("*").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(5)),
      measureHomeStep("planner", () => supabase.from("events").select("*").eq("user_id", user.id).gte("event_date", week[0]).lte("event_date", week[6]).order("event_date")),
    ]);
    for (const [name, result] of Object.entries({ tasksResult, calendarTasksResult, urgentTasksResult, dailyGoalsResult, projectsResult, goalsResult, habitsResult, recordsResult, notesResult, eventsResult })) {
      if (result.error) console.error(`Failed to load dashboard ${name}`, result.error);
    }
    const mapTask = (row: (typeof tasksResult.data extends Array<infer Item> | null ? Item : never)): Task => ({ id: row.id, title: row.title, description: row.description, status: row.status as TaskStatus, priority: row.priority as Priority, category: row.category, dueDate: row.due_date ?? "", dueTime: row.due_time ?? undefined, projectId: row.project_id ?? undefined });
    urgentTasks = (urgentTasksResult.data ?? []).map(mapTask).filter((task) => isDueWithinHours(task.dueDate, task.dueTime, timeZone, 24));
    dailyGoals = (dailyGoalsResult.data ?? []).map((row): DailyGoal => ({ id: row.id, title: row.title, goalDate: row.goal_date, completed: row.completed }));
    const completed = new Set((recordsResult.data ?? []).filter((row) => row.completed).map((row) => row.habit_id));
    dashboard = {
      tasks: (tasksResult.data ?? []).map(mapTask),
      calendarTasks: (calendarTasksResult.data ?? []).map(mapTask),
      projects: (projectsResult.data ?? []).map((row): Project => {
        const linkedTasks = row.tasks ?? [];
        const completedTasks = linkedTasks.filter((task: { status: string }) => task.status === "done").length;
        return { id: row.id, title: row.title, description: row.description, thumbnail: row.thumbnail ?? "", status: row.status as ProjectStatus, progress: linkedTasks.length === 0 ? 0 : Math.round((completedTasks / linkedTasks.length) * 100), startDate: row.start_date ?? "", dueDate: row.due_date ?? undefined, githubUrl: row.github_url ?? undefined, deployUrl: row.deploy_url ?? undefined, memo: row.memo ?? undefined, updatedAt: new Date(row.updated_at).toLocaleDateString("ko-KR", { timeZone }) };
      }),
      goals: (goalsResult.data ?? []).map((row): Goal => ({ id: row.id, title: row.title, description: row.description, category: row.category, progress: row.progress, targetDate: row.target_date ?? "", status: row.status as Goal["status"], icon: row.icon ?? "◎" })),
      habits: (habitsResult.data ?? []).map((row): Habit => ({ id: row.id, title: row.title, icon: row.icon ?? "✓", frequency: row.frequency as Habit["frequency"], targetCount: row.target_count, active: row.active, completedToday: completed.has(row.id) })),
      notes: (notesResult.data ?? []).map((row): Note => ({ id: row.id, title: row.title, content: row.content, tags: row.tags ?? [], category: row.category, updatedAt: new Date(row.updated_at).toLocaleDateString("ko-KR", { timeZone }) })),
      events: (eventsResult.data ?? []).map((row): CalendarEvent => ({ id: row.id, title: row.title, date: row.event_date, startTime: row.start_time ?? "", endTime: row.end_time ?? "", category: row.category, sourceTaskId: row.source_task_id ?? undefined })),
    };
    }
  }

  // eslint-disable-next-line react-hooks/purity -- Temporary server-side performance instrumentation.
  console.info(`[home-performance] page-data-total: ${(performance.now() - pageStartedAt).toFixed(1)} ms`);

  return <main className="page-wrap">
    <div className="dashboard-intro">
      <div className="intro-art"><AssetImage src={DASHBOARD_ASSETS.hero} alt="달빛이 비치는 아늑한 야간 작업실" sizes="(max-width: 1024px) 100vw, calc(100vw - 224px)" priority /></div>
      <div className="intro-copy"><span className="eyebrow">FOCUS HUB</span><h1>좋은 하루예요, <em>{displayName}</em>!</h1><p>오늘의 집중이 더 나은 내일을 만들어요.</p></div>
      <span className="sync-state">● 데이터 준비됨</span>
    </div>
    <MobileDashboardOverview tasks={dashboard.tasks} goals={dailyGoals} habits={dashboard.habits} notes={dashboard.notes} />
    <div className="dashboard-grid">
      <ClockCard /><WeatherCard location={weatherLocation} /><TodayGoals dailyGoals={dailyGoals} urgentTasks={urgentTasks} timeZone={timeZone} /><TodayHabits initial={dashboard.habits} timeZone={timeZone} /><TodayTasks initial={dashboard.tasks} />
      <WeeklyCalendar events={dashboard.events} tasks={dashboard.calendarTasks} timeZone={timeZone} /><ActiveProjects projects={dashboard.projects} /><GoalProgress goals={dashboard.goals} /><RecentNotes notes={dashboard.notes} />
    </div>
    <MobileQuickActions />
  </main>;
}
