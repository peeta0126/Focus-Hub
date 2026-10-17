import { addDaysToDateString, getWeekDateStrings } from "./date";

export type CalendarView = "week" | "month";

export interface DateRange {
  start: string;
  end: string;
}

function dateParts(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);
  return { year, month, day };
}

export function getMonthStart(dateString: string): string {
  const { year, month } = dateParts(dateString);
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

export function shiftMonth(dateString: string, amount: number): string {
  const { year, month, day } = dateParts(dateString);
  const target = new Date(Date.UTC(year, month - 1 + amount, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  const safeDay = Math.min(day, lastDay);
  return `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

export function getMonthRange(dateString: string): DateRange {
  const start = getMonthStart(dateString);
  const nextMonth = shiftMonth(start, 1);
  return { start, end: addDaysToDateString(nextMonth, -1) };
}

export function getCalendarRange(dateString: string, view: CalendarView): DateRange {
  if (view === "week") {
    const dates = getWeekDateStrings(dateString);
    return { start: dates[0], end: dates[6] };
  }
  const month = getMonthRange(dateString);
  const firstDay = new Date(`${month.start}T12:00:00Z`).getUTCDay();
  const lastDay = new Date(`${month.end}T12:00:00Z`).getUTCDay();
  return {
    start: addDaysToDateString(month.start, -firstDay),
    end: addDaysToDateString(month.end, 6 - lastDay),
  };
}

export function getDateRangeStrings(range: DateRange): string[] {
  const dates: string[] = [];
  for (let date = range.start; date <= range.end; date = addDaysToDateString(date, 1)) dates.push(date);
  return dates;
}

export function countCalendarWeeks(range: DateRange): number {
  return getDateRangeStrings(range).length / 7;
}

export function formatMonthLabel(dateString: string): string {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", timeZone: "UTC" })
    .format(new Date(`${dateString}T12:00:00Z`));
}

export function formatDateLabel(dateString: string): string {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "long", timeZone: "UTC" })
    .format(new Date(`${dateString}T12:00:00Z`));
}
