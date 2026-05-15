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
  components:
    | google.maps.GeocoderAddressComponent[]
    | google.maps.places.AddressComponent[]
    | undefined,
  type: string,
) {
  return components?.find((component) => component.types.includes(type)) ?? null;
}

function getAddressComponentLongName(
  component:
    | google.maps.GeocoderAddressComponent
    | google.maps.places.AddressComponent
    | null,
) {
  if (!component) {
    return null;
  }

  return "longText" in component ? component.longText : component.long_name;
}

function getAddressComponentShortName(
  component:
    | google.maps.GeocoderAddressComponent
    | google.maps.places.AddressComponent
    | null,
) {
  if (!component) {
    return null;
  }

  return "shortText" in component ? component.shortText : component.short_name;
}

function mapPlaceToWeatherLocation(
  place: google.maps.places.Place,
): WeatherLocation | null {
  const latitude = place.location?.lat();
  const longitude = place.location?.lng();
  const placeId = place.id?.trim();

  if (latitude == null || longitude == null || !placeId) {
    return null;
  }

  const addressComponents = place.addressComponents;
  const countryComponent = getAddressComponent(addressComponents, "country");
  const adminComponent = getAddressComponent(
    addressComponents,
    "administrative_area_level_1",
  );
  const countryCode =
    getAddressComponentShortName(countryComponent)?.toUpperCase() ?? null;
  const locality =
    getAddressComponentLongName(
      getAddressComponent(addressComponents, "locality"),
    ) ??
    getAddressComponentLongName(
      getAddressComponent(addressComponents, "postal_town"),
    ) ??
    getAddressComponentLongName(
      getAddressComponent(addressComponents, "administrative_area_level_2"),
    ) ??
    place.displayName?.trim() ??
    place.formattedAddress?.split(",")[0]?.trim() ??
    "Selected location";
  const country = getAddressComponentLongName(countryComponent);

  return {
    id: `google:${placeId}`,
    name: locality,
    latitude,
    longitude,
    admin1:
      countryCode === "US"
        ? getAddressComponentShortName(adminComponent)?.trim() || null
        : getAddressComponentLongName(adminComponent)?.trim() || null,
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
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [predictions, setPredictions] = useState<
    google.maps.places.PlacePrediction[]
  >([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const query = useMemo(
    () => (typeof value === "string" ? value.trim() : ""),
    [value],
  );

  useEffect(() => {
    if (!places) {
      return;
    }

    sessionTokenRef.current = new places.AutocompleteSessionToken();
  }, [places]);

  useEffect(() => {
    if (!places || query.length < 2) {
      return;
    }

    let isCancelled = false;

    const fetchPredictions = async () => {
      try {
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new places.AutocompleteSessionToken();
        }

        const response =
          await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: query,
            sessionToken: sessionTokenRef.current ?? undefined,
          includedPrimaryTypes: ["(regions)"],
          });

        if (isCancelled) {
          return;
        }

        const nextPredictions = response.suggestions
          .map((suggestion) => suggestion.placePrediction)
          .filter((prediction): prediction is google.maps.places.PlacePrediction =>
            Boolean(prediction),
          );
        setPredictions(nextPredictions);
        setIsDropdownOpen(nextPredictions.length > 0);
        setActiveIndex(nextPredictions.length > 0 ? 0 : -1);
      } catch {
        if (!isCancelled) {
          setPredictions([]);
          setIsDropdownOpen(false);
          setActiveIndex(-1);
        }
      }
    };

    void fetchPredictions();

    return () => {
      isCancelled = true;
    };
  }, [places, query]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  const selectPrediction = async (
    prediction: google.maps.places.PlacePrediction,
  ) => {
    if (!places) {
      return;
    }

    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: [
          "id",
          "displayName",
          "formattedAddress",
          "location",
          "addressComponents",
        ],
      });
      const location = mapPlaceToWeatherLocation(place);
      if (!location) {
        return;
      }

      setPredictions([]);
      setIsDropdownOpen(false);
      setActiveIndex(-1);
      sessionTokenRef.current = new places.AutocompleteSessionToken();
      onPlaceSelect(location);
    } catch {
      setPredictions([]);
      setIsDropdownOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange?.(event);
    if (event.target.value.trim().length < 2) {
      setPredictions([]);
      setIsDropdownOpen(false);
      setActiveIndex(-1);
    }
  };

  const isOpen = isDropdownOpen && query.length >= 2 && predictions.length > 0;

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
        void selectPrediction(prediction);
      }
      return;
    }

    if (event.key === "Escape") {
      setIsDropdownOpen(false);
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
            setIsDropdownOpen(true);
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
              <li key={prediction.placeId} role="presentation">
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
                    void selectPrediction(prediction);
                  }}
                >
                  <span className="resources-weather-autocomplete-item-icon">
                    <FaLocationArrow size={14} />
                  </span>
                  <span className="resources-weather-autocomplete-item-copy">
                    <span className="resources-weather-autocomplete-item-title">
                      {prediction.mainText?.text ?? prediction.text.text}
                    </span>
                    <span className="resources-weather-autocomplete-item-meta">
                      {prediction.secondaryText?.text ?? prediction.text.text}
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
