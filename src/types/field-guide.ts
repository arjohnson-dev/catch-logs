export type FishEnvironment =
  | "freshwater"
  | "marine"
  | "brackish"
  | "mixed"
  | "unknown";

export interface FishSpeciesImage {
  id: string;
  speciesId: number;
  sourceName: string | null;
  sourceUrl: string | null;
  storagePath: string | null;
  externalUrl: string | null;
  licenseType: string | null;
  copyrightHolder: string | null;
  attributionText: string | null;
  altText: string | null;
  widthPx: number | null;
  heightPx: number | null;
  sortOrder: number;
  isPrimary: boolean;
  isAppSafe: boolean;
  status: "pending" | "approved" | "rejected";
  isActive: boolean;
}

export interface FishGuideStructuredSection {
  summary: string | null;
  entries: Array<{
    label: string;
    value: string;
  }>;
}

export interface FishSpeciesListItem {
  specCode: number;
  slug: string;
  scientificName: string;
  canonicalCommonName: string | null;
  alternateCommonNames: string[];
  searchAliases: string[];
  family: string | null;
  genus: string | null;
  speciesEpithet: string | null;
  order: string | null;
  environment: FishEnvironment;
  environmentType: string | null;
  browseTags: string[];
  generalSummary: string | null;
  identificationSummary: string | null;
  habitatSummary: string | null;
  behaviorSummary: string | null;
  dietSummary: string | null;
  distributionSummary: string | null;
  nativeRegionSummary: string | null;
  anglerNotes: string | null;
  maxLengthCm: number | null;
  maxWeightG: number | null;
  imageReference: string | null;
  primaryImage: FishSpeciesImage | null;
  scopeHabitat: string | null;
}

export interface FishSpeciesDetail extends FishSpeciesListItem {
  reproduction: FishGuideStructuredSection;
  spawning: FishGuideStructuredSection;
}
