/*
 * File:        src/components/map-interface.tsx
 * Description: <brief description of the purpose of this file>
 *
 * Author:      Andrew Johnson
 * Company:     CatchLogs LLC
 *
 * Copyright (c) 2026 CatchLogs LLC. All rights reserved.
 *
 * This source code and all associated files are the property of CatchLogs LLC.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without explicit written permission
 * from CatchLogs LLC.
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  FaBookBookmark,
  FaCrosshairs,
  FaLayerGroup,
  FaLocationArrow,
  FaMapLocationDot,
  FaMinus,
  FaPlus,
  FaXmark,
} from "react-icons/fa6";
import { GiFishingLure } from "react-icons/gi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Pin, type PinWithEntries } from "@/types/domain";
import { useToast } from "@/hooks/use-toast";
import { normalizeFishingGearValue } from "@/lib/fishing-gear";
import {
  loadSessionGearVisibility,
  saveSessionGearVisibility,
} from "@/lib/session-gear";
import {
  createPin,
  deletePinIfEmpty,
  getPinsWithEntries,
} from "@/lib/supabase-data";
import { getEntries } from "@/lib/supabase-data";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_MAP_BASE_LAYER, MAP_BASE_LAYERS } from "@/lib/map-layers";
import {
  loadMapBaseLayerPreference,
  loadMapLabelsVisiblePreference,
  saveMapBaseLayerPreference,
  saveMapLabelsVisiblePreference,
} from "@/lib/map-preferences";
import { appQueryKeys } from "@/lib/query-keys";
import "leaflet/dist/leaflet.css";

// Fix for default markers in React Leaflet
delete (L.Icon.Default.prototype as { _getIconUrl?: string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Create pin icons with different classes for CSS styling
const createPinIcon = (className: string) =>
  new L.Icon({
    iconUrl:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23dc2626'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E",
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
    className: className,
  });

const redPinIcon = createPinIcon("unselected-pin");
const selectedPinIcon = createPinIcon("selected-pin");

interface MapInterfaceProps {
  selectedPinId: number | null;
  onPinSelect: (pinId: number, isNew?: boolean) => void;
  isPinDropMode: boolean;
  onPinDropModeChange: (mode: boolean) => void;
  moveEntryId?: number | null;
  onEntryMove?: (entryId: number, lat: number, lng: number) => void;
  sessionLure: string;
  sessionBait: string;
  onSessionLureChange: (value: string) => void;
  onSessionBaitChange: (value: string) => void;
}

function MapClickHandler({
  isPinDropMode,
  moveEntryId,
  onPinCreate,
  onEntryMove,
}: {
  isPinDropMode: boolean;
  moveEntryId?: number | null;
  onPinCreate: (lat: number, lng: number) => void;
  onEntryMove?: (entryId: number, lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      if (moveEntryId && onEntryMove) {
        onEntryMove(moveEntryId, e.latlng.lat, e.latlng.lng);
        return;
      }
      if (isPinDropMode) {
        onPinCreate(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
}

function MapCenterer({
  selectedPinId,
  pins,
}: {
  selectedPinId: number | null;
  pins: Pin[];
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedPinId && pins.length > 0) {
      const selectedPin = pins.find((pin) => pin.id === selectedPinId);
      if (selectedPin) {
        map.setView([selectedPin.latitude, selectedPin.longitude], 16, {
          animate: true,
        });
      }
    }
  }, [selectedPinId, pins, map]);

  return null;
}

function MapRefBridge({ mapRef }: { mapRef: { current: L.Map | null } }) {
  const map = useMap();

  useEffect(() => {
    mapRef.current = map;
    return () => {
      if (mapRef.current === map) {
        mapRef.current = null;
      }
    };
  }, [map, mapRef]);

  return null;
}

function UserLocationCenterer({
  userLocation,
  selectedPinId,
  hasCenteredOnInitialLocationRef,
}: {
  userLocation: [number, number] | null;
  selectedPinId: number | null;
  hasCenteredOnInitialLocationRef: { current: boolean };
}) {
  const map = useMap();

  useEffect(() => {
    if (!userLocation) return;
    if (hasCenteredOnInitialLocationRef.current) return;

    if (selectedPinId !== null) {
      // Consume the one-time auto-center when a pin is already selected
      // so clearing selection later does not unexpectedly jump to user location.
      hasCenteredOnInitialLocationRef.current = true;
      return;
    }

    map.setView(userLocation, 15, { animate: false });
    hasCenteredOnInitialLocationRef.current = true;
  }, [map, userLocation, selectedPinId, hasCenteredOnInitialLocationRef]);

  return null;
}

export default function MapInterface({
  selectedPinId,
  onPinSelect,
  isPinDropMode,
  onPinDropModeChange,
  moveEntryId,
  onEntryMove,
  sessionLure,
  sessionBait,
  onSessionLureChange,
  onSessionBaitChange,
}: MapInterfaceProps) {
  const mapRef = useRef<L.Map | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null,
  );
  const hasCenteredOnInitialLocation = useRef(false);
  const [showPinMenu, setShowPinMenu] = useState(false);
  const [showLayerMenu, setShowLayerMenu] = useState(false);
  const [isGearPanelVisible, setIsGearPanelVisible] = useState(() =>
    user?.id ? loadSessionGearVisibility(user.id) : true,
  );
  const [mapBaseLayer, setMapBaseLayer] = useState(() =>
    user?.id ? loadMapBaseLayerPreference(user.id) : DEFAULT_MAP_BASE_LAYER,
  );
  const [showMapLabels, setShowMapLabels] = useState(() =>
    user?.id ? loadMapLabelsVisiblePreference(user.id) : true,
  );
  const initialCenter: [number, number] = [46.8772, -96.7898];

  const { data: pins = [], isLoading } = useQuery<PinWithEntries[]>({
    queryKey: appQueryKeys.pins(),
    queryFn: getPinsWithEntries,
  });
  const { data: entries = [] } = useQuery({
    queryKey: appQueryKeys.entries(),
    queryFn: getEntries,
  });

  const lureSuggestions = Array.from(
    new Set(
      entries
        .map((entry) => normalizeFishingGearValue(entry.lure))
        .filter((lure): lure is string => Boolean(lure && lure.length > 0)),
    ),
  )
    .filter((lure) => lure.toLowerCase().includes(sessionLure.toLowerCase()))
    .slice(0, 8);
  const baitSuggestions = Array.from(
    new Set(
      entries
        .map((entry) => normalizeFishingGearValue(entry.bait))
        .filter((bait): bait is string => Boolean(bait && bait.length > 0)),
    ),
  )
    .filter((bait) => bait.toLowerCase().includes(sessionBait.toLowerCase()))
    .slice(0, 8);

  const createPinMutation = useMutation({
    mutationFn: async ({ lat, lng }: { lat: number; lng: number }) => {
      if (!user?.id) {
        throw new Error("You must be logged in to add a pin.");
      }

      return createPin({
        userId: user.id,
        latitude: lat,
        longitude: lng,
        name: `Location ${new Date().toLocaleDateString()}`,
      });
    },
    onSuccess: (newPin) => {
      queryClient.invalidateQueries({ queryKey: appQueryKeys.pins() });
      onPinDropModeChange(false);
      setShowPinMenu(false);
      // Automatically select the new pin and trigger entry form
      onPinSelect(newPin.id, true);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create fishing location",
        variant: "destructive",
      });
    },
  });

  const cleanupEmptyPinsMutation = useMutation({
    mutationFn: async (pinIds: number[]) => {
      if (pinIds.length === 0) {
        return [] as number[];
      }
      const deleted = await Promise.all(
        pinIds.map(async (pinId) =>
          (await deletePinIfEmpty(pinId)) ? pinId : null,
        ),
      );
      return deleted.filter((pinId): pinId is number => pinId !== null);
    },
    onSuccess: (deletedPinIds) => {
      if (deletedPinIds.length === 0) return;
      queryClient.invalidateQueries({ queryKey: appQueryKeys.pins() });
    },
  });

  const handlePinCreate = (lat: number, lng: number) => {
    createPinMutation.mutate({ lat, lng });
  };

  const handleAddPinAtLocation = () => {
    setShowPinMenu(false);
    onPinDropModeChange(false);

    if (!userLocation) {
      toast({
        title: "Location not available",
        description: "Unable to get your current location",
        variant: "destructive",
      });
      return;
    }

    createPinMutation.mutate({
      lat: userLocation[0],
      lng: userLocation[1],
    });
  };

  const zoomIn = () => {
    const map = mapRef.current;
    if (map) {
      map.zoomIn();
    }
  };

  const zoomOut = () => {
    const map = mapRef.current;
    if (map) {
      map.zoomOut();
    }
  };

  const goToUserLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.setView(userLocation, 15);
    } else {
      requestLocation();
    }
  };

  const requestLocation = useCallback(() => {
    if ("geolocation" in navigator) {
      const usePosition = (position: GeolocationPosition) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const location: [number, number] = [lat, lng];
        setUserLocation(location);
        if (mapRef.current) {
          mapRef.current.setView(location, 15);
        }
      };

      const highAccuracyOptions: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      };

      const fallbackOptions: PositionOptions = {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      };

      navigator.geolocation.getCurrentPosition(
        usePosition,
        () => {
          navigator.geolocation.getCurrentPosition(
            usePosition,
            () => {
              toast({
                title: "Location error",
                description:
                  "Unable to get your location. Please enable location services.",
                variant: "destructive",
              });
            },
            fallbackOptions,
          );
        },
        highAccuracyOptions,
      );
    } else {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support location services",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Request location on component mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    if (cleanupEmptyPinsMutation.isPending || pins.length === 0) {
      return;
    }

    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const isOnNewEntryPage = path === "/entries/new";
    const activeNewPinIdRaw = isOnNewEntryPage ? params.get("pinId") : null;
    const parsedActiveNewPinId = activeNewPinIdRaw
      ? Number.parseInt(activeNewPinIdRaw, 10)
      : null;
    const activeNewPinId =
      parsedActiveNewPinId !== null && !Number.isNaN(parsedActiveNewPinId)
        ? parsedActiveNewPinId
        : null;

    const emptyPinIds = pins
      .filter((pin) => (pin.entries?.length ?? 0) === 0)
      .map((pin) => pin.id)
      .filter((pinId) => pinId !== activeNewPinId);

    if (emptyPinIds.length > 0) {
      cleanupEmptyPinsMutation.mutate(emptyPinIds);
    }
  }, [cleanupEmptyPinsMutation, pins]);

  const selectedBaseLayer =
    MAP_BASE_LAYERS.find((layer) => layer.id === mapBaseLayer) ??
    MAP_BASE_LAYERS.find((layer) => layer.id === DEFAULT_MAP_BASE_LAYER) ??
    MAP_BASE_LAYERS[0];

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setIsGearPanelVisible(user?.id ? loadSessionGearVisibility(user.id) : true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [user?.id]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setMapBaseLayer(user?.id ? loadMapBaseLayerPreference(user.id) : DEFAULT_MAP_BASE_LAYER);
      setShowMapLabels(user?.id ? loadMapLabelsVisiblePreference(user.id) : true);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [user?.id]);

  const handleGearPanelVisibilityChange = (visible: boolean) => {
    setIsGearPanelVisible(visible);
    if (visible) {
      setShowLayerMenu(false);
    }
    if (!user?.id) return;
    saveSessionGearVisibility(user.id, visible);
  };

  const handleMapBaseLayerChange = (value: string) => {
    const selectedLayer = MAP_BASE_LAYERS.find((layer) => layer.id === value);
    if (!selectedLayer) return;
    setMapBaseLayer(selectedLayer.id);
    if (!user?.id) return;
    saveMapBaseLayerPreference(user.id, selectedLayer.id);
  };

  const handleMapLabelsChange = (visible: boolean) => {
    setShowMapLabels(visible);
    if (!user?.id) return;
    saveMapLabelsVisiblePreference(user.id, visible);
  };

  const handleLayerMenuToggle = () => {
    setShowLayerMenu((prev) => {
      const next = !prev;
      if (next) {
        setIsGearPanelVisible(false);
        if (user?.id) {
          saveSessionGearVisibility(user.id, false);
        }
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="map-loading">
        <div className="text-center">
          <div className="app-loading-spinner loading-spinner" />
          <p className="map-loading-text">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-shell">
      <MapContainer
        center={initialCenter}
        zoom={userLocation ? 15 : 10}
        className="map-canvas"
        ref={mapRef}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url={selectedBaseLayer.url}
          attribution={selectedBaseLayer.attribution}
          maxZoom={selectedBaseLayer.maxZoom}
          {...(selectedBaseLayer.subdomains
            ? { subdomains: selectedBaseLayer.subdomains }
            : {})}
        />

        {showMapLabels && (
          <TileLayer
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            attribution="Labels &copy; Esri"
            maxZoom={19}
          />
        )}

        <MapClickHandler
          isPinDropMode={isPinDropMode}
          moveEntryId={moveEntryId}
          onPinCreate={handlePinCreate}
          onEntryMove={onEntryMove}
        />
        <MapRefBridge mapRef={mapRef} />
        <UserLocationCenterer
          userLocation={userLocation}
          selectedPinId={selectedPinId}
          hasCenteredOnInitialLocationRef={hasCenteredOnInitialLocation}
        />

        <MapCenterer selectedPinId={selectedPinId} pins={pins} />

        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            zIndexOffset={-1000}
            icon={
              new L.Icon({
                iconUrl:
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Ccircle cx='12' cy='12' r='8'/%3E%3Ccircle cx='12' cy='12' r='3' fill='white'/%3E%3C/svg%3E",
                iconSize: [24, 24],
                iconAnchor: [12, 12],
                className: "user-location-icon",
              })
            }
          >
            <Popup>
              <div className="text-center p-2">
                <h3 className="font-semibold text-gray-900 mb-1">
                  Your Location
                </h3>
                <p className="text-sm text-gray-600">Current position</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Render all pins */}
        {pins.map((pin) => {
          const isSelected = selectedPinId === pin.id;
          return (
            <Marker
              key={pin.id}
              position={[pin.latitude, pin.longitude]}
              zIndexOffset={1000}
              icon={isSelected ? selectedPinIcon : redPinIcon}
              eventHandlers={{
                click: () => onPinSelect(pin.id),
              }}
            ></Marker>
          );
        })}
      </MapContainer>

      {/* Map Controls - positioned for mobile viewport */}
      <div className="map-controls">
        <div className="map-control-stack">
          {isGearPanelVisible && (
            <div className="map-tackle-panel">
              <div className="map-tackle-header">
                <div>
                  <p className="map-tackle-title">Tackle</p>
                  <p className="map-tackle-subtitle">
                    Set quick defaults for your next entry
                  </p>
                </div>
              </div>

              <div id="map-gear-panel-body">
                <label className="map-tackle-label" htmlFor="session-lure-input">
                  Lure
                </label>
                <Input
                  id="session-lure-input"
                  list="session-lure-suggestions"
                  placeholder="What lure are you using?"
                  value={sessionLure}
                  onChange={(e) => onSessionLureChange(e.target.value)}
                  className="map-tackle-input"
                />
                <datalist id="session-lure-suggestions">
                  {lureSuggestions.map((suggestion) => (
                    <option key={suggestion} value={suggestion} />
                  ))}
                </datalist>
                <label
                  className="map-tackle-label map-tackle-label-secondary"
                  htmlFor="session-bait-input"
                >
                  Bait
                </label>
                <Input
                  id="session-bait-input"
                  list="session-bait-suggestions"
                  placeholder="Optional bait"
                  value={sessionBait}
                  onChange={(e) => onSessionBaitChange(e.target.value)}
                  className="map-tackle-input"
                />
                <datalist id="session-bait-suggestions">
                  {baitSuggestions.map((suggestion) => (
                    <option key={suggestion} value={suggestion} />
                  ))}
                </datalist>
              </div>
            </div>
          )}
          <Button
            variant="secondary"
            size="icon"
            className={`touch-target btn-map-control btn-map-control-tackle ${isGearPanelVisible ? "btn-map-control-active" : ""}`}
            onClick={() => handleGearPanelVisibilityChange(!isGearPanelVisible)}
            title="Tackle"
            aria-label="Tackle"
            aria-expanded={isGearPanelVisible}
          >
            <GiFishingLure size={18} />
          </Button>
        </div>
        <div className="map-control-stack">
          {showLayerMenu && (
            <div className="map-layer-menu">
              <p className="map-layer-menu-title">Map Layers</p>
              <div
                role="radiogroup"
                aria-label="Map base layer"
                className="map-layer-menu-list"
              >
                {MAP_BASE_LAYERS.map((layer) => (
                  <label key={layer.id} className="map-layer-menu-option">
                    <input
                      type="radio"
                      name="map-base-layer"
                      value={layer.id}
                      checked={mapBaseLayer === layer.id}
                      onChange={(e) => handleMapBaseLayerChange(e.target.value)}
                      className="h-4 w-4 accent-blue-500"
                    />
                    <span className="settings-meta !m-0 leading-none">
                      {layer.label}
                    </span>
                  </label>
                ))}
              </div>
              <label className="map-layer-menu-option">
                <input
                  type="checkbox"
                  checked={showMapLabels}
                  onChange={(e) => handleMapLabelsChange(e.target.checked)}
                  className="h-4 w-4 accent-blue-500"
                />
                <span className="settings-meta !m-0 leading-none">
                  Show Labels
                </span>
              </label>
            </div>
          )}
          <Button
            variant="secondary"
            size="icon"
            className={`touch-target btn-map-control ${showLayerMenu ? "btn-map-control-active" : ""}`}
            onClick={handleLayerMenuToggle}
            title="Map layers"
            aria-label="Map layers"
            aria-expanded={showLayerMenu}
          >
            <FaLayerGroup size={16} />
          </Button>
        </div>
        <Button
          variant="secondary"
          size="icon"
          className="touch-target btn-map-control"
          onClick={zoomIn}
        >
          <FaPlus size={16} />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="touch-target btn-map-control"
          onClick={zoomOut}
        >
          <FaMinus size={16} />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="touch-target btn-map-control"
          onClick={goToUserLocation}
          title="Go to my location"
        >
          <FaLocationArrow size={16} />
        </Button>
      </div>

      {/* Add Pin Menu - positioned for mobile viewport */}
      <div className="map-actions">
        {showPinMenu && (
          <div className="map-pin-menu">
            <div className="map-pin-menu-header">
              <p className="map-pin-menu-title">Add Journal Entry</p>
              <button
                type="button"
                className="map-pin-menu-close"
                onClick={() => setShowPinMenu(false)}
                aria-label="Close new entry menu"
              >
                <FaXmark size={16} />
              </button>
            </div>
            <Button
              className="map-pin-option map-pin-option-current"
              onClick={handleAddPinAtLocation}
              disabled={!userLocation}
            >
              <FaCrosshairs size={16} />
              Pin at my location
            </Button>
            <Button
              className={`map-pin-option ${isPinDropMode ? "map-pin-option-cancel" : "map-pin-option-drop"}`}
              onClick={() => {
                setShowPinMenu(false);
                onPinDropModeChange(!isPinDropMode);
              }}
            >
              <FaMapLocationDot size={16} />
              {isPinDropMode ? "Cancel drop mode" : "Drop pin on map"}
            </Button>
          </div>
        )}

        <Button
          className={`touch-target btn-map-action btn-map-action-entry ${isPinDropMode ? "btn-map-action-pin-active" : "btn-map-action-pin"}`}
          onClick={() => setShowPinMenu((prev) => !prev)}
          title="Add journal entry"
        >
          <span className="map-entry-button-label">
            {showPinMenu ? "Close" : "New Entry"}
          </span>
          <FaBookBookmark size={20} />
        </Button>
      </div>

      {/* Pin Drop Mode Indicator - positioned for mobile viewport */}
      {(isPinDropMode || moveEntryId) && (
        <div className="map-mode-indicator">
          <p>
            {moveEntryId
              ? "Touch the map for a new pin or tap an existing pin to move this entry"
              : "Touch the map to create an entry"}
          </p>
        </div>
      )}
    </div>
  );
}
