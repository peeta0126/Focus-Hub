export const DEFAULT_TIME_ZONE = "Asia/Seoul";

export function emptyStringToNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized === "" ? null : normalized;
}

export function getDateStringInTimeZone(
  date: Date = new Date(),
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: DEFAULT_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  }

  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getLocalDateString(
  timeZone: string = DEFAULT_TIME_ZONE,
  date: Date = new Date(),
): string {
  return getDateStringInTimeZone(date, timeZone);
}

export function addDaysToDateString(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

export function getWeekDateStrings(
  dateString: string = getLocalDateString(),
): string[] {
  const [year, month, day] = dateString.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  const monday = addDaysToDateString(dateString, -daysSinceMonday);
  return Array.from({ length: 7 }, (_, index) => addDaysToDateString(monday, index));
}

function getDateTimePartsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter(({ type }) => type !== "literal")
      .map(({ type, value }) => [type, Number(value)]),
  ) as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
}

export function getTaskDueDateTime(
  dueDate: string,
  dueTime: string | undefined,
  timeZone: string = DEFAULT_TIME_ZONE,
): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dueDate);
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(dueTime || "23:59:59");
  if (!dateMatch || !timeMatch) return null;

  const [, yearText, monthText, dayText] = dateMatch;
  const [, hourText, minuteText, secondText = "0"] = timeMatch;
  const target = Date.UTC(Number(yearText), Number(monthText) - 1, Number(dayText), Number(hourText), Number(minuteText), Number(secondText));
  const targetDate = new Date(target);
  if (
    targetDate.getUTCFullYear() !== Number(yearText)
    || targetDate.getUTCMonth() !== Number(monthText) - 1
    || targetDate.getUTCDate() !== Number(dayText)
    || targetDate.getUTCHours() !== Number(hourText)
    || targetDate.getUTCMinutes() !== Number(minuteText)
  ) return null;

  let resolvedTimeZone = timeZone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: resolvedTimeZone }).format(targetDate);
  } catch {
    resolvedTimeZone = DEFAULT_TIME_ZONE;
  }

  let instant = target;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = getDateTimePartsInTimeZone(new Date(instant), resolvedTimeZone);
    const representedAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    instant += target - representedAsUtc;
  }
  return new Date(instant);
}

export function isDueWithinHours(
  dueDate: string,
  dueTime: string | undefined,
  timeZone: string,
  hours: number,
  now: Date = new Date(),
): boolean {
  const dueAt = getTaskDueDateTime(dueDate, dueTime, timeZone);
  if (!dueAt || hours <= 0) return false;
  const remaining = dueAt.getTime() - now.getTime();
  return remaining > 0 && remaining < hours * 60 * 60 * 1000;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
