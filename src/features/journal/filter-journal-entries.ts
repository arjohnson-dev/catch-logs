import { normalizeCatchGearText } from "@/lib/catch-gear";
import { normalizeFishingGearValue } from "@/lib/fishing-gear";
import type { JournalEntry } from "@/types/domain";

export type JournalSortOrder =
  | "newest"
  | "oldest"
  | "length-asc"
  | "length-desc"
  | "weight-asc"
  | "weight-desc";

export interface JournalEntryFilters {
  sortOrder: JournalSortOrder;
  startDate: string;
  endDate: string;
  fishType: string[];
  lure: string[];
  bait: string[];
  rod: string[];
  line: string[];
  float: string[];
  leader: string[];
  minLength: string;
  maxLength: string;
  minWeight: string;
  maxWeight: string;
}

export function buildRodFilterValue(
  entry: Pick<JournalEntry, "rodLength" | "rodPower" | "rodAction">,
) {
  return [entry.rodLength, entry.rodPower, entry.rodAction]
    .map(normalizeCatchGearText)
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

export function buildLineFilterValue(
  entry: Pick<JournalEntry, "lineType" | "lineTest">,
) {
  return [entry.lineType, entry.lineTest]
    .map(normalizeCatchGearText)
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

export function buildFloatFilterValue(
  entry: Pick<JournalEntry, "bobberFloat">,
) {
  const floatValue = normalizeCatchGearText(entry.bobberFloat);
  return floatValue === "None" ? "" : (floatValue ?? "");
}

export function buildLeaderFilterValue(
  entry: Pick<JournalEntry, "leaderMaterial" | "leaderLength">,
) {
  const leader = [entry.leaderMaterial, entry.leaderLength]
    .map(normalizeCatchGearText)
    .filter((value): value is string => Boolean(value))
    .join(" ");

  return leader === "None" ? "" : leader;
}

function parseOptionalNumber(value: string) {
  const normalizedValue = value.trim();
  if (!normalizedValue) {
    return null;
  }

  const parsed = Number(normalizedValue);
  return Number.isNaN(parsed) ? null : parsed;
}

function compareOptionalNumber(
  leftValue: number | null | undefined,
  rightValue: number | null | undefined,
  direction: "asc" | "desc",
) {
  const leftMissing = leftValue === null || leftValue === undefined;
  const rightMissing = rightValue === null || rightValue === undefined;

  if (leftMissing && rightMissing) {
    return 0;
  }

  if (leftMissing) {
    return 1;
  }

  if (rightMissing) {
    return -1;
  }

  return direction === "asc" ? leftValue - rightValue : rightValue - leftValue;
}

function normalizeSelectedValues(values: string[]) {
  return new Set(
    values
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0),
  );
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

  const fishTypeTerms = normalizeSelectedValues(filters.fishType);
  if (fishTypeTerms.size > 0) {
    filtered = filtered.filter((entry) =>
      fishTypeTerms.has(entry.fishType.trim().toLowerCase()),
    );
  }

  const lureTerms = normalizeSelectedValues(filters.lure);
  if (lureTerms.size > 0) {
    filtered = filtered.filter((entry) =>
      lureTerms.has(
        (normalizeFishingGearValue(entry.lure) ?? "").toLowerCase(),
      ),
    );
  }

  const baitTerms = normalizeSelectedValues(filters.bait);
  if (baitTerms.size > 0) {
    filtered = filtered.filter((entry) =>
      baitTerms.has(
        (normalizeFishingGearValue(entry.bait) ?? "").toLowerCase(),
      ),
    );
  }

  const rodTerms = normalizeSelectedValues(filters.rod);
  if (rodTerms.size > 0) {
    filtered = filtered.filter((entry) =>
      rodTerms.has(buildRodFilterValue(entry).toLowerCase()),
    );
  }

  const lineTerms = normalizeSelectedValues(filters.line);
  if (lineTerms.size > 0) {
    filtered = filtered.filter((entry) =>
      lineTerms.has(buildLineFilterValue(entry).toLowerCase()),
    );
  }

  const floatTerms = normalizeSelectedValues(filters.float);
  if (floatTerms.size > 0) {
    filtered = filtered.filter((entry) =>
      floatTerms.has(buildFloatFilterValue(entry).toLowerCase()),
    );
  }

  const leaderTerms = normalizeSelectedValues(filters.leader);
  if (leaderTerms.size > 0) {
    filtered = filtered.filter((entry) =>
      leaderTerms.has(buildLeaderFilterValue(entry).toLowerCase()),
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
    switch (filters.sortOrder) {
      case "newest": {
        const leftDate = new Date(left.dateTime).getTime();
        const rightDate = new Date(right.dateTime).getTime();
        return rightDate - leftDate;
      }
      case "oldest": {
        const leftDate = new Date(left.dateTime).getTime();
        const rightDate = new Date(right.dateTime).getTime();
        return leftDate - rightDate;
      }
      case "length-asc":
        return compareOptionalNumber(left.length, right.length, "asc");
      case "length-desc":
        return compareOptionalNumber(left.length, right.length, "desc");
      case "weight-asc":
        return compareOptionalNumber(left.weight, right.weight, "asc");
      case "weight-desc":
        return compareOptionalNumber(left.weight, right.weight, "desc");
      default:
        return 0;
    }
  });

  return filtered;
}
