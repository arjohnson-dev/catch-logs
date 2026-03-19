import {
  normalizeCatchGearDrag,
  normalizeCatchGearText,
} from "@/lib/catch-gear";
import { normalizeFishingGearValue } from "@/lib/fishing-gear";
import type { JournalEntryFormValues } from "@/features/journal/entry-form-schema";

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function normalizeJournalEntrySubmission(data: JournalEntryFormValues) {
  return {
    fishType: data.fishType.trim(),
    length: data.length ?? null,
    weight: data.weight ?? null,
    lure: normalizeFishingGearValue(data.lure),
    bait: normalizeFishingGearValue(data.bait),
    drag: normalizeCatchGearDrag(data.drag),
    rodLength: normalizeCatchGearText(data.rodLength),
    rodPower: normalizeCatchGearText(data.rodPower),
    rodAction: normalizeCatchGearText(data.rodAction),
    lineType: normalizeCatchGearText(data.lineType),
    lineTest: normalizeCatchGearText(data.lineTest),
    bobberFloat: normalizeCatchGearText(data.bobberFloat),
    weightOz: normalizeCatchGearText(data.weightOz),
    leaderMaterial: normalizeCatchGearText(data.leaderMaterial),
    leaderLength: normalizeCatchGearText(data.leaderLength),
    notes: normalizeOptionalText(data.notes),
    dateTime: data.dateTime,
  };
}
