import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  FaArrowLeft,
  FaBookmark,
  FaFishFins,
  FaMagnifyingGlass,
  FaRegBookmark,
  FaTriangleExclamation,
  FaWater,
} from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ImageAttribution } from "@/components/image-attribution";
import { SpeciesImage } from "@/components/species-image";
import { useUnitPreference } from "@/hooks/use-unit-preference";
import {
  favoriteSpecies,
  getFieldGuideSpeciesDetail,
  getMyFavoriteSpecies,
  getMyFavoriteSpecCodes,
  getFieldGuideSpeciesList,
  unfavoriteSpecies,
} from "@/lib/field-guide";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  formatLength as formatDisplayLength,
  formatMeasurementText,
  formatWeight as formatDisplayWeight,
  type UnitSystem,
} from "@/lib/unit-preferences";
import type {
  FishEnvironment,
  FishGuideStructuredSection,
  FishSpeciesDetail,
  FishSpeciesListItem,
} from "@/types/field-guide";

const FISHBASE_URL = "https://www.fishbase.org";
const WATER_TYPE_OPTIONS = [
  { value: "all", label: "All water types" },
  { value: "freshwater", label: "Freshwater" },
  { value: "marine", label: "Marine" },
  { value: "brackish", label: "Brackish" },
  { value: "mixed", label: "Mixed water" },
] as const;

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSpeciesTitle(species: FishSpeciesListItem | FishSpeciesDetail) {
  return species.canonicalCommonName ?? species.scientificName;
}

function getSpeciesSortTitle(species: FishSpeciesListItem | FishSpeciesDetail) {
  return species.canonicalCommonName ?? species.scientificName;
}

