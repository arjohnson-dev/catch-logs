import { normalizeFishingGearValue } from "@/lib/fishing-gear";
import type { JournalEntry } from "@/types/domain";

export interface JournalEntryFilters {
  sortOrder: "newest" | "oldest";
  startDate: string;
  endDate: string;
  fishType: string;
  lure: string;
  bait: string;
  weather: string;
  minLength: string;
  maxLength: string;
  minWeight: string;
  maxWeight: string;
}

function parseOptionalNumber(value: string) {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  const parsed = Number(normalizedValue);
  return Number.isNaN(parsed) ? null : parsed;
}

export function filterJournalEntries(
  entries: JournalEntry[],
  filters: JournalEntryFilters,
) {
  let filtered = [...entries];

  if (filters.startDate) {
    const start = new Date(filters.startDate);
    start.setHours(0, 0, 0, 0);
    filtered = filtered.filter((entry) => new Date(entry.dateTime) >= start);
  }

  if (filters.endDate) {
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    filtered = filtered.filter((entry) => new Date(entry.dateTime) <= end);
  }

  const fishTypeTerm = filters.fishType.trim().toLowerCase();
  if (fishTypeTerm) {
    filtered = filtered.filter((entry) => entry.fishType.toLowerCase().includes(fishTypeTerm));
  }

  const lureTerm = filters.lure.trim().toLowerCase();
  if (lureTerm) {
    filtered = filtered.filter((entry) =>
      (normalizeFishingGearValue(entry.lure) ?? "").toLowerCase().includes(lureTerm),
    );
  }

  const baitTerm = filters.bait.trim().toLowerCase();
  if (baitTerm) {
    filtered = filtered.filter((entry) =>
      (normalizeFishingGearValue(entry.bait) ?? "").toLowerCase().includes(baitTerm),
    );
  }

  const weatherTerm = filters.weather.trim().toLowerCase();
  if (weatherTerm) {
    filtered = filtered.filter((entry) =>
      (entry.weatherDescription ?? entry.weatherCondition ?? "")
        .toLowerCase()
        .includes(weatherTerm),
    );
  }

  const minLengthValue = parseOptionalNumber(filters.minLength);
  if (minLengthValue !== null) {
    filtered = filtered.filter(
      (entry) =>
        entry.length !== null &&
        entry.length !== undefined &&
        entry.length >= minLengthValue,
    );
  }

  const maxLengthValue = parseOptionalNumber(filters.maxLength);
  if (maxLengthValue !== null) {
    filtered = filtered.filter(
      (entry) =>
        entry.length !== null &&
        entry.length !== undefined &&
        entry.length <= maxLengthValue,
    );
  }

  const minWeightValue = parseOptionalNumber(filters.minWeight);
  if (minWeightValue !== null) {
    filtered = filtered.filter(
      (entry) =>
        entry.weight !== null &&
        entry.weight !== undefined &&
        entry.weight >= minWeightValue,
    );
  }

  const maxWeightValue = parseOptionalNumber(filters.maxWeight);
  if (maxWeightValue !== null) {
    filtered = filtered.filter(
      (entry) =>
        entry.weight !== null &&
        entry.weight !== undefined &&
        entry.weight <= maxWeightValue,
    );
  }

  filtered.sort((left, right) => {
    const leftDate = new Date(left.dateTime).getTime();
    const rightDate = new Date(right.dateTime).getTime();
    return filters.sortOrder === "newest" ? rightDate - leftDate : leftDate - rightDate;
  });

  return filtered;
}
