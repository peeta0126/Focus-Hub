import { getDateRangeStrings, getMonthRange } from "./calendar";

export interface TrackedHabit {
  id: string;
  title: string;
  icon: string;
  frequency: "daily" | "weekly";
  targetCount: number;
  active: boolean;
  createdDate: string;
}

export interface HabitCompletion {
  habitId: string;
  date: string;
  completed: boolean;
}

export interface HabitStatistics {
  completedDays: number;
  achievementRate: number | null;
  currentStreak: number | null;
  longestStreak: number | null;
  targetDays: number;
}

function mondayKey(dateString: string) {
  const date = new Date(`${dateString}T12:00:00Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  return date.toISOString().slice(0, 10);
}

function getEligibleDates(habit: TrackedHabit, monthDate: string, today: string) {
  const range = getMonthRange(monthDate);
  const end = range.end < today ? range.end : today;
  if (end < range.start || end < habit.createdDate) return [];
  const start = habit.createdDate > range.start ? habit.createdDate : range.start;
  return getDateRangeStrings({ start, end });
}

function getCompletedDates(records: HabitCompletion[], habitId: string, start: string, end: string) {
  return new Set(records.filter((record) => record.habitId === habitId && record.completed && record.date >= start && record.date <= end).map((record) => record.date));
}

function getDailyStreaks(eligibleDates: string[], completedDates: Set<string>, today: string) {
  let longest = 0;
  let running = 0;
  for (const date of eligibleDates) {
    if (completedDates.has(date)) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  let current = 0;
  let index = eligibleDates.length - 1;
  if (eligibleDates[index] === today && !completedDates.has(today)) index -= 1;
  for (; index >= 0; index -= 1) {
    if (!completedDates.has(eligibleDates[index])) break;
    current += 1;
  }
  return { current, longest };
}

export function calculateHabitStatistics(habit: TrackedHabit, records: HabitCompletion[], monthDate: string, today: string): HabitStatistics {
  const range = getMonthRange(monthDate);
  const eligibleDates = getEligibleDates(habit, monthDate, today);
  const completedDates = getCompletedDates(records, habit.id, range.start, range.end);
  const eligibleDateSet = new Set(eligibleDates);
  const eligibleCompletions = new Set([...completedDates].filter((date) => eligibleDateSet.has(date)));

  if (habit.frequency === "weekly") {
    const weekCount = new Set(eligibleDates.map(mondayKey)).size;
    const targetDays = weekCount * Math.max(0, habit.targetCount);
    return {
      completedDays: completedDates.size,
      achievementRate: targetDays === 0 ? null : Math.min(100, Math.round((eligibleCompletions.size / targetDays) * 100)),
      currentStreak: null,
      longestStreak: null,
      targetDays,
    };
  }

  const targetDays = eligibleDates.length;
  const streaks = getDailyStreaks(eligibleDates, eligibleCompletions, today);
  return {
    completedDays: completedDates.size,
    achievementRate: targetDays === 0 ? null : Math.min(100, Math.round((eligibleCompletions.size / targetDays) * 100)),
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    targetDays,
  };
}

export function calculateAllHabitStatistics(habits: TrackedHabit[], records: HabitCompletion[], monthDate: string, today: string): HabitStatistics {
  const range = getMonthRange(monthDate);
  const completedDates = new Set(records.filter((record) => record.completed && record.date >= range.start && record.date <= range.end).map((record) => record.date));
  const perHabit = habits.map((habit) => calculateHabitStatistics(habit, records, monthDate, today));
  const targetDays = perHabit.reduce((sum, stats) => sum + stats.targetDays, 0);
  const completions = habits.reduce((sum, habit) => {
    const eligibleDates = new Set(getEligibleDates(habit, monthDate, today));
    const completedForHabit = getCompletedDates(records, habit.id, range.start, range.end);
    return sum + [...completedForHabit].filter((date) => eligibleDates.has(date)).length;
  }, 0);
  return {
    completedDays: completedDates.size,
    achievementRate: targetDays === 0 ? null : Math.min(100, Math.round((completions / targetDays) * 100)),
    currentStreak: null,
    longestStreak: null,
    targetDays,
  };
}
