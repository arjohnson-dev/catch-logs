export type WeatherLocation = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string | null;
  country?: string | null;
  timezone?: string | null;
};

type GeocodingSearchResponse = {
  results?: Array<{
    id?: number;
    name: string;
    latitude: number;
    longitude: number;
    admin1?: string;
    country?: string;
    timezone?: string;
  }>;
  error?: boolean;
  reason?: string;
};

type ReverseGeocodingResponse = {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
};

type NominatimSearchResponse = Array<{
  place_id?: number;
  lat: string;
  lon: string;
  name?: string;
  display_name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    hamlet?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    country_code?: string;
  };
}>;

type GeocodingSearchResult = NonNullable<GeocodingSearchResponse["results"]>[number];

const SAVED_WEATHER_LOCATIONS_KEY_PREFIX = "catchlogs:weather-locations:";
const ACTIVE_WEATHER_LOCATION_KEY_PREFIX = "catchlogs:weather-active-location:";
const GUEST_WEATHER_LOCATION_KEY = "guest";
const PLACE_ABBREVIATION_VARIANTS: Record<string, string[]> = {
  st: ["st.", "saint"],
  "st.": ["st", "saint"],
  mt: ["mt.", "mount"],
  "mt.": ["mt", "mount"],
  ft: ["ft.", "fort"],
  "ft.": ["ft", "fort"],
  ste: ["ste.", "sainte"],
  "ste.": ["ste", "sainte"],
};
const US_STATE_CODES: Record<string, string> = {
  Alabama: "AL",
  Alaska: "AK",
  Arizona: "AZ",
  Arkansas: "AR",
  California: "CA",
  Colorado: "CO",
  Connecticut: "CT",
  Delaware: "DE",
  Florida: "FL",
  Georgia: "GA",
  Hawaii: "HI",
  Idaho: "ID",
  Illinois: "IL",
  Indiana: "IN",
  Iowa: "IA",
  Kansas: "KS",
  Kentucky: "KY",
  Louisiana: "LA",
  Maine: "ME",
  Maryland: "MD",
  Massachusetts: "MA",
  Michigan: "MI",
  Minnesota: "MN",
  Mississippi: "MS",
  Missouri: "MO",
  Montana: "MT",
  Nebraska: "NE",
  Nevada: "NV",
  "New Hampshire": "NH",
  "New Jersey": "NJ",
  "New Mexico": "NM",
  "New York": "NY",
  "North Carolina": "NC",
  "North Dakota": "ND",
  Ohio: "OH",
  Oklahoma: "OK",
  Oregon: "OR",
  Pennsylvania: "PA",
  "Rhode Island": "RI",
  "South Carolina": "SC",
  "South Dakota": "SD",
  Tennessee: "TN",
  Texas: "TX",
  Utah: "UT",
  Vermont: "VT",
  Virginia: "VA",
  Washington: "WA",
  "West Virginia": "WV",
  Wisconsin: "WI",
  Wyoming: "WY",
  "District of Columbia": "DC",
};
const US_STATE_NAMES_BY_CODE = Object.fromEntries(
  Object.entries(US_STATE_CODES).map(([name, code]) => [code, name]),
) as Record<string, string>;

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getUserStorageKey(userId?: string | null) {
  return userId ?? GUEST_WEATHER_LOCATION_KEY;
}

function getSavedLocationsKey(userId?: string | null) {
  return `${SAVED_WEATHER_LOCATIONS_KEY_PREFIX}${getUserStorageKey(userId)}`;
}

function getActiveLocationKey(userId?: string | null) {
  return `${ACTIVE_WEATHER_LOCATION_KEY_PREFIX}${getUserStorageKey(userId)}`;
}

function isWeatherLocation(value: unknown): value is WeatherLocation {
  if (!value || typeof value !== "object") {
    return false;
  }

  const location = value as Record<string, unknown>;
  return (
    typeof location.id === "string" &&
    typeof location.name === "string" &&
    typeof location.latitude === "number" &&
    Number.isFinite(location.latitude) &&
    typeof location.longitude === "number" &&
    Number.isFinite(location.longitude) &&
    (location.admin1 === undefined || location.admin1 === null || typeof location.admin1 === "string") &&
    (location.country === undefined || location.country === null || typeof location.country === "string") &&
    (location.timezone === undefined || location.timezone === null || typeof location.timezone === "string")
  );
}

