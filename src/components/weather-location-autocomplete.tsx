import { useEffect, useRef } from "react";
import { APIProvider, useMapsLibrary } from "@vis.gl/react-google-maps";
import { Input, type InputProps } from "@/components/ui/input";
import type { WeatherLocation } from "@/lib/weather-locations";

type WeatherLocationAutocompleteProps = Omit<InputProps, "onSelect"> & {
  apiKey?: string;
  onPlaceSelect: (location: WeatherLocation) => void;
};

function getAddressComponent(
  place: google.maps.places.PlaceResult,
  type: string,
) {
  return place.address_components?.find((component) => component.types.includes(type));
}

function mapPlaceToWeatherLocation(
  place: google.maps.places.PlaceResult,
): WeatherLocation | null {
  const latitude = place.geometry?.location?.lat();
  const longitude = place.geometry?.location?.lng();

  if (latitude == null || longitude == null) {
    return null;
  }

  const stateComponent = getAddressComponent(place, "administrative_area_level_1");
  const countryComponent = getAddressComponent(place, "country");
  const localityComponent =
    getAddressComponent(place, "locality") ??
    getAddressComponent(place, "postal_town") ??
    getAddressComponent(place, "administrative_area_level_2");

  const name =
    localityComponent?.long_name?.trim() ||
    place.name?.trim() ||
    place.formatted_address?.split(",")[0]?.trim() ||
    "Selected location";

  return {
    id: place.place_id ? `google:${place.place_id}` : `google:${name}:${latitude}:${longitude}`,
    name,
    latitude,
    longitude,
    admin1: stateComponent?.long_name?.trim() || null,
    country: countryComponent?.long_name?.trim() || null,
    timezone: null,
  };
}

function WeatherLocationAutocompleteInput({
  onPlaceSelect,
  ...inputProps
}: Omit<WeatherLocationAutocompleteProps, "apiKey">) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const places = useMapsLibrary("places");

  useEffect(() => {
    if (!places || !inputRef.current || autocompleteRef.current) {
      return;
    }

    const autocomplete = new places.Autocomplete(inputRef.current, {
      fields: [
        "address_components",
        "formatted_address",
        "geometry",
        "name",
        "place_id",
      ],
    });

    const listener = autocomplete.addListener("place_changed", () => {
      const mappedLocation = mapPlaceToWeatherLocation(autocomplete.getPlace());
      if (mappedLocation) {
        onPlaceSelect(mappedLocation);
      }
    });

    autocompleteRef.current = autocomplete;

    return () => {
      listener.remove();
      google.maps.event.clearInstanceListeners(autocomplete);
      autocompleteRef.current = null;
    };
  }, [onPlaceSelect, places]);

  return <Input ref={inputRef} {...inputProps} />;
}

export function WeatherLocationAutocomplete({
  apiKey,
  onPlaceSelect,
  ...inputProps
}: WeatherLocationAutocompleteProps) {
  if (!apiKey) {
    return <Input {...inputProps} />;
  }

  return (
    <APIProvider apiKey={apiKey} solutionChannel="catchlogs_weather_location_autocomplete">
      <WeatherLocationAutocompleteInput
        {...inputProps}
        onPlaceSelect={onPlaceSelect}
      />
    </APIProvider>
  );
}
