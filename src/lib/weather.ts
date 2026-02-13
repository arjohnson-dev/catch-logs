type WeatherSnapshot = {
  temperature?: number | null;
  windSpeed?: number | null;
  windDirection?: number | null;
  cloudCoverage?: number | null;
  visibility?: number | null;
  weatherCondition?: string | null;
  weatherDescription?: string | null;
};

type HourlyResponse = {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    windspeed_10m?: number[];
    winddirection_10m?: number[];
    cloudcover?: number[];
    visibility?: number[];
    weathercode?: number[];
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
    "temperature_2m,windspeed_10m,winddirection_10m,cloudcover,visibility,weathercode",
  );
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("windspeed_unit", "mph");
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
    visibility: hourly.visibility?.[index] ?? null,
    weatherCondition: description ? description.toLowerCase() : null,
    weatherDescription: description,
  };
}