function sanitizeWeatherLocation(location: WeatherLocation): WeatherLocation {
  return {
    id: location.id,
    name: location.name.trim(),
    latitude: location.latitude,
    longitude: location.longitude,
    admin1: location.admin1?.trim() || null,
    country: location.country?.trim() || null,
    timezone: location.timezone?.trim() || null,
  };
}

function parseStoredWeatherLocations(raw: string | null) {
  if (!raw) {
    return [] as WeatherLocation[];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isWeatherLocation)
      .map(sanitizeWeatherLocation);
  } catch {
    return [];
  }
}

function parseStoredWeatherLocation(raw: string | null) {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isWeatherLocation(parsed)) {
      return null;
    }

    return sanitizeWeatherLocation(parsed);
  } catch {
    return null;
  }
}

function buildWeatherLocationId(input: {
  id?: number;
  name: string;
  latitude: number;
  longitude: number;
}) {
  if (input.id !== undefined) {
    return `geocode:${input.id}`;
  }

  return `coords:${input.name.toLowerCase()}:${input.latitude.toFixed(4)}:${input.longitude.toFixed(4)}`;
}

function mapSearchResultToWeatherLocation(
  result: GeocodingSearchResult,
): WeatherLocation {
  return {
    id: buildWeatherLocationId({
      id: result.id,
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
    }),
    name: result.name,
    latitude: result.latitude,
    longitude: result.longitude,
    admin1: result.admin1 ?? null,
    country: result.country ?? null,
    timezone: result.timezone ?? null,
  };
}

export function createDeviceWeatherLocation(latitude: number, longitude: number): WeatherLocation {
  return {
    id: buildWeatherLocationId({
      name: "Current location",
      latitude,
      longitude,
    }),
    name: "Current location",
    latitude,
    longitude,
    admin1: null,
    country: null,
    timezone: null,
  };
}

export function loadSavedWeatherLocations(userId?: string | null) {
  const storage = getStorage();
  if (!storage) {
    return [] as WeatherLocation[];
  }

  return parseStoredWeatherLocations(storage.getItem(getSavedLocationsKey(userId)));
}

export function saveSavedWeatherLocations(
  locations: WeatherLocation[],
  userId?: string | null,
) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(
    getSavedLocationsKey(userId),
    JSON.stringify(locations.map(sanitizeWeatherLocation)),
  );
}

export function loadActiveWeatherLocation(userId?: string | null) {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  return parseStoredWeatherLocation(storage.getItem(getActiveLocationKey(userId)));
}

export function saveActiveWeatherLocation(
  location: WeatherLocation | null,
  userId?: string | null,
) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  const key = getActiveLocationKey(userId);
  if (!location) {
    storage.removeItem(key);
    return;
  }

  storage.setItem(key, JSON.stringify(sanitizeWeatherLocation(location)));
}

export function areWeatherLocationsEqual(
  left: WeatherLocation | null | undefined,
  right: WeatherLocation | null | undefined,
) {
  if (!left || !right) {
    return false;
  }

  return left.id === right.id;
}

export function formatWeatherLocationSubtitle(location: WeatherLocation) {
  return [location.admin1, location.country].filter(Boolean).join(", ");
}

export function formatWeatherLocationCoordinates(location: WeatherLocation) {
  const latitudeSuffix = location.latitude >= 0 ? "N" : "S";
  const longitudeSuffix = location.longitude >= 0 ? "E" : "W";

  return `${Math.abs(location.latitude).toFixed(3)}°${latitudeSuffix}, ${Math.abs(location.longitude).toFixed(3)}°${longitudeSuffix}`;
}

function formatReverseGeocodedLocation(
  address: ReverseGeocodingResponse["address"],
): string | null {
  const location = formatReverseGeocodedWeatherLocation(address);
  if (!location) {
    return null;
  }

  return location.admin1 ? `${location.name}, ${location.admin1}` : location.name;
}

