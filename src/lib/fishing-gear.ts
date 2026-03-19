export function normalizeFishingGearValue(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function formatFishingSetup(input: {
  lure?: string | null;
  bait?: string | null;
}): string | null {
  const lure = normalizeFishingGearValue(input.lure);
  const bait = normalizeFishingGearValue(input.bait);

  if (lure && bait) {
    return `${lure} / ${bait}`;
  }

  return lure ?? bait ?? null;
}
