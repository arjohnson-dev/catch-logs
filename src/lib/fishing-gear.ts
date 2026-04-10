export function normalizeFishingGearValue(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

const FISHING_GEAR_CANONICAL_ALIASES: Record<string, string> = {
  crawlerharness: "Crawler Harness",
  crawelerharness: "Crawler Harness",
  crawlerrharness: "Crawler Harness",
  nightcrawler: "Nightcrawler",
  nightcrawlers: "Nightcrawler",
};

function toFishingGearAliasKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toTitleCaseWords(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function normalizeFishingGearForStorage(
  value: string | null | undefined,
): string | null {
  const normalized = normalizeFishingGearValue(value);
  if (!normalized) {
    return null;
  }

  const aliasKey = toFishingGearAliasKey(normalized);
  const aliased = FISHING_GEAR_CANONICAL_ALIASES[aliasKey];
  if (aliased) {
    return aliased;
  }

  return toTitleCaseWords(normalized);
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
