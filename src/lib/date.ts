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

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
