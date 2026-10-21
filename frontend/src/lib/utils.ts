import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const pad = (n: number) => String(n).padStart(2, "0");

// Today's date as "YYYY-MM-DD" in the user's local timezone, for <input type="date" min>.
// (toISOString() is UTC, which would allow yesterday before 8 AM in the Philippines.)
export function todayInputDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Current local time as "YYYY-MM-DDTHH:mm", for <input type="datetime-local" min>.
export function nowInputDateTime(): string {
  const d = new Date();
  return `${todayInputDate()}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Input values in these formats compare correctly as strings.
export function isPastInputValue(value: string, min: string): boolean {
  return Boolean(value) && value < min;
}
