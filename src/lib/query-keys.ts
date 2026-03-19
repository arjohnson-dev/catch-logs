import type { QueryClient } from "@tanstack/react-query";

export const appQueryKeys = {
  entries: () => ["entries"] as const,
  pins: () => ["pins"] as const,
  journalEntrySpeciesPhoto: (specCode: number) =>
    ["journal-entry", "species-photo", specCode] as const,
  supabaseAuthUser: () => ["supabase", "auth", "user"] as const,
  fieldGuideSpeciesList: (search: string) =>
    ["field-guide", "species-list", search] as const,
  fieldGuideEntryFormSpeciesList: (search: string) =>
    ["field-guide", "species-list", "entry-form", search] as const,
  fieldGuideSpeciesDetail: (slugOrSpecCode: string | number | null) =>
    ["field-guide", "species-detail", slugOrSpecCode] as const,
  fieldGuideSpeciesLink: (specCode: number | null) =>
    ["field-guide", "species-link", specCode] as const,
  fieldGuideFavoriteSpecCodes: (userId: string | null) =>
    ["field-guide", "favorite-spec-codes", userId] as const,
  fieldGuideFavoriteSpecies: (userId: string | null) =>
    ["field-guide", "favorite-species", userId] as const,
  fieldGuideSpeciesAiSummary: (slug: string, unitSystem: string) =>
    ["field-guide", "species-ai-summary", slug, unitSystem] as const,
  statsOverview: () => ["stats", "overview"] as const,
  statsSpecies: (species: string) => ["stats", "species", species] as const,
};

export async function invalidateCatchData(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: appQueryKeys.pins() }),
    queryClient.invalidateQueries({ queryKey: appQueryKeys.entries() }),
  ]);
}
