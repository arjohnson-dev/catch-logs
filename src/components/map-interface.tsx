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
  FaLocationArrow,
  FaMapLocationDot,
  FaMinus,
  FaPlus,
  FaXmark,
} from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type Pin, type PinWithEntries } from "@/types/domain";
import { useToast } from "@/hooks/use-toast";
import { createPin, getPinsWithEntries } from "@/lib/supabase-data";
import { getEntries } from "@/lib/supabase-data";
import { useAuth } from "@/hooks/useAuth";
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
  sessionTackle: string;
  onSessionTackleChange: (value: string) => void;
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

function MapRefBridge({
  mapRef,
}: {
  mapRef: { current: L.Map | null };
}) {
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
    if (selectedPinId !== null) return;
    if (hasCenteredOnInitialLocationRef.current) return;

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
  sessionTackle,
  onSessionTackleChange,
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
  const initialCenter: [number, number] = [46.8772, -96.7898];

  const { data: pins = [], isLoading } = useQuery<PinWithEntries[]>({
    queryKey: ["pins"],
    queryFn: getPinsWithEntries,
  });
  const { data: entries = [] } = useQuery({
    queryKey: ["entries"],
    queryFn: getEntries,
  });

  const tackleSuggestions = Array.from(
    new Set(
      entries
        .map((entry) => entry.tackle?.trim())
        .filter((tackle): tackle is string =>
          Boolean(tackle && tackle.length > 0),
        ),
    ),
  )
    .filter((tackle) =>
      tackle.toLowerCase().includes(sessionTackle.toLowerCase()),
    )
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
      queryClient.invalidateQueries({ queryKey: ["pins"] });
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

  if (isLoading) {
    return (
      <div className="map-loading">
        <div className="text-center">
          <div className="app-loading-spinner" />
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
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
        />

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

      <div className="map-tackle-panel">
        <label className="map-tackle-label" htmlFor="session-tackle-input">
          Tackle
        </label>
        <Input
          id="session-tackle-input"
          list="session-tackle-suggestions"
          placeholder="What are you fishing with?"
          value={sessionTackle}
          onChange={(e) => onSessionTackleChange(e.target.value)}
          className="map-tackle-input"
        />
        <datalist id="session-tackle-suggestions">
          {tackleSuggestions.map((suggestion) => (
            <option key={suggestion} value={suggestion} />
          ))}
        </datalist>
      </div>

      {/* Add Pin Menu - positioned for mobile viewport */}
      <div className="map-actions">
        {showPinMenu && (
          <div className="map-pin-menu">
            <button
              type="button"
              className="map-pin-menu-close"
              onClick={() => setShowPinMenu(false)}
              aria-label="Close new entry menu"
            >
              <FaXmark size={16} />
            </button>
            <p className="map-pin-menu-title">Add Journal Entry</p>
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
          <p>{moveEntryId ? "Touch the map to move this entry" : "Touch the map to create an entry"}</p>
        </div>
      )}
    </div>
  );
}
