import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  FaArrowLeft,
  FaBookmark,
  FaFishFins,
  FaMagnifyingGlass,
  FaTriangleExclamation,
} from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FieldGuideAttribution } from "@/features/field-guide/components/field-guide-attribution";
import { FieldGuideDetailPage } from "@/features/field-guide/components/field-guide-detail-page";
import { FieldGuideSpeciesCard } from "@/features/field-guide/components/field-guide-species-card";
import { FieldGuideStatusCard } from "@/features/field-guide/components/field-guide-status-card";
import { filterSpeciesList } from "@/features/field-guide/filter-species";
import { WATER_TYPE_OPTIONS } from "@/features/field-guide/presentation";
import { getFieldGuideRouteParams } from "@/features/field-guide/route";
import { getSpeciesSortTitle } from "@/lib/field-guide-search";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  favoriteSpecies,
  getFieldGuideSpeciesDetail,
  getFieldGuideSpeciesList,
  getMyFavoriteSpecies,
  getMyFavoriteSpecCodes,
  unfavoriteSpecies,
} from "@/lib/field-guide";
import { appQueryKeys } from "@/lib/query-keys";
import type { FishSpeciesListItem } from "@/types/field-guide";

function PageHeader() {
  return (
    <div className="page-header">
      <Button
        variant="ghost"
        size="sm"
        className="legal-back-button"
        onClick={() => window.history.back()}
      >
        <FaArrowLeft className="w-4 h-4" />
      </Button>
      <h1 className="page-title">Field Guide</h1>
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
  const { isFavoritesRoute, detailSlug, detailSpecCode } =
    getFieldGuideRouteParams(location);
  const trimmedSearch = search.trim();
  const favoriteQueryKey = appQueryKeys.fieldGuideFavoriteSpecCodes(
    user?.id ?? null,
  );
  const favoriteSpeciesQueryKey = appQueryKeys.fieldGuideFavoriteSpecies(
    user?.id ?? null,
  );

  const speciesListQuery = useQuery({
    queryKey: appQueryKeys.fieldGuideSpeciesList(trimmedSearch),
    queryFn: () =>
      getFieldGuideSpeciesList({
        search: trimmedSearch,
      }),
    enabled: trimmedSearch.length > 0,
  });

  const speciesDetailQuery = useQuery({
    queryKey: appQueryKeys.fieldGuideSpeciesDetail(
      detailSlug ?? detailSpecCode,
    ),
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

  const favoriteSpecCodes = useMemo(
    () => favoriteSpecCodesQuery.data ?? [],
    [favoriteSpecCodesQuery.data],
  );
  const favoriteSet = useMemo(
    () => new Set(favoriteSpecCodes),
    [favoriteSpecCodes],
  );
  const species = useMemo(
    () => speciesListQuery.data ?? [],
    [speciesListQuery.data],
  );

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
        queryClient.getQueryData<FishSpeciesListItem[]>(
          favoriteSpeciesQueryKey,
        ) ?? [];

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
          (speciesDetailQuery.data?.specCode === input.specCode
            ? speciesDetailQuery.data
            : null);

        if (
          speciesToInsert &&
          !previousSpecies.some((item) => item.specCode === input.specCode)
        ) {
          queryClient.setQueryData(
            favoriteSpeciesQueryKey,
            [...previousSpecies, speciesToInsert].sort((left, right) =>
              getSpeciesSortTitle(left).localeCompare(
                getSpeciesSortTitle(right),
              ),
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
        queryClient.setQueryData(
          favoriteSpeciesQueryKey,
          context.previousSpecies,
        );
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

  const filteredSpecies = useMemo(
    () =>
      filterSpeciesList({
        species,
        waterType: selectedWaterType,
        search: trimmedSearch,
      }),
    [selectedWaterType, species, trimmedSearch],
  );

  const displayedFavoriteSpecies = useMemo(
    () =>
      filterSpeciesList({
        species: favoriteSpeciesListQuery.data ?? [],
        waterType: selectedWaterType,
        search: trimmedSearch,
      }),
    [favoriteSpeciesListQuery.data, selectedWaterType, trimmedSearch],
  );

  if (detailSlug !== null || detailSpecCode !== null) {
    if (speciesDetailQuery.isLoading) {
      return (
        <div className="page-scroll">
          <div className="page-content resources-page-content">
            <PageHeader backTo="/resources" />
            <FieldGuideStatusCard
              icon={<FaFishFins size={20} />}
              title="Loading species profile"
              description="Pulling the latest active species record from the field guide."
            />
          </div>
        </div>
      );
    }

    if (speciesDetailQuery.isError) {
      return (
        <div className="page-scroll">
          <div className="page-content resources-page-content">
            <PageHeader backTo="/resources" />
            <FieldGuideStatusCard
              icon={<FaTriangleExclamation size={20} />}
              title="Species unavailable"
              description="The field guide could not load that species profile right now."
            />
          </div>
        </div>
      );
    }

    if (!speciesDetailQuery.data) {
      return (
        <div className="page-scroll">
          <div className="page-content resources-page-content">
            <PageHeader backTo="/resources" />
            <FieldGuideStatusCard
              icon={<FaBookmark size={20} />}
              title="Species not found"
              description="That active species profile was not found in the field guide."
            />
          </div>
        </div>
      );
    }

    return (
      <FieldGuideDetailPage
        species={speciesDetailQuery.data}
        isFavorite={favoriteSet.has(speciesDetailQuery.data.specCode)}
        onToggleFavorite={() =>
          toggleFavorite(speciesDetailQuery.data.specCode)
        }
        onBack={() => {
          if (typeof window !== "undefined" && window.history.length > 1) {
            window.history.back();
            return;
          }

          navigate("/resources/field-guide");
        }}
      />
    );
  }

  const displayedSpecies = isFavoritesRoute
    ? displayedFavoriteSpecies
    : filteredSpecies;
  const resultsCopy =
    !user?.id && isFavoritesRoute
      ? "Sign in to access bookmarks"
      : isFavoritesRoute && favoriteSpeciesListQuery.isLoading
        ? "Loading bookmarks..."
        : speciesListQuery.isLoading && !isFavoritesRoute
          ? "Loading active species..."
          : !isFavoritesRoute && trimmedSearch.length === 0
            ? "Start typing to search the field guide"
            : `${displayedSpecies.length} species ready to browse`;

  return (
    <div className="page-scroll">
      <div className="page-content resources-page-content">
        <PageHeader backTo="/resources" />

        <div className="resources-stack">
          <Card className="resources-card surface-card">
            <CardContent className="resources-controls">
              <div
                className="resources-tabs"
                role="tablist"
                aria-label="Field guide views"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={!isFavoritesRoute}
                  aria-controls="field-guide-panel-all-species"
                  id="field-guide-tab-all-species"
                  tabIndex={!isFavoritesRoute ? 0 : -1}
                  className={
                    !isFavoritesRoute
                      ? "resources-tab resources-tab-active"
                      : "resources-tab"
                  }
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
                  className={
                    isFavoritesRoute
                      ? "resources-tab resources-tab-active"
                      : "resources-tab"
                  }
                  onClick={() => navigate("/resources/field-guide/favorites")}
                >
                  Bookmarks
                </button>
              </div>

              <label
                className="resources-search-label"
                htmlFor="field-guide-search"
              >
                {isFavoritesRoute ? "Search bookmarks" : "Search species"}
              </label>
              <div className="icon-field">
                <FaMagnifyingGlass className="icon-field-icon" />
                <Input
                  id="field-guide-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={
                    isFavoritesRoute
                      ? "Search your bookmarks"
                      : "Try largemouth bass or Micropterus salmoides"
                  }
                  className="field-dark icon-field-input"
                />
              </div>

              <div className="resources-toolbar">
                <div className="resources-filter-group">
                  <label
                    className="resources-search-label"
                    htmlFor="field-guide-water-type"
                  >
                    Water type
                  </label>
                  <select
                    id="field-guide-water-type"
                    value={selectedWaterType}
                    onChange={(event) =>
                      setSelectedWaterType(event.target.value)
                    }
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
            id={
              isFavoritesRoute
                ? "field-guide-panel-bookmarks"
                : "field-guide-panel-all-species"
            }
            role="tabpanel"
            aria-labelledby={
              isFavoritesRoute
                ? "field-guide-tab-bookmarks"
                : "field-guide-tab-all-species"
            }
            className="resources-tab-panel"
          >
            <div className="resources-results-header">
              <div>
                <h2 className="resources-results-title">
                  {isFavoritesRoute ? "Bookmarked species" : "Species results"}
                </h2>
                <p className="resources-results-copy">{resultsCopy}</p>
              </div>
            </div>

            {!user?.id && isFavoritesRoute ? (
              <FieldGuideStatusCard
                icon={<FaBookmark size={20} />}
                title="Bookmarks require an account"
                description="Sign in to save species and find them here later."
              />
            ) : isFavoritesRoute && favoriteSpeciesListQuery.isLoading ? (
              <FieldGuideStatusCard
                icon={<FaBookmark size={20} />}
                title="Loading bookmarks"
                description="Pulling your saved species from the field guide."
              />
            ) : !isFavoritesRoute && speciesListQuery.isLoading ? (
              <FieldGuideStatusCard
                icon={<FaFishFins size={20} />}
                title="Loading field guide"
                description="Fetching active species from Supabase."
              />
            ) : (
                isFavoritesRoute
                  ? favoriteSpeciesListQuery.isError
                  : speciesListQuery.isError
              ) ? (
              <FieldGuideStatusCard
                icon={<FaTriangleExclamation size={20} />}
                title={
                  isFavoritesRoute
                    ? "Couldn't load bookmarks"
                    : "Couldn't load species"
                }
                description={
                  isFavoritesRoute
                    ? "Your saved species aren't available right now."
                    : "The field guide is having trouble reaching Supabase right now."
                }
              />
            ) : !isFavoritesRoute && trimmedSearch.length === 0 ? (
              <FieldGuideStatusCard
                icon={<FaMagnifyingGlass size={20} />}
                title="Search the field guide"
                description="Start typing a species name to see matching results."
              />
            ) : displayedSpecies.length > 0 ? (
              <div className="resources-results-grid">
                {displayedSpecies.map((speciesItem) => (
                  <FieldGuideSpeciesCard
                    key={speciesItem.specCode}
                    species={speciesItem}
                    isFavorite={favoriteSet.has(speciesItem.specCode)}
                    onOpen={() =>
                      navigate(`/resources/field-guide/${speciesItem.slug}`)
                    }
                    onToggleFavorite={() =>
                      toggleFavorite(speciesItem.specCode)
                    }
                  />
                ))}
              </div>
            ) : (
              <FieldGuideStatusCard
                icon={<FaMagnifyingGlass size={20} />}
                title={isFavoritesRoute ? "No bookmarks yet" : "No matches yet"}
                description={
                  isFavoritesRoute
                    ? "Save species from the Field Guide to find them here."
                    : "Try a broader name or switch categories."
                }
              />
            )}
          </div>

          <Card className="resources-card surface-card">
            <CardContent className="resources-footer-card">
              <FieldGuideAttribution />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