function formatReverseGeocodedWeatherLocation(
  address: ReverseGeocodingResponse["address"],
): Pick<WeatherLocation, "name" | "admin1" | "country"> | null {
  if (!address) {
    return null;
  }

  const locality =
    address.city ??
    address.town ??
    address.village ??
    address.hamlet ??
    address.municipality ??
    address.county;

  if (!locality) {
    return null;
  }

  const countryCode = address.country_code?.toUpperCase() ?? null;
  const state =
    countryCode === "US"
      ? (US_STATE_CODES[address.state ?? ""] ?? address.state)
      : address.state;
  const country = countryCode === "US" ? "United States" : address.country;

  return {
    name: locality.trim(),
    admin1: state?.trim() || null,
    country: country?.trim() || null,
  };
}

function parseWeatherSearchInput(query: string) {
  const trimmed = query.trim().replace(/\s+/g, " ");
  if (trimmed.length < 2) {
    return null;
  }

  const commaParts = trimmed
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  let locality = "";
  let region = "";

  if (commaParts.length >= 2) {
    locality = commaParts[0] ?? "";
    region = commaParts.slice(1).join(", ");
  } else {
    const parts = trimmed.split(" ").filter(Boolean);
    const finalToken = parts.at(-1) ?? "";
    const finalPair = parts.slice(-2).join(" ");

    if (/^[A-Za-z]{2}$/.test(finalToken) && parts.length >= 2) {
      locality = parts.slice(0, -1).join(" ");
      region = finalToken.toUpperCase();
    } else if (US_STATE_CODES[finalPair] && parts.length >= 3) {
      locality = parts.slice(0, -2).join(" ");
      region = finalPair;
    } else {
      locality = trimmed;
    }
  }

  const normalizedRegion = region.trim();
  const upperRegion = normalizedRegion.toUpperCase();
  const isUsStateCode = Boolean(US_STATE_NAMES_BY_CODE[upperRegion]);
  const isUsStateName = Boolean(US_STATE_CODES[normalizedRegion]);
  const stateCode = isUsStateCode
    ? upperRegion
    : isUsStateName
      ? US_STATE_CODES[normalizedRegion]
      : null;
  const stateName = stateCode ? US_STATE_NAMES_BY_CODE[stateCode] : null;

  return {
    raw: trimmed,
    locality: locality.trim() || trimmed,
    region: normalizedRegion || null,
    stateCode,
    stateName,
  };
}

function buildAbbreviationVariants(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return [] as string[];
  }

  const tokens = trimmed.split(/\s+/);
  const variants = new Set<string>([trimmed]);

  tokens.forEach((token, index) => {
    const replacements = PLACE_ABBREVIATION_VARIANTS[token.toLowerCase()];
    if (!replacements?.length) {
      return;
    }

    replacements.forEach((replacement) => {
      const nextTokens = [...tokens];
      nextTokens[index] = replacement;
      variants.add(nextTokens.join(" "));
    });
  });

  return [...variants];
}

function buildWeatherSearchQueries(query: string) {
  const parsed = parseWeatherSearchInput(query);
  if (!parsed) {
    return [];
  }

  const queries = new Set<string>();
  const localityVariants = buildAbbreviationVariants(parsed.locality);
  const regionVariants = [
    parsed.region,
    parsed.stateCode,
    parsed.stateName,
  ].filter((value): value is string => Boolean(value?.trim()));

  queries.add(parsed.raw);

  localityVariants.forEach((locality) => {
    const normalizedLocality = locality.replace(/\s+/g, " ").trim();
    if (normalizedLocality.length < 2) {
      return;
    }

    queries.add(normalizedLocality);

    regionVariants.forEach((region) => {
      queries.add(`${normalizedLocality}, ${region}`);
      queries.add(`${normalizedLocality} ${region}`);
    });
  });

  if (parsed.stateCode && localityVariants.length > 0) {
    localityVariants.forEach((locality) => {
      queries.add(`${locality}, ${parsed.stateCode}, US`);
      if (parsed.stateName) {
        queries.add(`${locality}, ${parsed.stateName}, USA`);
      }
    });
  }

  return [...queries]
    .map((value) => value.replace(/\s*,\s*/g, ", ").replace(/\s+/g, " ").trim())
    .filter((value) => value.length >= 2)
    .slice(0, 8);
}