function getSpeciesSubtitle(species: FishSpeciesListItem | FishSpeciesDetail) {
  if (!species.canonicalCommonName) {
    return null;
  }

  return species.scientificName !== species.canonicalCommonName
    ? species.scientificName
    : null;
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function titleCaseEnvironment(environment: FishEnvironment) {
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

function formatTagLabel(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getSpeciesSummaryPreview(species: FishSpeciesListItem) {
  return (
    species.generalSummary ??
    species.habitatSummary ??
    species.identificationSummary ??
    species.behaviorSummary ??
    species.anglerNotes ??
    species.distributionSummary
  );
}

function formatSummaryText(value: string | null, unitSystem: UnitSystem) {
  if (!value) {
    return null;
  }

  return formatMeasurementText(value, unitSystem);
}

function getHabitatHint(species: FishSpeciesListItem) {
  return (
    species.scopeHabitat ??
    species.environmentType ??
    species.distributionSummary
  );
}

function normalizeComparableText(value: string | null) {
  return normalizeText(value ?? "");
}

function shouldRenderSection(primary: string | null, compareAgainst?: string | null) {
  if (!primary) {
    return false;
  }

  if (!compareAgainst) {
    return true;
  }

  return normalizeComparableText(primary) !== normalizeComparableText(compareAgainst);
}

function scoreSpecies(species: FishSpeciesListItem, query: string) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) return 0;

  const commonName = normalizeText(species.canonicalCommonName ?? "");
  const scientificName = normalizeText(species.scientificName);
  const aliases = species.searchAliases.map(normalizeText);
  const alternateNames = species.alternateCommonNames.map(normalizeText);
  const family = normalizeText(species.family ?? "");
  const tags = species.browseTags.map(normalizeText);

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
  if (tags.some((value) => value.includes(normalizedQuery))) return 80;

  return 0;
}

function matchesWaterType(species: FishSpeciesListItem, waterType: string) {
  if (waterType === "all") {
    return true;
  }

  if (waterType === "freshwater") {
    return species.environment === "freshwater";
  }

  return species.environment === waterType;
}

function getRouteParams(pathname: string) {
  const normalizedPath = pathname.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  const isFavoritesRoute = normalizedPath === "/resources/field-guide/favorites";
  const detailMatch = normalizedPath.match(/^\/resources\/field-guide\/(.+)$/);

  if (!detailMatch || isFavoritesRoute) {
    return {
      isFavoritesRoute,
      detailSlug: null,
      detailSpecCode: null,
    };
  }

  const routeValue = decodeURIComponent(detailMatch[1]);
  const numericSpecCode = Number.parseInt(routeValue, 10);

  return {
    isFavoritesRoute,
    detailSlug: routeValue,
    detailSpecCode: Number.isNaN(numericSpecCode) ? null : numericSpecCode,
  };
}

function Attribution() {
  return (
    <p className="resources-attribution">
      Species data provided by{" "}
      <a href={FISHBASE_URL} target="_blank" rel="noreferrer" className="text-link">
        FishBase
      </a>
      .
    </p>
  );
}

function ResourceSpeciesCard({
  species,
  isFavorite,
  onOpen,
  onToggleFavorite,
}: {
  species: FishSpeciesListItem;
  isFavorite: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
}) {
  const { unitSystem } = useUnitPreference();
  const habitatHint = formatSummaryText(getHabitatHint(species), unitSystem);
  const summaryPreview = formatSummaryText(getSpeciesSummaryPreview(species), unitSystem);

  return (
    <Card className="resources-card resources-result-card surface-card surface-card-hover">
      <CardContent className="p-0">
        <div className="resources-result-media">
          <SpeciesImage
            image={species.primaryImage}
            commonName={species.canonicalCommonName}
            scientificName={species.scientificName}
            className="species-image-shell species-image-shell-card"
            imgClassName="species-image-media"
            fallbackClassName="species-image-fallback species-image-fallback-card"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="resources-favorite-button resources-favorite-button-overlay"
            onClick={onToggleFavorite}
            aria-label={isFavorite ? "Remove bookmark" : "Add bookmark"}
            title={isFavorite ? "Remove bookmark" : "Add bookmark"}
          >
            {isFavorite ? <FaBookmark size={18} /> : <FaRegBookmark size={18} />}
          </Button>
        </div>
        <button
          type="button"
          className="resources-result-main resources-result-main-stacked"
          onClick={onOpen}
          aria-label={`Open ${getSpeciesTitle(species)}`}
        >
          <div className="resources-result-copy">
            <div className="resources-result-heading">
              <h2 className="resources-result-title">{getSpeciesTitle(species)}</h2>
              <span className="resources-pill resources-pill-environment">
                {titleCaseEnvironment(species.environment)}
              </span>
            </div>
            {getSpeciesSubtitle(species) && (
              <p className="resources-result-scientific">{getSpeciesSubtitle(species)}</p>
            )}
            <p className="resources-result-meta">{species.family ?? "Family unavailable"}</p>
            {species.browseTags.length > 0 && (
              <div className="resources-pill-row">
                {species.browseTags.slice(0, 3).map((tag) => (
                  <span key={tag} className="resources-pill">
                    {formatTagLabel(tag)}
                  </span>
                ))}
              </div>
            )}
            {habitatHint && (
              <p className="resources-result-meta">{truncateText(habitatHint, 120)}</p>
            )}
            {species.alternateCommonNames.length > 0 && (
              <div className="resources-result-aliases">
                <p className="resources-result-alias-label">Also known as</p>
                <div className="resources-pill-row">
                  {species.alternateCommonNames.slice(0, 4).map((name) => (
                    <span key={name} className="resources-pill">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {summaryPreview && (
              <p className="resources-result-summary">
                {truncateText(summaryPreview, 180)}
              </p>
            )}
          </div>
        </button>
      </CardContent>
    </Card>
  );
}

function SpeciesSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="resources-card surface-card">
      <CardHeader className="pb-3">
        <CardTitle className="resources-section-title">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function StructuredSection({
  title,
  data,
}: {
  title: string;
  data: FishGuideStructuredSection;
}) {
  if (!data.summary && data.entries.length === 0) {
    return null;
  }

  return (
    <SpeciesSection title={title}>
      <div className="resources-detail-list">
        {data.summary && <p>{data.summary}</p>}
        {data.entries.map((entry) => (
          <p key={`${entry.label}-${entry.value}`}>
            <strong>{entry.label}:</strong> {entry.value}
          </p>
        ))}
      </div>
    </SpeciesSection>
  );
}

function renderLength(valueCm: number | null, unitSystem: UnitSystem) {
  if (!valueCm) {
    return null;
  }

  return formatDisplayLength(valueCm, unitSystem);
}

function renderWeight(valueG: number | null, unitSystem: UnitSystem) {
  if (!valueG) {
    return null;
  }

  return formatDisplayWeight(valueG, unitSystem);
}

function DetailHeader({
  species,
  isFavorite,
  onToggleFavorite,
}: {
  species: FishSpeciesDetail;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  return (
    <Card className="resources-card resources-hero-card surface-card">
      <SpeciesImage
        image={species.primaryImage}
        commonName={species.canonicalCommonName}
        scientificName={species.scientificName}
        className="species-image-shell species-image-shell-hero"
        imgClassName="species-image-media"
        fallbackClassName="species-image-fallback species-image-fallback-hero"
        priority
      />
      <CardContent className="resources-species-hero resources-species-hero-body">
        <div className="resources-species-copy">
          <div className="resources-species-title-row">
            <div>
              <p className="resources-eyebrow">Species Profile</p>
              <h2 className="resources-species-title">{getSpeciesTitle(species)}</h2>
              <p className="resources-species-scientific">{species.scientificName}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="btn-outline-muted resources-save-button"
              onClick={onToggleFavorite}
            >
              {isFavorite ? <FaBookmark size={16} /> : <FaRegBookmark size={16} />}
              {isFavorite ? "Bookmarked" : "Bookmark"}
            </Button>
          </div>
          <div className="resources-pill-row">
            <span className="resources-pill resources-pill-environment">
              <FaWater size={12} />
              {titleCaseEnvironment(species.environment)}
            </span>
            {species.scopeHabitat && <span className="resources-pill">{species.scopeHabitat}</span>}
            {species.browseTags.map((tag) => (
              <span key={tag} className="resources-pill">
              {formatTagLabel(tag)}
              </span>
            ))}
          </div>
          <ImageAttribution image={species.primaryImage} />
        </div>
      </CardContent>
    </Card>
  );
}

function SpeciesDetailPage({
  species,
  isFavorite,
  onToggleFavorite,
}: {
  species: FishSpeciesDetail;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const { unitSystem } = useUnitPreference();
  const hasDistributionSection = Boolean(
    species.scopeHabitat || species.distributionSummary || species.nativeRegionSummary,
  );
  const hasMeasurementSection = Boolean(species.maxLengthCm || species.maxWeightG);
  const hasQuickFactsSection = Boolean(
    species.environmentType ||
      species.scopeHabitat ||
      species.family ||
      species.order ||
      species.maxLengthCm ||
      species.maxWeightG,
  );
  const showIdentificationSection = shouldRenderSection(
    species.identificationSummary,
    species.habitatSummary,
  );
  const showHabitatSection = shouldRenderSection(
    species.habitatSummary,
    species.identificationSummary,
  );
  const showBehaviorSection = shouldRenderSection(
    species.behaviorSummary,
    species.generalSummary,
  );
  const showDietSection = shouldRenderSection(species.dietSummary);
  const generalSummary = formatSummaryText(species.generalSummary, unitSystem);
  const distributionSummary = formatSummaryText(species.distributionSummary, unitSystem);
  const nativeRegionSummary = formatSummaryText(species.nativeRegionSummary, unitSystem);
  const identificationSummary = formatSummaryText(species.identificationSummary, unitSystem);
  const habitatSummary = formatSummaryText(species.habitatSummary, unitSystem);
  const behaviorSummary = formatSummaryText(species.behaviorSummary, unitSystem);
  const dietSummary = formatSummaryText(species.dietSummary, unitSystem);
  const anglerNotes = formatSummaryText(species.anglerNotes, unitSystem);

  return (
    <div className="page-scroll">
      <div className="page-content resources-page-content">
        <div className="page-header">
          <Link to="/resources">
            <Button variant="ghost" size="sm" className="legal-back-button">
              <FaArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="page-title">Field Guide</h1>
        </div>

        <div className="resources-stack">
          <DetailHeader
            species={species}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
          />

          <SpeciesSection title="Overview">
            <div className="resources-detail-list">
              <p>
                <strong>Common name:</strong> {species.canonicalCommonName ?? "Not available"}
              </p>
              <p>
                <strong>Scientific name:</strong> {species.scientificName}
              </p>
              {species.family && (
                <p>
                  <strong>Family:</strong> {species.family}
                </p>
              )}
              {species.genus && (
                <p>
                  <strong>Genus:</strong> {species.genus}
                </p>
              )}
              {species.speciesEpithet && (
                <p>
                  <strong>Species:</strong> {species.speciesEpithet}
                </p>
              )}
              {species.order && (
                <p>
                  <strong>Order:</strong> {species.order}
                </p>
              )}
              <p>
                <strong>Environment:</strong> {titleCaseEnvironment(species.environment)}
              </p>
            </div>
          </SpeciesSection>

          {hasQuickFactsSection && (
            <SpeciesSection title="Quick Facts">
              <div className="resources-detail-list">
                {species.environmentType && (
                  <p>
                    <strong>Environment:</strong> {species.environmentType}
                  </p>
                )}
                {species.scopeHabitat && (
                  <p>
                    <strong>Habitat:</strong> {species.scopeHabitat}
                  </p>
                )}
                {species.family && (
                  <p>
                    <strong>Family:</strong> {species.family}
                  </p>
                )}
                {species.order && (
                  <p>
                    <strong>Order:</strong> {species.order}
                  </p>
                )}
                {species.maxLengthCm && (
                  <p>
                    <strong>Maximum length:</strong> {renderLength(species.maxLengthCm, unitSystem)}
                  </p>
                )}
                {species.maxWeightG && (
                  <p>
                    <strong>Maximum weight:</strong> {renderWeight(species.maxWeightG, unitSystem)}
                  </p>
                )}
              </div>
            </SpeciesSection>
          )}

          {generalSummary && (
            <SpeciesSection title="General Summary">
              <div className="resources-detail-list">
                <p>{generalSummary}</p>
              </div>
            </SpeciesSection>
          )}

          {hasDistributionSection && (
            <SpeciesSection title="Distribution">
              <div className="resources-detail-list">
                {species.scopeHabitat && (
                  <p>
                    <strong>Habitat:</strong> {species.scopeHabitat}
                  </p>
                )}
                {distributionSummary && (
                  <p>
                    <strong>Distribution:</strong> {distributionSummary}
                  </p>
                )}
                {nativeRegionSummary && (
                  <p>
                    <strong>Native region:</strong> {nativeRegionSummary}
                  </p>
                )}
              </div>
            </SpeciesSection>
          )}

          {showIdentificationSection && (
            <SpeciesSection title="Identification">
              <div className="resources-detail-list">
                <p>{identificationSummary}</p>
              </div>
            </SpeciesSection>
          )}

          {showHabitatSection && (
            <SpeciesSection title="Habitat">
              <div className="resources-detail-list">
                <p>{habitatSummary}</p>
              </div>
            </SpeciesSection>
          )}

          {showBehaviorSection && (
            <SpeciesSection title="Behavior">
              <div className="resources-detail-list">
                <p>{behaviorSummary}</p>
              </div>
            </SpeciesSection>
          )}

          {showDietSection && (
            <SpeciesSection title="Diet">
              <div className="resources-detail-list">
                <p>{dietSummary}</p>
              </div>
            </SpeciesSection>
          )}

          {hasMeasurementSection && (
            <SpeciesSection title="Size & Weight">
              <div className="resources-detail-list">
                {species.maxLengthCm && (
                  <p>
                    <strong>Maximum length:</strong> {renderLength(species.maxLengthCm, unitSystem)}
                  </p>
                )}
                {species.maxWeightG && (
                  <p>
                    <strong>Maximum weight:</strong> {renderWeight(species.maxWeightG, unitSystem)}
                  </p>
                )}
              </div>
            </SpeciesSection>
          )}

          <StructuredSection title="Reproduction" data={species.reproduction} />
          <StructuredSection title="Spawning" data={species.spawning} />

          {anglerNotes && (
            <SpeciesSection title="Angler Notes">
              <div className="resources-detail-list">
                <p>{anglerNotes}</p>
              </div>
            </SpeciesSection>
          )}

          <Card className="resources-card surface-card">
            <CardContent className="resources-footer-card">
              <Attribution />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function FieldGuide() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedWaterType, setSelectedWaterType] = useState<string>("all");
  const { isFavoritesRoute, detailSlug, detailSpecCode } = getRouteParams(location);
  const trimmedSearch = search.trim();
  const favoriteQueryKey = ["field-guide", "favorite-spec-codes", user?.id ?? null] as const;
  const favoriteSpeciesQueryKey = ["field-guide", "favorite-species", user?.id ?? null] as const;

  const speciesListQuery = useQuery({
    queryKey: ["field-guide", "species-list", trimmedSearch],
    queryFn: () =>
      getFieldGuideSpeciesList({
        search: trimmedSearch,
      }),
  });

  const speciesDetailQuery = useQuery({
    queryKey: ["field-guide", "species-detail", detailSlug ?? detailSpecCode],
    queryFn: () =>
      getFieldGuideSpeciesDetail({
        slug: detailSlug,
        specCode: detailSpecCode,
      }),
    enabled: detailSlug !== null || detailSpecCode !== null,
  });

  const favoriteSpecCodesQuery = useQuery({
    queryKey: favoriteQueryKey,
    queryFn: getMyFavoriteSpecCodes,
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 5,
  });

  const favoriteSpeciesListQuery = useQuery({
    queryKey: favoriteSpeciesQueryKey,
    queryFn: getMyFavoriteSpecies,
    enabled: Boolean(user?.id) && isFavoritesRoute,
  });

  const favoriteSpecCodes = favoriteSpecCodesQuery.data ?? [];
  const favoriteSet = useMemo(() => new Set(favoriteSpecCodes), [favoriteSpecCodes]);
  const species = speciesListQuery.data ?? [];

  const toggleBookmarkMutation = useMutation({
    mutationFn: async (input: { specCode: number; isBookmarked: boolean }) => {
      if (input.isBookmarked) {
        await unfavoriteSpecies(input.specCode);
      } else {
        await favoriteSpecies(input.specCode);
      }
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: favoriteQueryKey });
      await queryClient.cancelQueries({ queryKey: favoriteSpeciesQueryKey });

      const previousCodes =
        queryClient.getQueryData<number[]>(favoriteQueryKey) ?? [];
      const previousSpecies =
        queryClient.getQueryData<FishSpeciesListItem[]>(favoriteSpeciesQueryKey) ?? [];

      const nextCodes = input.isBookmarked
        ? previousCodes.filter((value) => value !== input.specCode)
        : [...new Set([...previousCodes, input.specCode])];

      queryClient.setQueryData(favoriteQueryKey, nextCodes);

      if (input.isBookmarked) {
        queryClient.setQueryData(
          favoriteSpeciesQueryKey,
          previousSpecies.filter((item) => item.specCode !== input.specCode),
        );
      } else {
        const speciesToInsert =
          species.find((item) => item.specCode === input.specCode) ??
          (speciesDetailQuery.data?.specCode === input.specCode ? speciesDetailQuery.data : null);

        if (speciesToInsert && !previousSpecies.some((item) => item.specCode === input.specCode)) {
          queryClient.setQueryData(
            favoriteSpeciesQueryKey,
            [...previousSpecies, speciesToInsert].sort((left, right) =>
              getSpeciesSortTitle(left).localeCompare(getSpeciesSortTitle(right)),
            ),
          );
        }
      }

      return { previousCodes, previousSpecies };
    },
    onError: (_error, _input, context) => {
      if (context?.previousCodes) {
        queryClient.setQueryData(favoriteQueryKey, context.previousCodes);
      }
      if (context?.previousSpecies) {
        queryClient.setQueryData(favoriteSpeciesQueryKey, context.previousSpecies);
      }
      toast({
        title: "Bookmark update failed",
        description: "Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: favoriteQueryKey });
      queryClient.invalidateQueries({ queryKey: favoriteSpeciesQueryKey });
    },
  });

  const toggleFavorite = (specCode: number) => {
    if (!user?.id) {
      toast({
        title: "Sign in required",
        description: "Bookmarks are available for signed-in users.",
        variant: "destructive",
      });
      return;
    }

    toggleBookmarkMutation.mutate({
      specCode,
      isBookmarked: favoriteSet.has(specCode),
    });
  };

  const filteredSpecies = useMemo(() => {
    return species
      .filter((item) => {
        if (!matchesWaterType(item, selectedWaterType)) {
          return false;
        }

        if (!trimmedSearch) {
          return true;
        }

        return scoreSpecies(item, trimmedSearch) > 0;
      })
      .sort((left, right) => {
        if (trimmedSearch) {
          const rightScore = scoreSpecies(right, trimmedSearch);
          const leftScore = scoreSpecies(left, trimmedSearch);
          if (rightScore !== leftScore) {
            return rightScore - leftScore;
          }
        }

        return getSpeciesSortTitle(left).localeCompare(getSpeciesSortTitle(right));
      });
  }, [selectedWaterType, species, trimmedSearch]);

  const displayedFavoriteSpecies = useMemo(() => {
    const favoriteSpecies = favoriteSpeciesListQuery.data ?? [];

    return favoriteSpecies
      .filter((item) => {
        if (!matchesWaterType(item, selectedWaterType)) {
          return false;
        }

        if (!trimmedSearch) {
          return true;
        }

        return scoreSpecies(item, trimmedSearch) > 0;
      })
      .sort((left, right) => {
        if (trimmedSearch) {
          const rightScore = scoreSpecies(right, trimmedSearch);
          const leftScore = scoreSpecies(left, trimmedSearch);
          if (rightScore !== leftScore) {
            return rightScore - leftScore;
          }
        }

        return getSpeciesSortTitle(left).localeCompare(getSpeciesSortTitle(right));
      });
  }, [favoriteSpeciesListQuery.data, selectedWaterType, trimmedSearch]);

  if (detailSlug !== null || detailSpecCode !== null) {
    if (speciesDetailQuery.isLoading) {
      return (
        <div className="page-scroll">
          <div className="page-content resources-page-content">
            <div className="page-header">
              <Link to="/resources">
                <Button variant="ghost" size="sm" className="legal-back-button">
                  <FaArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <h1 className="page-title">Field Guide</h1>
            </div>
            <Card className="resources-card surface-card">
              <CardContent className="resources-empty-state">
                <FaFishFins size={20} />
                <div>
                  <h2 className="resources-empty-title">Loading species profile</h2>
                  <p className="resources-empty-copy">
                    Pulling the latest active species record from the field guide.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    if (speciesDetailQuery.isError) {
      return (
        <div className="page-scroll">
          <div className="page-content resources-page-content">
            <div className="page-header">
              <Link to="/resources">
                <Button variant="ghost" size="sm" className="legal-back-button">
                  <FaArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <h1 className="page-title">Field Guide</h1>
            </div>
            <Card className="resources-card surface-card">
              <CardContent className="resources-empty-state">
                <FaTriangleExclamation size={20} />
                <div>
                  <h2 className="resources-empty-title">Species unavailable</h2>
                  <p className="resources-empty-copy">
                    The field guide could not load that species profile right now.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    if (!speciesDetailQuery.data) {
      return (
        <div className="page-scroll">
          <div className="page-content resources-page-content">
            <div className="page-header">
              <Link to="/resources">
                <Button variant="ghost" size="sm" className="legal-back-button">
                  <FaArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <h1 className="page-title">Field Guide</h1>
            </div>
            <Card className="resources-card surface-card">
              <CardContent className="resources-empty-state">
                <FaBookmark size={20} />
                <div>
                  <h2 className="resources-empty-title">Species not found</h2>
                  <p className="resources-empty-copy">
                    That active species profile was not found in the field guide.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    return (
      <SpeciesDetailPage
        species={speciesDetailQuery.data}
        isFavorite={favoriteSet.has(speciesDetailQuery.data.specCode)}
        onToggleFavorite={() => toggleFavorite(speciesDetailQuery.data.specCode)}
      />
    );
  }

  return (
    <div className="page-scroll">
      <div className="page-content resources-page-content">
        <div className="page-header">
          <Link to="/resources">
            <Button variant="ghost" size="sm" className="legal-back-button">
              <FaArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="page-title">Field Guide</h1>
        </div>

        <div className="resources-stack">
          <Card className="resources-card surface-card">
            <CardContent className="resources-controls">
              <div className="resources-tabs" role="tablist" aria-label="Field guide views">
                <button
                  type="button"
                  role="tab"
                  aria-selected={!isFavoritesRoute}
                  aria-controls="field-guide-panel-all-species"
                  id="field-guide-tab-all-species"
                  tabIndex={!isFavoritesRoute ? 0 : -1}
                  className={!isFavoritesRoute ? "resources-tab resources-tab-active" : "resources-tab"}
                  onClick={() => navigate("/resources/field-guide")}
                >
                  All Species
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isFavoritesRoute}
                  aria-controls="field-guide-panel-bookmarks"
                  id="field-guide-tab-bookmarks"
                  tabIndex={isFavoritesRoute ? 0 : -1}
                  className={isFavoritesRoute ? "resources-tab resources-tab-active" : "resources-tab"}
                  onClick={() => navigate("/resources/field-guide/favorites")}
                >
                  Bookmarks
                </button>
              </div>
              <label className="resources-search-label" htmlFor="field-guide-search">
                {isFavoritesRoute ? "Search bookmarks" : "Search species"}
              </label>
              <div className="icon-field">
                <FaMagnifyingGlass className="icon-field-icon" />
                <Input
                  id="field-guide-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={isFavoritesRoute ? "Search your bookmarks" : "Try largemouth bass or Micropterus salmoides"}
                  className="field-dark icon-field-input"
                />
              </div>

              <div className="resources-toolbar">
                <div className="resources-filter-group">
                  <label className="resources-search-label" htmlFor="field-guide-water-type">
                    Water type
                  </label>
                  <select
                    id="field-guide-water-type"
                    value={selectedWaterType}
                    onChange={(event) => setSelectedWaterType(event.target.value)}
                    className="field-dark resources-select"
                  >
                    {WATER_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

              </div>
            </CardContent>
          </Card>

          <div
            id={isFavoritesRoute ? "field-guide-panel-bookmarks" : "field-guide-panel-all-species"}
            role="tabpanel"
            aria-labelledby={isFavoritesRoute ? "field-guide-tab-bookmarks" : "field-guide-tab-all-species"}
            className="resources-tab-panel"
          >
            <div className="resources-results-header">
              <div>
                <h2 className="resources-results-title">
                  {isFavoritesRoute ? "Bookmarked species" : "Species results"}
                </h2>
                <p className="resources-results-copy">
                  {!user?.id && isFavoritesRoute
                    ? "Sign in to access bookmarks"
                    : isFavoritesRoute && favoriteSpeciesListQuery.isLoading
                      ? "Loading bookmarks..."
                      : speciesListQuery.isLoading && !isFavoritesRoute
                        ? "Loading active species..."
                        : `${isFavoritesRoute ? displayedFavoriteSpecies.length : filteredSpecies.length} species ready to browse`}
                </p>
              </div>
            </div>

            {!user?.id && isFavoritesRoute ? (
              <Card className="resources-card surface-card">
                <CardContent className="resources-empty-state">
                  <FaBookmark size={20} />
                  <div>
                    <h2 className="resources-empty-title">Bookmarks require an account</h2>
                    <p className="resources-empty-copy">
                      Sign in to save species and find them here later.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : isFavoritesRoute && favoriteSpeciesListQuery.isLoading ? (
              <Card className="resources-card surface-card">
                <CardContent className="resources-empty-state">
                  <FaBookmark size={20} />
                  <div>
                    <h2 className="resources-empty-title">Loading bookmarks</h2>
                    <p className="resources-empty-copy">
                      Pulling your saved species from the field guide.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : !isFavoritesRoute && speciesListQuery.isLoading ? (
              <Card className="resources-card surface-card">
                <CardContent className="resources-empty-state">
                  <FaFishFins size={20} />
                  <div>
                    <h2 className="resources-empty-title">Loading field guide</h2>
                    <p className="resources-empty-copy">
                      Fetching active species from Supabase.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (isFavoritesRoute ? favoriteSpeciesListQuery.isError : speciesListQuery.isError) ? (
              <Card className="resources-card surface-card">
                <CardContent className="resources-empty-state">
                  <FaTriangleExclamation size={20} />
                  <div>
                    <h2 className="resources-empty-title">
                      {isFavoritesRoute ? "Couldn't load bookmarks" : "Couldn&apos;t load species"}
                    </h2>
                    <p className="resources-empty-copy">
                      {isFavoritesRoute
                        ? "Your saved species aren't available right now."
                        : "The field guide is having trouble reaching Supabase right now."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (isFavoritesRoute ? displayedFavoriteSpecies : filteredSpecies).length > 0 ? (
              <div className="resources-results-grid">
                {(isFavoritesRoute ? displayedFavoriteSpecies : filteredSpecies).map((item) => (
                  <ResourceSpeciesCard
                    key={item.specCode}
                    species={item}
                    isFavorite={favoriteSet.has(item.specCode)}
                    onOpen={() => navigate(`/resources/field-guide/${item.slug}`)}
                    onToggleFavorite={() => toggleFavorite(item.specCode)}
                  />
                ))}
              </div>
            ) : (
              <Card className="resources-card surface-card">
                <CardContent className="resources-empty-state">
                  <FaMagnifyingGlass size={20} />
                  <div>
                    <h2 className="resources-empty-title">
                      {isFavoritesRoute ? "No bookmarks yet" : "No matches yet"}
                    </h2>
                    <p className="resources-empty-copy">
                      {isFavoritesRoute
                        ? "Save species from the Field Guide to find them here."
                        : "Try a broader name or switch categories."}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="resources-card surface-card">
            <CardContent className="resources-footer-card">
              <Attribution />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
