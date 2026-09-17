export type CatchGearSnapshot = {
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

export type CatchGearSummaryItem = {
  label: string;
  value: string;
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

function isNoneValue(value: string | null): value is "None" {
  return value?.toLowerCase() === "none";
}

export function formatCatchGearSummary(input: CatchGearSnapshot): CatchGearSummaryItem[] {
  const parts: CatchGearSummaryItem[] = [];

  const rodLength = normalizeCatchGearText(input.rodLength);
  const rodPower = normalizeCatchGearText(input.rodPower);
  const rodAction = normalizeCatchGearText(input.rodAction);
  const rodDetails = [
    rodLength,
    rodPower ? `${rodPower} power` : null,
    rodAction ? `${rodAction} action` : null,
  ].filter((value): value is string => Boolean(value));
  if (rodDetails.length > 0) {
    parts.push({
      label: "Rod",
      value: rodDetails.join(", "),
    });
  }

  const lineType = normalizeCatchGearText(input.lineType);
  const lineTest = normalizeCatchGearText(input.lineTest);
  const lineDetails = [
    lineTest ? `${lineTest} test` : null,
    lineType,
  ].filter((value): value is string => Boolean(value));
  if (lineDetails.length > 0) {
    parts.push({
      label: "Line",
      value: lineDetails.join(", "),
    });
  }

  const bobberFloat = normalizeCatchGearText(input.bobberFloat);
  if (bobberFloat && !isNoneValue(bobberFloat)) {
    parts.push({
      label: "Float",
      value: bobberFloat,
    });
  }

  const weightOz = normalizeCatchGearText(input.weightOz);
  if (weightOz && weightOz !== "0") {
    parts.push({
      label: "Terminal Weight",
      value: `${weightOz} oz`,
    });
  }

  const leaderMaterial = normalizeCatchGearText(input.leaderMaterial);
  const leaderLength = normalizeCatchGearText(input.leaderLength);
  if (isNoneValue(leaderMaterial) || isNoneValue(leaderLength)) {
    parts.push({
      label: "Leader",
      value: "None",
    });
  } else {
    const leaderDetails = [leaderMaterial, leaderLength].filter(
      (value): value is string => Boolean(value),
    );
    if (leaderDetails.length > 0) {
      parts.push({
        label: "Leader",
        value: leaderDetails.join(", "),
      });
    }
  }

  return parts;
}
