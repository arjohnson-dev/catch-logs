import { getSpeciesSearchScore, normalizeSpeciesSearchText } from "@/lib/field-guide-search";
import type { JournalEntry } from "@/types/domain";
import type { FishSpeciesListItem } from "@/types/field-guide";

type FishTypeSuggestionMatch = "common" | "alternate-common" | "alias" | "scientific";

export type FishTypeSuggestion = {
  value: string;
  subtitle: string | null;
  source: "bookmark" | "field-guide" | "history";
  score: number;
  matchType?: FishTypeSuggestionMatch;
  specCode?: number;
};

function getSpeciesSuggestionValue(species: FishSpeciesListItem) {
  return species.canonicalCommonName ?? species.scientificName;
}

function getSpeciesSuggestionSubtitle(species: FishSpeciesListItem) {
  if (!species.canonicalCommonName) {
    return species.family;
  }

  const subtitleParts = [species.scientificName, species.family].filter(Boolean);
  return subtitleParts.join(" • ");
}

export function buildFishTypeSuggestions(input: {
  query: string;
  bookmarkedSpecies: FishSpeciesListItem[];
  fieldGuideSpecies: FishSpeciesListItem[];
  allFieldGuideSpecies: FishSpeciesListItem[];
  entries: Array<Pick<JournalEntry, "fishType">>;
}): FishTypeSuggestion[] {
  const normalizedQuery = input.query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const normalizedSearch = normalizeSpeciesSearchText(normalizedQuery);
  const seen = new Set<string>();
  const bookmarkedSpecCodes = new Set(input.bookmarkedSpecies.map((species) => species.specCode));
  const speciesPool = Array.from(
    new Map(
      [
        ...input.bookmarkedSpecies,
        ...input.fieldGuideSpecies,
        ...input.allFieldGuideSpecies,
      ].map((species) => [species.specCode, species]),
    ).values(),
  );

  const speciesMatches = speciesPool
    .map((species) => ({
      species,
      score: getSpeciesSearchScore(species, normalizedQuery, { enableFuzzy: true }),
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return getSpeciesSuggestionValue(left.species).localeCompare(
        getSpeciesSuggestionValue(right.species),
      );
    })
    .flatMap(({ species, score }) => {
      const subtitle = getSpeciesSuggestionSubtitle(species);
      const isBookmarked = bookmarkedSpecCodes.has(species.specCode);
      const candidates = [
        { value: species.canonicalCommonName, matchType: "common" as const, boost: 220 },
        ...species.alternateCommonNames.map((value) => ({
          value,
          matchType: "alternate-common" as const,
          boost: 140,
        })),
        ...species.searchAliases.map((value) => ({
          value,
          matchType: "alias" as const,
          boost: 60,
        })),
        { value: species.scientificName, matchType: "scientific" as const, boost: 20 },
      ].filter(
        (
          candidate,
        ): candidate is {
          value: string;
          matchType: FishTypeSuggestionMatch;
          boost: number;
        } => Boolean(candidate.value && candidate.value.trim().length > 0),
      );

      return candidates.map<FishTypeSuggestion>(({ value, matchType, boost }) => {
        const normalizedValue = normalizeSpeciesSearchText(value);
        const exactBoost = normalizedValue === normalizedSearch ? 80 : 0;
        const startsWithBoost = normalizedValue.startsWith(normalizedSearch) ? 35 : 0;

        return {
          value,
          subtitle,
          source: isBookmarked ? "bookmark" : "field-guide",
          matchType,
          specCode: species.specCode,
          score: score + boost + exactBoost + startsWithBoost + (isBookmarked ? 400 : 0),
        };
      });
    })
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if ((left.matchType ?? "") !== (right.matchType ?? "")) {
        const matchTypeOrder = {
          common: 0,
          "alternate-common": 1,
          alias: 2,
          scientific: 3,
        } as const;

        return (
          (matchTypeOrder[left.matchType ?? "scientific"] ?? 99) -
          (matchTypeOrder[right.matchType ?? "scientific"] ?? 99)
        );
      }

      return left.value.localeCompare(right.value);
    })
    .filter((suggestion) => {
      const key = suggestion.value.toLowerCase();
      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, 8);

  const historicalMatches =
    speciesMatches.length === 0
      ? Array.from(
          new Set(
            input.entries
              .map((entry) => entry.fishType?.trim())
              .filter((fishType): fishType is string => Boolean(fishType && fishType.length > 0)),
          ),
        )
          .filter(
            (fishType) =>
              fishType.toLowerCase().includes(normalizedQuery.toLowerCase()) &&
              !seen.has(fishType.toLowerCase()),
          )
          .slice(0, 8)
          .map<FishTypeSuggestion>((fishType) => ({
            value: fishType,
            subtitle: "Recent entry",
            source: "history",
            score: 0,
          }))
      : [];

  return [...speciesMatches, ...historicalMatches];
}
