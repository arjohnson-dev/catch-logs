export type CatchGearSnapshot = {
  drag?: number | null;
  rodLength?: string | null;
  rodPower?: string | null;
  rodAction?: string | null;
  lineType?: string | null;
  lineTest?: string | null;
  bobberFloat?: string | null;
  weightOz?: string | null;
  leaderMaterial?: string | null;
  leaderLength?: string | null;
};

export const ROD_LENGTH_OPTIONS = ["", "5'6\"", "6'0\"", "6'6\"", "7'0\"", "7'3\"", "7'6\"", "8'0\""] as const;
export const ROD_POWER_OPTIONS = ["", "Ultralight", "Light", "Medium-Light", "Medium", "Medium-Heavy", "Heavy", "Extra-Heavy"] as const;
export const ROD_ACTION_OPTIONS = ["", "Slow", "Moderate", "Moderate-Fast", "Fast", "Extra-Fast"] as const;
export const LINE_TYPE_OPTIONS = ["", "Monofilament", "Fluorocarbon", "Braid", "Copolymer"] as const;
export const LINE_TEST_OPTIONS = ["", "2 lb", "4 lb", "6 lb", "8 lb", "10 lb", "12 lb", "15 lb", "20 lb", "30 lb", "40 lb", "50 lb", "65 lb"] as const;
export const BOBBER_FLOAT_OPTIONS = ["", "None", "Fixed Bobber", "Slip Bobber", "Clip Float", "Pencil Float", "Popping Cork"] as const;
export const LEADER_MATERIAL_OPTIONS = ["", "None", "Fluorocarbon", "Monofilament", "Wire", "Braid"] as const;
export const LEADER_LENGTH_OPTIONS = ["", "None", "6 in", "12 in", "18 in", "24 in", "36 in", "48 in", "60 in"] as const;

export function normalizeCatchGearText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function normalizeCatchGearDrag(value: number | null | undefined): number | null {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  return Math.max(0, Math.min(1, value));
}

export function formatCatchGearSummary(input: CatchGearSnapshot): string[] {
  const parts: string[] = [];

  const rod = [input.rodLength, input.rodPower, input.rodAction]
    .map(normalizeCatchGearText)
    .filter((value): value is string => Boolean(value))
    .join(" ");
  if (rod) parts.push(`Rod ${rod}`);

  const drag = normalizeCatchGearDrag(input.drag);
  if (drag !== null) parts.push(`Drag ${drag.toFixed(2)}`);

  const line = [input.lineType, input.lineTest]
    .map(normalizeCatchGearText)
    .filter((value): value is string => Boolean(value))
    .join(" ");
  if (line) parts.push(`Line ${line}`);

  const bobberFloat = normalizeCatchGearText(input.bobberFloat);
  if (bobberFloat && bobberFloat !== "None") parts.push(`Float ${bobberFloat}`);

  const weightOz = normalizeCatchGearText(input.weightOz);
  if (weightOz && weightOz !== "0") parts.push(`Weight ${weightOz} oz`);

  const leaderMaterial = normalizeCatchGearText(input.leaderMaterial);
  const leaderLength = normalizeCatchGearText(input.leaderLength);
  if (leaderMaterial || leaderLength) {
    const leader = [leaderMaterial, leaderLength]
      .filter((value): value is string => Boolean(value))
      .join(" ");
    if (leader && leader !== "None") parts.push(`Leader ${leader}`);
  }

  return parts;
}
