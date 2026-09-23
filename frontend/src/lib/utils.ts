import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "never";
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return "just now";
  for (const [unit, size] of UNITS) {
    if (seconds >= size) {
      const value = Math.round(seconds / size);
      if (unit === "day" && value > 6) break;
      return RELATIVE.format(-value, unit);
    }
  }
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

export function absoluteTime(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

export const STATUS_TONE: Record<string, "answered" | "unresolved" | "error"> = {
  answered: "answered",
  unresolved: "unresolved",
  error: "error",
};

export const CHANNEL_LABEL: Record<string, string> = {
  preview: "Preview",
  widget: "Widget",
  api: "API",
};
