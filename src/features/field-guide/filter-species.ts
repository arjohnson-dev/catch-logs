import { matchesWaterType } from "@/features/field-guide/presentation";
import {
  getSpeciesSearchScore,
  getSpeciesSortTitle,
} from "@/lib/field-guide-search";
import type { FishSpeciesListItem } from "@/types/field-guide";

export function filterSpeciesList(input: {
  species: FishSpeciesListItem[];
  waterType: string;
  search: string;
}) {
  const trimmedSearch = input.search.trim();

  return input.species
    .filter((species) => {
      if (!matchesWaterType(species, input.waterType)) {
        return false;
      }

      if (!trimmedSearch) {
        return true;
      }

      return (
        getSpeciesSearchScore(species, trimmedSearch, {
          includeTags: true,
        }) > 0
      );
    })
    .sort((left, right) => {
      if (trimmedSearch) {
        const rightScore = getSpeciesSearchScore(right, trimmedSearch, {
          includeTags: true,
        });
        const leftScore = getSpeciesSearchScore(left, trimmedSearch, {
          includeTags: true,
        });

        if (rightScore !== leftScore) {
          return rightScore - leftScore;
        }
      }

      return getSpeciesSortTitle(left).localeCompare(getSpeciesSortTitle(right));
    });
}
