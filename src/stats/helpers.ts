import { format } from "date-fns";

const SPECIES_COLORS = [
  "#2563eb",
  "#0ea5e9",
  "#06b6d4",
  "#14b8a6",
  "#10b981",
  "#84cc16",
  "#f59e0b",
  "#f97316",
];

export function getSpeciesColor(species: string, index: number): string {
  let hash = 0;
  for (let i = 0; i < species.length; i += 1) {
    hash = (hash * 31 + species.charCodeAt(i)) >>> 0;
  }
  return SPECIES_COLORS[(hash + index) % SPECIES_COLORS.length];
}

export function formatWeight(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "No weight";
  return `${value.toFixed(1)} lbs`;
}

export function formatLength(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "No length";
  return `${value.toFixed(1)}"`;
}

export function formatStatDate(value: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return format(parsed, "MMM d, yyyy");
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

