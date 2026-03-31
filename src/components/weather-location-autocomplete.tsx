import { Input, type InputProps } from "@/components/ui/input";
import type { WeatherLocation } from "@/lib/weather-locations";

type WeatherLocationAutocompleteProps = Omit<InputProps, "onSelect"> & {
  apiKey?: string;
  onPlaceSelect: (location: WeatherLocation) => void;
};

export function WeatherLocationAutocomplete({
  onPlaceSelect: _onPlaceSelect,
  apiKey: _apiKey,
  ...inputProps
}: WeatherLocationAutocompleteProps) {
  return <Input {...inputProps} />;
}
