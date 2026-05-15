import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { APIProvider } from "@vis.gl/react-google-maps";
import {
  FaArrowLeft,
  FaArrowUpRightFromSquare,
  FaBookmark,
  FaCircleInfo,
  FaLocationArrow,
  FaMagnifyingGlass,
  FaRegBookmark,
  FaScaleBalanced,
  FaWaveSquare,
} from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeatherLocationAutocomplete } from "@/components/weather-location-autocomplete";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { buildFishingResourceContext } from "@/lib/fishing-resources";
import {
  areWeatherLocationsEqual,
  createDeviceWeatherLocation,
  formatWeatherLocationCoordinates,
  formatWeatherLocationSubtitle,
  loadActiveWeatherLocation,
  loadSavedWeatherLocations,
  reverseGeocodeWeatherLocationDetails,
  saveActiveWeatherLocation,
  saveSavedWeatherLocations,
  type WeatherLocation,
} from "@/lib/weather-locations";

type SelectedLocationSource = "device" | "search" | "saved";

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? "";

const PAGE_CONFIG = {
  title: "Fishing Resources",
  eyebrow: "Reports & Regulations",
  description:
    "Find local fishing reports and jump to current official regulations for your selected location.",
  emptyTitle: "Choose a fishing location",
  emptyCopy:
    "Use your current location, search for a place, or choose a saved location to surface nearby reports and regulation sources.",
  notice:
    "Fishing reports can lag behind real conditions. Always verify current official regulations before fishing because seasons, species limits, border waters, emergency orders, and individual water bodies can change the rules.",
} as const;

const RESOURCE_SECTIONS = {
  reports: {
    title: "Fishing Reports",
    resultTitle: "Report Sources",
    Icon: FaWaveSquare,
  },
  regulations: {
    title: "Regulations",
    resultTitle: "Regulation Sources",
    Icon: FaScaleBalanced,
  },
} as const;

function getStoredLocationState(userId?: string | null) {
  const savedLocations = loadSavedWeatherLocations(userId);
  const activeLocation = loadActiveWeatherLocation(userId);
  const selectedSource = activeLocation
    ? savedLocations.some((location) =>
        areWeatherLocationsEqual(location, activeLocation),
      )
      ? "saved"
      : "search"
    : null;

  return {
    savedLocations,
    activeLocation,
    selectedSource,
  } as const;
}

function formatLocationTitle(
  location: WeatherLocation | null,
  source: SelectedLocationSource | null,
  resolvedDetails?: Pick<WeatherLocation, "name" | "admin1"> | null,
) {
  if (!location) {
    return "No location selected";
  }

  if (source === "device") {
    const detailLabel = resolvedDetails
      ? [resolvedDetails.name, resolvedDetails.admin1].filter(Boolean).join(", ")
      : null;
    return detailLabel ? `Current Location | ${detailLabel}` : "Current Location";
  }

  return [location.name, location.admin1].filter(Boolean).join(", ");
}

function formatLocationMeta(location: WeatherLocation | null) {
  if (!location) {
    return "Search, use current location, or pick a saved place.";
  }

  return formatWeatherLocationSubtitle(location) || formatWeatherLocationCoordinates(location);
}

function mergeResolvedLocation(
  location: WeatherLocation | null,
  source: SelectedLocationSource | null,
  details?: Pick<WeatherLocation, "name" | "admin1" | "country"> | null,
) {
  if (!location) {
    return null;
  }

  return {
    ...location,
    name: source === "device" && details?.name ? details.name : location.name,
    admin1: location.admin1 ?? details?.admin1 ?? null,
    country: location.country ?? details?.country ?? null,
  };
}

function FishingResourcePageContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const userId = user?.id ?? null;
  const storedLocationState = useMemo(
    () => getStoredLocationState(userId),
    [userId],
  );
  const [savedLocations, setSavedLocations] = useState<WeatherLocation[]>(
    storedLocationState.savedLocations,
  );
  const [selectedLocation, setSelectedLocation] =
    useState<WeatherLocation | null>(storedLocationState.activeLocation);
  const [selectedSource, setSelectedSource] =
    useState<SelectedLocationSource | null>(storedLocationState.selectedSource);
  const [searchInput, setSearchInput] = useState("");
  const [, setLocationPermissionState] = useState<
    PermissionState | "unsupported" | "unknown"
  >("unknown");
  const [locationStatusMessage, setLocationStatusMessage] = useState<
    string | null
  >(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const manualSelectionRef = useRef(false);
  const selectedLocationRef = useRef<WeatherLocation | null>(
    storedLocationState.activeLocation,
  );

  useEffect(() => {
    saveSavedWeatherLocations(savedLocations, userId);
  }, [savedLocations, userId]);

  useEffect(() => {
    selectedLocationRef.current = selectedLocation;
  }, [selectedLocation]);

  const applySelectedLocation = useCallback(
    (
      location: WeatherLocation,
      source: SelectedLocationSource,
      options?: { manual?: boolean },
    ) => {
      if (options?.manual) {
        manualSelectionRef.current = true;
      }

      setSelectedLocation(location);
      setSelectedSource(source);
      setLocationStatusMessage(null);

      if (source === "device") {
        saveActiveWeatherLocation(null, userId);
        return;
      }

      saveActiveWeatherLocation(location, userId);
    },
    [userId],
  );

  const requestDeviceLocation = useCallback(
    async (options?: { manual?: boolean }) => {
      if (!("geolocation" in navigator)) {
        setLocationPermissionState("unsupported");
        setLocationStatusMessage(
          "Location services are not supported in this browser.",
        );
        return false;
      }

      const isManualRequest = Boolean(options?.manual);
      if (isManualRequest) {
        setIsRequestingLocation(true);
      }
      setLocationStatusMessage(null);

      return await new Promise<boolean>((resolve) => {
        const applyPosition = (position: GeolocationPosition) => {
          if (isManualRequest) {
            setIsRequestingLocation(false);
          }
          setLocationPermissionState("granted");

          if (!options?.manual && manualSelectionRef.current) {
            resolve(true);
            return;
          }

          applySelectedLocation(
            createDeviceWeatherLocation(
              position.coords.latitude,
              position.coords.longitude,
            ),
            "device",
            options,
          );
          resolve(true);
        };

        const handleFailure = (error: GeolocationPositionError) => {
          if (isManualRequest) {
            setIsRequestingLocation(false);
          }

          if (error.code === error.PERMISSION_DENIED) {
            setLocationPermissionState("denied");
            setLocationStatusMessage(
              "Location access is off in this browser. Search for a place or choose a saved location.",
            );
          } else {
            setLocationStatusMessage(
              "Unable to get your current location right now. Search for a place instead.",
            );
          }

          resolve(false);
        };

        const fastOptions: PositionOptions = {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 1000 * 60 * 10,
        };

        const preciseOptions: PositionOptions = {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0,
        };

        if (isManualRequest) {
          navigator.geolocation.getCurrentPosition(
            applyPosition,
            () => {
              navigator.geolocation.getCurrentPosition(
                applyPosition,
                handleFailure,
                fastOptions,
              );
            },
            preciseOptions,
          );
          return;
        }

        navigator.geolocation.getCurrentPosition(
          applyPosition,
          handleFailure,
          fastOptions,
        );
      });
    },
    [applySelectedLocation],
  );

  useEffect(() => {
    let isCancelled = false;
    let permissionStatus: PermissionStatus | null = null;

    const detectPermissionAndLocation = async () => {
      if (!("geolocation" in navigator)) {
        setLocationPermissionState("unsupported");
        return;
      }

      if (!("permissions" in navigator) || !navigator.permissions?.query) {
        if (!selectedLocationRef.current) {
          await requestDeviceLocation();
        }
        return;
      }

      try {
        permissionStatus = await navigator.permissions.query({
          name: "geolocation",
        });
        if (isCancelled) {
          return;
        }

        setLocationPermissionState(permissionStatus.state);

        if (permissionStatus.state === "denied") {
          setLocationStatusMessage(
            "Location access is off in this browser. Search for a place or choose a saved location.",
          );
          return;
        }

        if (!selectedLocationRef.current) {
          await requestDeviceLocation();
        }

        permissionStatus.onchange = () => {
          setLocationPermissionState(permissionStatus?.state ?? "unknown");

          if (
            permissionStatus?.state === "granted" &&
            !selectedLocationRef.current
          ) {
            void requestDeviceLocation();
          }

          if (permissionStatus?.state === "denied") {
            setLocationStatusMessage(
              "Location access is off in this browser. Search for a place or choose a saved location.",
            );
          }
        };
      } catch {
        if (!isCancelled && !selectedLocationRef.current) {
          await requestDeviceLocation();
        }
      }
    };

    void detectPermissionAndLocation();

    return () => {
      isCancelled = true;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [requestDeviceLocation]);

  const shouldResolveLocationDetails = Boolean(
    selectedLocation &&
      (selectedSource === "device" ||
        !selectedLocation.admin1 ||
        !selectedLocation.country),
  );
  const locationDetailsQuery = useQuery({
    queryKey: [
      "fishing-resources",
      "location-details",
      selectedLocation?.latitude,
      selectedLocation?.longitude,
    ],
    queryFn: () =>
      reverseGeocodeWeatherLocationDetails(
        selectedLocation!.latitude,
        selectedLocation!.longitude,
      ),
    enabled: shouldResolveLocationDetails,
    staleTime: 1000 * 60 * 30,
    retry: false,
  });
  const resolvedLocation = useMemo(
    () =>
      mergeResolvedLocation(
        selectedLocation,
        selectedSource,
        locationDetailsQuery.data,
      ),
    [locationDetailsQuery.data, selectedLocation, selectedSource],
  );
  const reportContext = useMemo(
    () =>
      resolvedLocation
        ? buildFishingResourceContext(resolvedLocation, "reports")
        : null,
    [resolvedLocation],
  );
  const regulationContext = useMemo(
    () =>
      resolvedLocation
        ? buildFishingResourceContext(resolvedLocation, "regulations")
        : null,
    [resolvedLocation],
  );
  const savedLocationIds = useMemo(
    () => new Set(savedLocations.map((location) => location.id)),
    [savedLocations],
  );
  const selectedLocationTitle = formatLocationTitle(
    selectedLocation,
    selectedSource,
    locationDetailsQuery.data,
  );
  const selectedLocationMeta = formatLocationMeta(resolvedLocation);
  const savableSelectedLocation =
    selectedLocation &&
    selectedSource !== "device" &&
    !savedLocationIds.has(selectedLocation.id)
      ? selectedLocation
      : null;

  const handleSaveLocation = (location: WeatherLocation) => {
    if (savedLocationIds.has(location.id)) {
      return;
    }

    setSavedLocations((currentLocations) => [location, ...currentLocations]);
    toast({
      title: "Location saved",
      description: `${location.name} is now available from your saved locations.`,
    });
  };

  const handleRemoveSavedLocation = (locationToRemove: WeatherLocation) => {
    setSavedLocations((currentLocations) =>
      currentLocations.filter(
        (location) => !areWeatherLocationsEqual(location, locationToRemove),
      ),
    );

    toast({
      title: "Location removed",
      description: `${locationToRemove.name} was removed from your saved locations.`,
    });
  };

  const handleSelectLocationFromMenu = (
    location: WeatherLocation,
    source: Exclude<SelectedLocationSource, "device">,
  ) => {
    applySelectedLocation(location, source, { manual: true });
    setSearchInput("");
  };

  const handleUseMyLocation = async () => {
    const didResolveLocation = await requestDeviceLocation({ manual: true });
    if (didResolveLocation) {
      setSearchInput("");
    }
  };

  const resourceSections = [
    {
      ...RESOURCE_SECTIONS.reports,
      context: reportContext,
    },
    {
      ...RESOURCE_SECTIONS.regulations,
      context: regulationContext,
    },
  ] as const;

  return (
    <div className="page-scroll">
      <div className="page-content resources-page-content">
        <div className="page-header">
          <Button
            variant="ghost"
            size="sm"
            className="legal-back-button"
            onClick={() => window.history.back()}
          >
            <FaArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="page-title">{PAGE_CONFIG.title}</h1>
        </div>

        <div className="resources-stack">
          <Card className="resources-card resources-hero-card surface-card">
            <CardContent className="resources-hero-content">
              <div className="resources-hero-icon">
                <FaWaveSquare size={28} />
              </div>
              <div>
                <p className="resources-eyebrow">{PAGE_CONFIG.eyebrow}</p>
                <h2 className="resources-hero-title">{PAGE_CONFIG.title}</h2>
                <p className="resources-hero-copy">{PAGE_CONFIG.description}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="resources-card surface-card">
            <CardHeader className="pb-3">
              <div className="resources-fishing-location-header">
                <div>
                  <CardTitle className="resources-section-title">
                    Location
                  </CardTitle>
                  <p className="resources-fishing-location-subtitle">
                    {selectedLocationTitle}
                  </p>
                </div>
                <div className="resources-weather-location-actions">
                  {savableSelectedLocation ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="btn-outline-muted-accent"
                      onClick={() => handleSaveLocation(savableSelectedLocation)}
                    >
                      <FaRegBookmark size={14} />
                      Save
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    className="btn-outline-muted"
                    onClick={() => {
                      void handleUseMyLocation();
                    }}
                    disabled={isRequestingLocation}
                  >
                    <FaLocationArrow size={14} />
                    {isRequestingLocation ? "Finding..." : "Current Location"}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="resources-fishing-selected-location">
                <span className="resources-weather-location-row-icon">
                  <FaLocationArrow size={16} />
                </span>
                <span className="resources-weather-location-row-copy">
                  <span className="resources-weather-location-row-title">
                    {selectedLocationTitle}
                  </span>
                  <span className="resources-weather-location-row-meta">
                    {locationDetailsQuery.isLoading
                      ? "Resolving region..."
                      : selectedLocationMeta}
                  </span>
                </span>
              </div>

              <div className="resources-weather-search-form resources-fishing-search-form">
                <div className="resources-weather-search-controls">
                  <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                    <WeatherLocationAutocomplete
                      id="fishing-resource-location-search"
                      value={searchInput}
                      onChange={(event) => {
                        setSearchInput(event.target.value);
                      }}
                      onPlaceSelect={(location) => {
                        applySelectedLocation(location, "search", {
                          manual: true,
                        });
                        setSearchInput(
                          [location.name, location.admin1]
                            .filter(Boolean)
                            .join(", "),
                        );
                      }}
                      placeholder="Search city, town, or region"
                      className="field-dark"
                      autoComplete="off"
                    />
                  </APIProvider>
                  <p className="resources-weather-search-caption">
                    Powered by Google
                  </p>
                </div>
              </div>

              {locationStatusMessage ? (
                <p className="resources-weather-status-copy resources-weather-inline-status">
                  {locationStatusMessage}
                </p>
              ) : null}

              {savedLocations.length > 0 ? (
                <div className="resources-weather-saved-section resources-fishing-saved-section">
                  <div className="resources-weather-saved-header">
                    <h2 className="resources-section-title">Saved Locations</h2>
                  </div>
                  <div className="resources-weather-location-list">
                    {savedLocations.map((location) => (
                      <div
                        key={location.id}
                        className="resources-weather-location-row-shell"
                      >
                        <button
                          type="button"
                          className={
                            areWeatherLocationsEqual(
                              selectedLocation,
                              location,
                            )
                              ? "resources-weather-location-row is-active"
                              : "resources-weather-location-row"
                          }
                          onClick={() =>
                            handleSelectLocationFromMenu(location, "saved")
                          }
                        >
                          <span className="resources-weather-location-row-icon">
                            <FaBookmark size={16} />
                          </span>
                          <span className="resources-weather-location-row-copy">
                            <span className="resources-weather-location-row-title">
                              {location.name}
                            </span>
                            <span className="resources-weather-location-row-meta">
                              {formatWeatherLocationSubtitle(location) ||
                                formatWeatherLocationCoordinates(location)}
                            </span>
                          </span>
                        </button>

                        <Button
                          type="button"
                          variant="ghost"
                          className="resources-weather-location-row-action"
                          onClick={() => handleRemoveSavedLocation(location)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="resources-card surface-card">
            <CardHeader className="pb-3">
              <CardTitle className="resources-section-title">
                Resource Sources
              </CardTitle>
              {reportContext ? (
                <p className="resources-fishing-location-subtitle">
                  {reportContext.kind === "us-state"
                    ? `Best matches for ${reportContext.label}`
                    : `Search-based matches for ${reportContext.label}`}
                </p>
              ) : null}
            </CardHeader>
            <CardContent className="pt-0">
              {!selectedLocation ? (
                <div className="resources-empty-state">
                  <FaMagnifyingGlass size={20} />
                  <div>
                    <h2 className="resources-empty-title">
                      {PAGE_CONFIG.emptyTitle}
                    </h2>
                    <p className="resources-empty-copy">
                      {PAGE_CONFIG.emptyCopy}
                    </p>
                  </div>
                </div>
              ) : locationDetailsQuery.isLoading ? (
                <p className="resources-weather-status-copy">
                  Resolving the selected location...
                </p>
              ) : (
                <div className="resources-fishing-section-list">
                  {resourceSections.map((section) => {
                    const SectionIcon = section.Icon;

                    return section.context ? (
                      <section
                        key={section.title}
                        className="resources-fishing-source-section"
                      >
                        <div className="resources-fishing-source-header">
                          <span className="resources-fishing-source-icon">
                            <SectionIcon size={16} />
                          </span>
                          <h2 className="resources-fishing-source-title">
                            {section.resultTitle}
                          </h2>
                        </div>

                        <div className="resources-fishing-link-list">
                          {section.context.links.map((link) => (
                            <a
                              key={link.url}
                              href={link.url}
                              target="_blank"
                              rel="noreferrer"
                              className={
                                link.isPrimary
                                  ? "resources-fishing-link-card resources-fishing-link-card-primary"
                                  : "resources-fishing-link-card"
                              }
                            >
                              <span className="resources-fishing-link-icon">
                                <FaArrowUpRightFromSquare size={15} />
                              </span>
                              <span className="resources-fishing-link-copy">
                                <span className="resources-fishing-link-meta">
                                  {link.sourceLabel}
                                </span>
                                <span className="resources-fishing-link-title">
                                  {link.title}
                                </span>
                                <span className="resources-fishing-link-description">
                                  {link.description}
                                </span>
                              </span>
                            </a>
                          ))}
                        </div>
                      </section>
                    ) : null;
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="resources-card surface-card">
            <CardContent className="resources-empty-state">
                <FaCircleInfo size={20} />
                <div>
                  <h2 className="resources-empty-title">Before you fish</h2>
                <p className="resources-empty-copy">{PAGE_CONFIG.notice}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function FishingResourcePage() {
  return <FishingResourcePageContent />;
}
