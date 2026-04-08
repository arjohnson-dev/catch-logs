import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { FaLocationArrow } from "react-icons/fa6";
import { useMapsLibrary } from "@vis.gl/react-google-maps";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { WeatherLocation } from "@/lib/weather-locations";

type WeatherLocationAutocompleteProps = Omit<InputProps, "onSelect"> & {
  onPlaceSelect: (location: WeatherLocation) => void;
};

function getAddressComponent(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  type: string,
) {
  return components?.find((component) => component.types.includes(type)) ?? null;
}

function mapPlaceToWeatherLocation(place: google.maps.places.PlaceResult): WeatherLocation | null {
  const latitude = place.geometry?.location?.lat();
  const longitude = place.geometry?.location?.lng();
  const placeId = place.place_id?.trim();

  if (latitude == null || longitude == null || !placeId) {
    return null;
  }

  const countryCode =
    getAddressComponent(place.address_components, "country")?.short_name?.toUpperCase() ?? null;
  const locality =
    getAddressComponent(place.address_components, "locality")?.long_name ??
    getAddressComponent(place.address_components, "postal_town")?.long_name ??
    getAddressComponent(place.address_components, "administrative_area_level_2")?.long_name ??
    place.name?.trim() ??
    place.formatted_address?.split(",")[0]?.trim() ??
    "Selected location";
  const adminComponent = getAddressComponent(place.address_components, "administrative_area_level_1");
  const country = getAddressComponent(place.address_components, "country")?.long_name ?? null;

  return {
    id: `google:${placeId}`,
    name: locality,
    latitude,
    longitude,
    admin1:
      countryCode === "US"
        ? adminComponent?.short_name?.trim() || null
        : adminComponent?.long_name?.trim() || null,
    country,
    timezone: null,
  };
}

export function WeatherLocationAutocomplete({
  onPlaceSelect,
  onChange,
  value,
  className,
  id,
  ...inputProps
}: WeatherLocationAutocompleteProps) {
  const generatedId = useId();
  const inputId = id ?? `weather-location-search-${generatedId}`;
  const listboxId = `${inputId}-listbox`;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const places = useMapsLibrary("places");
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);

  const query = useMemo(() => (typeof value === "string" ? value.trim() : ""), [value]);

  useEffect(() => {
    if (!places) {
      return;
    }

    autocompleteServiceRef.current = new places.AutocompleteService();
    placesServiceRef.current = new places.PlacesService(document.createElement("div"));
    sessionTokenRef.current = new places.AutocompleteSessionToken();
  }, [places]);

  useEffect(() => {
    if (!autocompleteServiceRef.current || query.length < 2) {
      setPredictions([]);
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    let isCancelled = false;

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: query,
        sessionToken: sessionTokenRef.current ?? undefined,
        types: ["(regions)"],
      },
      (results, status) => {
        if (isCancelled) {
          return;
        }

        if (
          status !== google.maps.places.PlacesServiceStatus.OK &&
          status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS
        ) {
          setPredictions([]);
          setIsOpen(false);
          setActiveIndex(-1);
          return;
        }

        const nextPredictions = results ?? [];
        setPredictions(nextPredictions);
        setIsOpen(nextPredictions.length > 0);
        setActiveIndex(nextPredictions.length > 0 ? 0 : -1);
      },
    );

    return () => {
      isCancelled = true;
    };
  }, [query]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const selectPrediction = (prediction: google.maps.places.AutocompletePrediction) => {
    if (!placesServiceRef.current) {
      return;
    }

    placesServiceRef.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["address_components", "formatted_address", "geometry", "name", "place_id"],
        sessionToken: sessionTokenRef.current ?? undefined,
      },
      (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
          return;
        }

        const location = mapPlaceToWeatherLocation(place);
        if (!location) {
          return;
        }

        setPredictions([]);
        setIsOpen(false);
        setActiveIndex(-1);
        sessionTokenRef.current = places ? new places.AutocompleteSessionToken() : null;
        onPlaceSelect(location);
      },
    );
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    if (event.target.value.trim().length < 2) {
      setPredictions([]);
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || predictions.length === 0) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % predictions.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? predictions.length - 1 : current - 1));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const prediction = predictions[activeIndex] ?? predictions[0];
      if (prediction) {
        selectPrediction(prediction);
      }
      return;
    }

    if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="resources-weather-autocomplete" ref={wrapperRef}>
      <Input
        {...inputProps}
        id={inputId}
        value={value}
        className={cn(className, "resources-weather-autocomplete-input")}
        onChange={handleChange}
        onFocus={() => {
          if (predictions.length > 0) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={
          activeIndex >= 0 ? `${inputId}-option-${activeIndex}` : undefined
        }
      />

      {isOpen && predictions.length > 0 ? (
        <div className="resources-weather-autocomplete-panel">
          <ul id={listboxId} className="resources-weather-autocomplete-list" role="listbox">
            {predictions.map((prediction, index) => (
              <li key={prediction.place_id} role="presentation">
                <button
                  type="button"
                  id={`${inputId}-option-${index}`}
                  className={cn(
                    "resources-weather-autocomplete-item",
                    index === activeIndex && "is-active",
                  )}
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(event) => {
                    event.preventDefault();
                  }}
                  onClick={() => {
                    selectPrediction(prediction);
                  }}
                >
                  <span className="resources-weather-autocomplete-item-icon">
                    <FaLocationArrow size={14} />
                  </span>
                  <span className="resources-weather-autocomplete-item-copy">
                    <span className="resources-weather-autocomplete-item-title">
                      {prediction.structured_formatting.main_text}
                    </span>
                    <span className="resources-weather-autocomplete-item-meta">
                      {prediction.structured_formatting.secondary_text ?? prediction.description}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
