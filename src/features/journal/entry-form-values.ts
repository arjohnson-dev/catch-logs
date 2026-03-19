import type { JournalEntry } from "@/types/domain";
import type { JournalEntryFormValues } from "@/features/journal/entry-form-schema";

function toLocalDateTimeInputValue(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const localTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localTime.toISOString().slice(0, 16);
}

export function createJournalEntryDefaultValues(input?: {
  defaultLure?: string;
  defaultBait?: string;
}): JournalEntryFormValues {
  return {
    fishType: "",
    length: undefined,
    weight: undefined,
    lure: input?.defaultLure ?? "",
    bait: input?.defaultBait ?? "",
    drag: undefined,
    rodLength: "",
    rodPower: "",
    rodAction: "",
    lineType: "",
    lineTest: "",
    bobberFloat: "",
    weightOz: "",
    leaderMaterial: "",
    leaderLength: "",
    notes: "",
    dateTime: toLocalDateTimeInputValue(new Date()),
  };
}

export function createJournalEntryEditValues(entry: JournalEntry): JournalEntryFormValues {
  return {
    fishType: entry.fishType,
    length: entry.length ?? undefined,
    weight: entry.weight ?? undefined,
    lure: entry.lure ?? "",
    bait: entry.bait ?? "",
    drag: entry.drag ?? undefined,
    rodLength: entry.rodLength ?? "",
    rodPower: entry.rodPower ?? "",
    rodAction: entry.rodAction ?? "",
    lineType: entry.lineType ?? "",
    lineTest: entry.lineTest ?? "",
    bobberFloat: entry.bobberFloat ?? "",
    weightOz: entry.weightOz ?? "",
    leaderMaterial: entry.leaderMaterial ?? "",
    leaderLength: entry.leaderLength ?? "",
    notes: entry.notes ?? "",
    dateTime: toLocalDateTimeInputValue(entry.dateTime),
  };
}
