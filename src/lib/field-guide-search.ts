import type { FishSpeciesDetail, FishSpeciesListItem } from "@/types/field-guide";

type FishSpeciesSearchable = Pick<
  FishSpeciesListItem,
  | "scientificName"
  | "canonicalCommonName"
  | "alternateCommonNames"
  | "searchAliases"
  | "family"
> &
  Partial<Pick<FishSpeciesListItem, "browseTags">>;

export function normalizeSpeciesSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getLevenshteinDistance(left: string, right: string) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    let previousDiagonal = previousRow[0];
    previousRow[0] = leftIndex + 1;

    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const temp = previousRow[rightIndex + 1];
      const substitutionCost = left[leftIndex] === right[rightIndex] ? 0 : 1;

      previousRow[rightIndex + 1] = Math.min(
        previousRow[rightIndex + 1] + 1,
        previousRow[rightIndex] + 1,
        previousDiagonal + substitutionCost,
      );

      previousDiagonal = temp;
    }
  }

  return previousRow[right.length];
}

function getFuzzySpeciesMatchScore(candidate: string, query: string) {
  const normalizedCandidate = normalizeSpeciesSearchText(candidate);
  const normalizedQuery = normalizeSpeciesSearchText(query);

  if (!normalizedCandidate || !normalizedQuery) {
    return 0;
  }

  const candidatePrefix = normalizedCandidate.slice(0, normalizedQuery.length);
  const prefixDistance = getLevenshteinDistance(normalizedQuery, candidatePrefix);
  if (prefixDistance <= 2) {
    return 180 - prefixDistance * 30;
  }

  const candidateWords = normalizedCandidate.split(" ").filter(Boolean);
  for (const word of candidateWords) {
    const wordPrefix = word.slice(0, normalizedQuery.length);
    const wordDistance = getLevenshteinDistance(normalizedQuery, wordPrefix);
    if (wordDistance <= 2) {
      return 150 - wordDistance * 30;
    }
  }

  return 0;
}

export function getSpeciesSearchScore(
  species: FishSpeciesSearchable,
  query: string,
  options: {
    includeTags?: boolean;
    enableFuzzy?: boolean;
  } = {},
) {
  const normalizedQuery = normalizeSpeciesSearchText(query);
  if (!normalizedQuery) return 0;

  const commonName = normalizeSpeciesSearchText(species.canonicalCommonName ?? "");
  const scientificName = normalizeSpeciesSearchText(species.scientificName);
  const aliases = species.searchAliases.map(normalizeSpeciesSearchText);
  const alternateNames = species.alternateCommonNames.map(normalizeSpeciesSearchText);
  const family = normalizeSpeciesSearchText(species.family ?? "");
  const tags = (species.browseTags ?? []).map(normalizeSpeciesSearchText);

  if (commonName === normalizedQuery) return 520;
  if (scientificName === normalizedQuery) return 500;
  if (aliases.includes(normalizedQuery)) return 460;
  if (alternateNames.includes(normalizedQuery)) return 440;
  if (commonName.startsWith(normalizedQuery)) return 360;
  if (scientificName.startsWith(normalizedQuery)) return 340;
  if (aliases.some((value) => value.startsWith(normalizedQuery))) return 320;
  if (alternateNames.some((value) => value.startsWith(normalizedQuery))) return 300;
  if (commonName.includes(normalizedQuery)) return 260;
  if (scientificName.includes(normalizedQuery)) return 240;
  if (aliases.some((value) => value.includes(normalizedQuery))) return 220;
  if (alternateNames.some((value) => value.includes(normalizedQuery))) return 200;
  if (family.includes(normalizedQuery)) return 120;
  if (options.includeTags && tags.some((value) => value.includes(normalizedQuery))) return 80;

  if (!options.enableFuzzy) {
    return 0;
  }

  const fuzzyScores = [
    getFuzzySpeciesMatchScore(species.canonicalCommonName ?? "", normalizedQuery),
    getFuzzySpeciesMatchScore(species.scientificName, normalizedQuery),
    ...species.searchAliases.map((value) => getFuzzySpeciesMatchScore(value, normalizedQuery)),
    ...species.alternateCommonNames.map((value) => getFuzzySpeciesMatchScore(value, normalizedQuery)),
  ];

  return Math.max(0, ...fuzzyScores);
}

export function getSpeciesTitle(species: FishSpeciesListItem | FishSpeciesDetail) {
  return species.canonicalCommonName ?? species.scientificName;
}

export function getSpeciesSortTitle(species: FishSpeciesListItem | FishSpeciesDetail) {
  return getSpeciesTitle(species);
}

export function getSpeciesSubtitle(species: FishSpeciesListItem | FishSpeciesDetail) {
  if (!species.canonicalCommonName) {
    return null;
  }

  return species.scientificName !== species.canonicalCommonName
    ? species.scientificName
    : null;
}