async function fetchWeatherLocationSearchResults(
  query: string,
  signal: AbortSignal,
): Promise<GeocodingSearchResult[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url.toString(), { signal });

  if (!response.ok) {
    throw new Error("Location search is unavailable right now.");
  }

  const payload = (await response.json()) as GeocodingSearchResponse;
  if (payload.error) {
    throw new Error(payload.reason || "Location search failed.");
  }

  return payload.results ?? [];
}

function formatNominatimLocationName(
  result: NominatimSearchResponse[number],
) {
  const locality =
    result.address?.city ??
    result.address?.town ??
    result.address?.village ??
    result.address?.hamlet ??
    result.address?.municipality ??
    result.name;

  if (!locality) {
    return null;
  }

  return locality.trim();
}

function mapNominatimResultToWeatherLocation(
  result: NominatimSearchResponse[number],
): WeatherLocation | null {
  const latitude = Number.parseFloat(result.lat);
  const longitude = Number.parseFloat(result.lon);
  const name = formatNominatimLocationName(result);

  if (!name || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  return {
    id: buildWeatherLocationId({
      id: result.place_id,
      name,
      latitude,
      longitude,
    }),
    name,
    latitude,
    longitude,
    admin1: result.address?.state?.trim() || null,
    country: result.address?.country?.trim() || null,
    timezone: null,
  };
}

async function fetchNominatimWeatherLocationSearchResults(
  query: string,
  signal: AbortSignal,
): Promise<WeatherLocation[]> {
  const parsed = parseWeatherSearchInput(query);
  const url = new URL("https://nominatim.openstreetmap.org/search");

  if (parsed?.locality) {
    url.searchParams.set("city", parsed.locality);
  } else {
    url.searchParams.set("q", query);
  }

  if (parsed?.stateName) {
    url.searchParams.set("state", parsed.stateName);
  } else if (parsed?.region) {
    url.searchParams.set("state", parsed.region);
  }

  if (parsed?.stateCode || parsed?.stateName) {
    url.searchParams.set("country", "United States");
  }

  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "8");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url.toString(), {
    signal,
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Location search is unavailable right now.");
  }

  const payload = (await response.json()) as NominatimSearchResponse;
  return payload
    .map(mapNominatimResultToWeatherLocation)
    .filter((value): value is WeatherLocation => Boolean(value));
}

export async function searchWeatherLocations(query: string): Promise<WeatherLocation[]> {
  const trimmedQuery = query.trim();
  if (trimmedQuery.length < 2) {
    return [];
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    const queries = buildWeatherSearchQueries(trimmedQuery);
    const mergedResults = new Map<string, WeatherLocation>();

    for (const candidateQuery of queries) {
      const results = await fetchWeatherLocationSearchResults(candidateQuery, controller.signal);
      for (const result of results) {
        const mapped = mapSearchResultToWeatherLocation(result);
        if (!mergedResults.has(mapped.id)) {
          mergedResults.set(mapped.id, mapped);
        }
      }

      if (mergedResults.size >= 8) {
        break;
      }
    }

    if (mergedResults.size < 5) {
      for (const candidateQuery of queries) {
        const fallbackResults = await fetchNominatimWeatherLocationSearchResults(
          candidateQuery,
          controller.signal,
        );

        for (const location of fallbackResults) {
          if (!mergedResults.has(location.id)) {
            mergedResults.set(location.id, location);
          }
        }

        if (mergedResults.size >= 8) {
          break;
        }
      }
    }

    return [...mergedResults.values()].slice(0, 8);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Location search timed out. Please try again.");
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function reverseGeocodeWeatherLocation(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("zoom", "10");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ReverseGeocodingResponse;
    return formatReverseGeocodedLocation(payload.address);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function reverseGeocodeWeatherLocationDetails(
  latitude: number,
  longitude: number,
): Promise<Pick<WeatherLocation, "name" | "admin1" | "country"> | null> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  try {
    const url = new URL("https://nominatim.openstreetmap.org/reverse");
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("zoom", "10");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as ReverseGeocodingResponse;
    return formatReverseGeocodedWeatherLocation(payload.address);
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeout);
  }
}
