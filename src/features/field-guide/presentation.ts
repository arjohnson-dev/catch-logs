import {
  formatLength as formatDisplayLength,
  formatMeasurementText,
  formatWeight as formatDisplayWeight,
  type UnitSystem,
} from "@/lib/unit-preferences";
import { normalizeSpeciesSearchText } from "@/lib/field-guide-search";
import type {
  FishEnvironment,
  FishSpeciesDetail,
  FishSpeciesListItem,
} from "@/types/field-guide";

export const FISHBASE_URL = "https://www.fishbase.org";

export const WATER_TYPE_OPTIONS = [
  { value: "all", label: "All water types" },
  { value: "freshwater", label: "Freshwater" },
  { value: "marine", label: "Marine" },
  { value: "brackish", label: "Brackish" },
  { value: "mixed", label: "Mixed water" },
] as const;

export function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

export function titleCaseEnvironment(environment: FishEnvironment) {
  switch (environment) {
    case "freshwater":
      return "Freshwater";
    case "marine":
      return "Marine";
    case "brackish":
      return "Brackish";
    case "mixed":
      return "Mixed Water";
    default:
      return "Unknown";
  }
}

export function formatTagLabel(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getSpeciesSummaryPreview(species: FishSpeciesListItem | FishSpeciesDetail) {
  return (
    species.identificationSummary ??
    species.habitatSummary ??
    species.behaviorSummary ??
    species.anglerNotes ??
    species.distributionSummary
  );
}

export function formatSummaryText(value: string | null, unitSystem: UnitSystem) {
  if (!value) {
    return null;
  }

  return formatMeasurementText(value, unitSystem);
}

export function getHabitatHint(species: FishSpeciesListItem) {
  return species.scopeHabitat ?? species.environmentType ?? species.distributionSummary;
}

function normalizeComparableText(value: string | null) {
  return normalizeSpeciesSearchText(value ?? "");
}

export function shouldRenderSection(primary: string | null, compareAgainst?: string | null) {
  if (!primary) {
    return false;
  }

  if (!compareAgainst) {
    return true;
  }

  return normalizeComparableText(primary) !== normalizeComparableText(compareAgainst);
}

export function matchesWaterType(species: FishSpeciesListItem, waterType: string) {
  if (waterType === "all") {
    return true;
  }

  if (waterType === "freshwater") {
    return species.environment === "freshwater";
  }

  return species.environment === waterType;
}

export function renderLength(valueCm: number | null, unitSystem: UnitSystem) {
  if (!valueCm) {
    return null;
  }

  return formatDisplayLength(valueCm, unitSystem);
}

export function renderWeight(valueG: number | null, unitSystem: UnitSystem) {
  if (!valueG) {
    return null;
  }

  return formatDisplayWeight(valueG, unitSystem);
}
