/*
 * File:        src/lib/weather.ts
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
import type { UnitSystem } from "@/lib/unit-preferences";

export type WeatherSnapshot = {
  temperature?: number | null;
  windSpeed?: number | null;
  windDirection?: number | null;
  cloudCoverage?: number | null;
  pressure?: number | null;
  precipitationProbability?: number | null;
  visibility?: number | null;
  weatherCondition?: string | null;
  weatherDescription?: string | null;
  sunrise?: string | null;
  sunset?: string | null;
  observedTime?: string | null;
};

export type WeatherForecastHourlyPoint = {
  time: string;
  temperature: number | null;
  temperatureLow: number | null;
  temperatureHigh: number | null;
  pressure: number | null;
  cloudCoverage: number | null;
  precipitationProbability: number | null;
  windSpeed: number | null;
  windDirection: number | null;
};

export type WeatherForecastDailyPoint = {
  date: string;
  temperature: number | null;
  temperatureLow: number | null;
  temperatureHigh: number | null;
  pressure: number | null;
  cloudCoverage: number | null;
  precipitationProbability: number | null;
  windSpeed: number | null;
  windDirection: number | null;
};

export type WeatherForecast = {
  hourly: WeatherForecastHourlyPoint[];
  daily: WeatherForecastDailyPoint[];
};

type HourlyResponse = {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    windspeed_10m?: number[];
    winddirection_10m?: number[];
    cloudcover?: number[];
    pressure_msl?: number[];
    precipitation_probability?: number[];
    visibility?: number[];
    weathercode?: number[];
  };
  daily?: {
    time?: string[];
    temperature_2m_mean?: number[];
    temperature_2m_min?: number[];
    temperature_2m_max?: number[];
    pressure_msl_mean?: number[];
    cloudcover_mean?: number[];
    precipitation_probability_max?: number[];
    windspeed_10m_mean?: number[];
    winddirection_10m_dominant?: number[];
    sunrise?: string[];
    sunset?: string[];
  };
};

const WEATHER_CODE_MAP: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

function weatherCodeToDescription(code?: number): string | null {
  if (code === undefined || code === null) {
    return null;
  }
  return WEATHER_CODE_MAP[code] ?? `Weather code ${code}`;
}

function toIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function findNearestIndex(targetIso: string, times: string[]): number {
  const targetMs = new Date(targetIso).getTime();
  let nearestIndex = 0;
  let nearestDiff = Number.POSITIVE_INFINITY;

  for (let i = 0; i < times.length; i += 1) {
    const diff = Math.abs(new Date(times[i]).getTime() - targetMs);
    if (diff < nearestDiff) {
      nearestDiff = diff;
      nearestIndex = i;
    }
  }

  return nearestIndex;
}

async function fetchHourlyWeather(url: URL): Promise<HourlyResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as HourlyResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getWeatherForLocationAndTime(
  latitude: number,
  longitude: number,
  isoDateTime: string,
  unitSystem: UnitSystem = "imperial",
): Promise<WeatherSnapshot | null> {
  const entryDate = new Date(isoDateTime);
  if (Number.isNaN(entryDate.getTime())) {
    return null;
  }

  const today = new Date();
  const entryDay = toIsoDate(entryDate);
  const todayDay = toIsoDate(today);
  const isPastDay = entryDay < todayDay;

  const endpoint = isPastDay
    ? "https://archive-api.open-meteo.com/v1/archive"
    : "https://api.open-meteo.com/v1/forecast";

  const url = new URL(endpoint);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("start_date", entryDay);
  url.searchParams.set("end_date", entryDay);
  url.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "windspeed_10m",
      "winddirection_10m",
      "cloudcover",
      "pressure_msl",
      "precipitation_probability",
      "visibility",
      "weathercode",
    ].join(","),
  );
  url.searchParams.set("daily", ["sunrise", "sunset"].join(","));
  url.searchParams.set("temperature_unit", unitSystem === "metric" ? "celsius" : "fahrenheit");
  url.searchParams.set("wind_speed_unit", unitSystem === "metric" ? "kmh" : "mph");
  url.searchParams.set("timezone", "auto");

  const weather = await fetchHourlyWeather(url);
  const hourly = weather?.hourly;
  const times = hourly?.time;
  if (!times || times.length === 0) {
    return null;
  }

  const index = findNearestIndex(isoDateTime, times);
  const code = hourly.weathercode?.[index];
  const description = weatherCodeToDescription(code);

  return {
    temperature: hourly.temperature_2m?.[index] ?? null,
    windSpeed: hourly.windspeed_10m?.[index] ?? null,
    windDirection: hourly.winddirection_10m?.[index] ?? null,
    cloudCoverage: hourly.cloudcover?.[index] ?? null,
    pressure: hourly.pressure_msl?.[index] ?? null,
    precipitationProbability: hourly.precipitation_probability?.[index] ?? null,
    visibility: hourly.visibility?.[index] ?? null,
    weatherCondition: description ? description.toLowerCase() : null,
    weatherDescription: description,
    sunrise: weather.daily?.sunrise?.[0] ?? null,
    sunset: weather.daily?.sunset?.[0] ?? null,
    observedTime: hourly.time?.[index] ?? null,
  };
}

export async function getCurrentWeatherForLocation(
  latitude: number,
  longitude: number,
  unitSystem: UnitSystem = "imperial",
): Promise<WeatherSnapshot | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "windspeed_10m",
      "winddirection_10m",
      "cloudcover",
      "pressure_msl",
      "precipitation_probability",
      "visibility",
      "weathercode",
    ].join(","),
  );
  url.searchParams.set("daily", ["sunrise", "sunset"].join(","));
  url.searchParams.set("temperature_unit", unitSystem === "metric" ? "celsius" : "fahrenheit");
  url.searchParams.set("wind_speed_unit", unitSystem === "metric" ? "kmh" : "mph");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "1");

  const weather = await fetchHourlyWeather(url);
  const hourly = weather?.hourly;
  const times = hourly?.time;
  if (!times || times.length === 0) {
    return null;
  }

  const index = findNearestIndex(new Date().toISOString(), times);
  const code = hourly.weathercode?.[index];
  const description = weatherCodeToDescription(code);

  return {
    temperature: hourly.temperature_2m?.[index] ?? null,
    windSpeed: hourly.windspeed_10m?.[index] ?? null,
    windDirection: hourly.winddirection_10m?.[index] ?? null,
    cloudCoverage: hourly.cloudcover?.[index] ?? null,
    pressure: hourly.pressure_msl?.[index] ?? null,
    precipitationProbability: hourly.precipitation_probability?.[index] ?? null,
    visibility: hourly.visibility?.[index] ?? null,
    weatherCondition: description ? description.toLowerCase() : null,
    weatherDescription: description,
    sunrise: weather.daily?.sunrise?.[0] ?? null,
    sunset: weather.daily?.sunset?.[0] ?? null,
    observedTime: hourly.time?.[index] ?? null,
  };
}

export async function getWeatherForecastForLocation(
  latitude: number,
  longitude: number,
  unitSystem: UnitSystem = "imperial",
): Promise<WeatherForecast | null> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set(
    "hourly",
    [
      "temperature_2m",
      "pressure_msl",
      "cloudcover",
      "precipitation_probability",
      "windspeed_10m",
      "winddirection_10m",
    ].join(","),
  );
  url.searchParams.set(
    "daily",
    [
      "temperature_2m_mean",
      "temperature_2m_min",
      "temperature_2m_max",
      "pressure_msl_mean",
      "cloudcover_mean",
      "precipitation_probability_max",
      "windspeed_10m_mean",
      "winddirection_10m_dominant",
    ].join(","),
  );
  url.searchParams.set("temperature_unit", unitSystem === "metric" ? "celsius" : "fahrenheit");
  url.searchParams.set("wind_speed_unit", unitSystem === "metric" ? "kmh" : "mph");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "10");
  url.searchParams.set("forecast_hours", "24");

  const weather = await fetchHourlyWeather(url);
  const hourlyTimes = weather?.hourly?.time;
  const dailyTimes = weather?.daily?.time;

  if (!hourlyTimes?.length || !dailyTimes?.length) {
    return null;
  }

  return {
    hourly: hourlyTimes.map((time, index) => ({
      time,
      temperature: weather.hourly?.temperature_2m?.[index] ?? null,
      temperatureLow: weather.hourly?.temperature_2m?.[index] ?? null,
      temperatureHigh: weather.hourly?.temperature_2m?.[index] ?? null,
      pressure: weather.hourly?.pressure_msl?.[index] ?? null,
      cloudCoverage: weather.hourly?.cloudcover?.[index] ?? null,
      precipitationProbability: weather.hourly?.precipitation_probability?.[index] ?? null,
      windSpeed: weather.hourly?.windspeed_10m?.[index] ?? null,
      windDirection: weather.hourly?.winddirection_10m?.[index] ?? null,
    })),
    daily: dailyTimes.map((date, index) => ({
      date,
      temperature: weather.daily?.temperature_2m_mean?.[index] ?? null,
      temperatureLow: weather.daily?.temperature_2m_min?.[index] ?? null,
      temperatureHigh: weather.daily?.temperature_2m_max?.[index] ?? null,
      pressure: weather.daily?.pressure_msl_mean?.[index] ?? null,
      cloudCoverage: weather.daily?.cloudcover_mean?.[index] ?? null,
      precipitationProbability: weather.daily?.precipitation_probability_max?.[index] ?? null,
      windSpeed: weather.daily?.windspeed_10m_mean?.[index] ?? null,
      windDirection: weather.daily?.winddirection_10m_dominant?.[index] ?? null,
    })),
  };
}
