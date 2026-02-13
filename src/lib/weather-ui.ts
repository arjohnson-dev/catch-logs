import {
  FaCloud,
  FaCloudRain,
  FaCloudSun,
  FaSnowflake,
  FaSun,
} from "react-icons/fa6";
import type { IconType } from "react-icons";

type WeatherVisual = {
  Icon: IconType;
  colorClass: string;
};

export function getWeatherVisual(condition?: string | null): WeatherVisual {
  const lowerCondition = (condition ?? "").toLowerCase();

  if (lowerCondition.includes("rain") || lowerCondition.includes("drizzle")) {
    return { Icon: FaCloudRain, colorClass: "text-blue-400" };
  }
  if (lowerCondition.includes("snow")) {
    return { Icon: FaSnowflake, colorClass: "text-sky-200" };
  }
  if (
    lowerCondition.includes("partly cloudy") ||
    lowerCondition.includes("partly cloud") ||
    lowerCondition.includes("mainly clear")
  ) {
    return { Icon: FaCloudSun, colorClass: "text-amber-300" };
  }
  if (lowerCondition.includes("clear")) {
    return { Icon: FaSun, colorClass: "text-yellow-300" };
  }
  if (
    lowerCondition.includes("cloud") ||
    lowerCondition.includes("overcast") ||
    lowerCondition.includes("fog")
  ) {
    return { Icon: FaCloud, colorClass: "text-gray-400" };
  }

  return { Icon: FaCloud, colorClass: "text-gray-400" };
}

export function getWindDirection(degrees: number | null): string {
  if (degrees === null || degrees === undefined) return "";

  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];

  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

export function formatVisibility(meters: number | null): string {
  if (meters === null || meters === undefined) return "";
  if (meters >= 10000) return "10+ km";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}
