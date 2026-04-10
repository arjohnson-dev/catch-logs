const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1-mini";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asObject(value: unknown) {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  const normalized = normalizeText(value);
  return normalized || null;
}

function getSpeciesLookupUrl(slug: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !key) {
    throw new Error("Missing Supabase environment configuration");
  }

  const url = new URL(`${supabaseUrl}/rest/v1/species`);
  url.searchParams.set(
    "select",
    [
      "spec_code",
      "slug",
      "scientific_name",
      "canonical_common_name",
      "environment_type",
      "scope_habitat",
      "distribution_summary",
      "habitat_summary",
      "behavior_summary",
      "diet_summary",
      "reproduction",
      "spawning",
      "max_length_cm",
      "max_weight_g",
    ].join(","),
  );
  url.searchParams.set("is_active", "eq.true");
  url.searchParams.set("slug", `eq.${slug}`);

  return { url, key };
}

async function fetchSpecies(slug: string) {
  const { url, key } = getSpeciesLookupUrl(slug);
  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      Accept: "application/json",
      "Accept-Profile": "field-guide",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Supabase species lookup failed (${res.status}): ${body.slice(0, 300)}`,
    );
  }

  const rows = (await res.json().catch(() => [])) as Array<
    Record<string, unknown>
  >;
  const species = Array.isArray(rows) ? rows[0] : null;

  if (!species) {
    throw new Error("Species not found");
  }

  return species;
}

function getFishBaseUrl(species: Record<string, unknown>) {
  const specCode = Number.parseInt(String(species.spec_code ?? ""), 10);
  const scientificName = asString(species.scientific_name) ?? "";
  const [genusName = "", speciesName = ""] = scientificName.split(/\s+/, 2);
  const url = new URL("https://www.fishbase.se/summary/SpeciesSummary.php");
  url.searchParams.set("ID", String(specCode));
  if (genusName) url.searchParams.set("genusname", genusName);
  if (speciesName) url.searchParams.set("speciesname", speciesName);
  return url.toString();
}

function formatTemperature(value: number | null, unitSystem: string) {
  return value == null
    ? null
    : `${Math.round(value)}°${unitSystem === "imperial" ? "F" : "C"}`;
}

function formatWind(value: number | null, unitSystem: string) {
  return value == null
    ? null
    : `${Math.round(value)} ${unitSystem === "imperial" ? "mph" : "km/h"}`;
}

function stringifyReference(value: unknown) {
  if (typeof value === "string") {
    return normalizeText(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeText(item))
      .filter(Boolean)
      .join("; ");
  }

  const objectValue = asObject(value);
  if (!objectValue) {
    return "";
  }

  return Object.entries(objectValue)
    .map(([key, item]) => {
      const label = key.replace(/_/g, " ");
      if (Array.isArray(item)) {
        const joined = item
          .map((part) => normalizeText(part))
          .filter(Boolean)
          .join(", ");
        return joined ? `${label}: ${joined}` : null;
      }

      const normalized = normalizeText(item);
      return normalized ? `${label}: ${normalized}` : null;
    })
    .filter(Boolean)
    .join("; ");
}

function getCachedWeatherSummary(
  location: Record<string, unknown> | null,
  weatherContext: Record<string, unknown> | null,
  unitSystem: string,
) {
  if (!location || !weatherContext) {
    return null;
  }

  const current = asObject(weatherContext.current);
  const forecast = asObject(weatherContext.forecast);
  const daily = Array.isArray(forecast?.daily)
    ? asObject(forecast?.daily[0])
    : null;

  if (!current && !daily) {
    return null;
  }

  const label = asString(location.label) ?? "Selected location";
  const currentSummary = [
    `${label}: ${asString(current?.weatherDescription) ?? asString(current?.weatherCondition) ?? "cached conditions available"}`,
    formatTemperature(asNumber(current?.temperature), unitSystem)
      ? `air temperature ${formatTemperature(asNumber(current?.temperature), unitSystem)}`
      : null,
    formatWind(asNumber(current?.windSpeed), unitSystem)
      ? `wind ${formatWind(asNumber(current?.windSpeed), unitSystem)}`
      : null,
    asNumber(current?.precipitationProbability) != null
      ? `precipitation chance ${Math.round(asNumber(current?.precipitationProbability) ?? 0)}%`
      : null,
    asNumber(current?.cloudCoverage) != null
      ? `cloud cover ${Math.round(asNumber(current?.cloudCoverage) ?? 0)}%`
      : null,
    asString(current?.observedTime)
      ? `observed ${asString(current?.observedTime)}`
      : null,
  ]
    .filter(Boolean)
    .join("; ");

  const outlookSummary = [
    daily ? "cached short-range outlook" : null,
    daily &&
    asNumber(daily.temperatureLow) != null &&
    asNumber(daily.temperatureHigh) != null
      ? `range ${formatTemperature(asNumber(daily.temperatureLow), unitSystem)} to ${formatTemperature(asNumber(daily.temperatureHigh), unitSystem)}`
      : null,
    daily && asNumber(daily.precipitationProbability) != null
      ? `precipitation chance up to ${Math.round(asNumber(daily.precipitationProbability) ?? 0)}%`
      : null,
    daily && formatWind(asNumber(daily.windSpeed), unitSystem)
      ? `wind around ${formatWind(asNumber(daily.windSpeed), unitSystem)}`
      : null,
  ]
    .filter(Boolean)
    .join("; ");

  return {
    currentSummary: currentSummary || `${label}: cached conditions available`,
    outlookSummary: outlookSummary || "cached forecast context not available",
    sourceLabel: "Open-Meteo (cached app weather)",
    sourceUrl: null,
  };
}

async function fetchOpenMeteoWeather(
  location: Record<string, unknown>,
  unitSystem: string,
) {
  const latitude = asNumber(location.latitude);
  const longitude = asNumber(location.longitude);
  const label = asString(location.label) ?? "Selected location";

  if (latitude == null || longitude == null) {
    return null;
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,precipitation,cloud_cover,wind_speed_10m,wind_direction_10m,weather_code",
  );
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max",
  );
  url.searchParams.set("forecast_days", "2");

  if (unitSystem === "imperial") {
    url.searchParams.set("temperature_unit", "fahrenheit");
    url.searchParams.set("wind_speed_unit", "mph");
  }

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "catchlogs-species-summary/1.0",
    },
  });

  if (!res.ok) {
    return null;
  }

  const payload = (await res.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const current = asObject(payload?.current);
  const daily = asObject(payload?.daily);
  const dailyMin = Array.isArray(daily?.temperature_2m_min)
    ? asNumber(daily?.temperature_2m_min[0])
    : null;
  const dailyMax = Array.isArray(daily?.temperature_2m_max)
    ? asNumber(daily?.temperature_2m_max[0])
    : null;
  const dailyPrecip = Array.isArray(daily?.precipitation_probability_max)
    ? asNumber(daily?.precipitation_probability_max[0])
    : null;
  const dailyWind = Array.isArray(daily?.wind_speed_10m_max)
    ? asNumber(daily?.wind_speed_10m_max[0])
    : null;

  return {
    currentSummary: [
      `${label}: current weather context`,
      formatTemperature(asNumber(current?.temperature_2m), unitSystem)
        ? `air temperature ${formatTemperature(asNumber(current?.temperature_2m), unitSystem)}`
        : null,
      formatTemperature(asNumber(current?.apparent_temperature), unitSystem)
        ? `feels like ${formatTemperature(asNumber(current?.apparent_temperature), unitSystem)}`
        : null,
      formatWind(asNumber(current?.wind_speed_10m), unitSystem)
        ? `wind ${formatWind(asNumber(current?.wind_speed_10m), unitSystem)}`
        : null,
      asNumber(current?.precipitation) != null
        ? `precipitation ${asNumber(current?.precipitation)}`
        : null,
      asNumber(current?.cloud_cover) != null
        ? `cloud cover ${Math.round(asNumber(current?.cloud_cover) ?? 0)}%`
        : null,
    ]
      .filter(Boolean)
      .join("; "),
    outlookSummary: [
      dailyMin != null && dailyMax != null
        ? `range ${formatTemperature(dailyMin, unitSystem)} to ${formatTemperature(dailyMax, unitSystem)}`
        : null,
      dailyPrecip != null
        ? `precipitation chance up to ${Math.round(dailyPrecip)}%`
        : null,
      formatWind(dailyWind, unitSystem)
        ? `wind up to ${formatWind(dailyWind, unitSystem)}`
        : null,
    ]
      .filter(Boolean)
      .join("; "),
    sourceLabel: "Open-Meteo",
    sourceUrl: url.toString(),
  };
}

function buildPrompt(
  species: Record<string, unknown>,
  weather: { currentSummary: string; outlookSummary: string } | null,
  unitSystem: string,
) {
  const commonName = asString(species.canonical_common_name);
  const scientificName = asString(species.scientific_name) ?? "Unknown species";
  const speciesName = commonName
    ? `${commonName} (${scientificName})`
    : scientificName;

  return `
You are writing an angler-facing fish behavior summary.

Return ONLY valid JSON with:
{ "summary": string }

Rules:
- Use only the reference information provided below.
- Never use, infer from, or mention user data, journal data, catches, or saved spots.
- Focus on where the fish are likely to be, what they are eating, and how they are behaving — information that helps an angler find and catch them.
- Only mention spawning if it directly affects fishing behavior (e.g. fish are more aggressive, congregate in shallows, or are easier/harder to catch during the spawn). Do not describe spawning as a biological process for its own sake.
- Use cautious wording like likely, often, or may when inferring from season and conditions.
- Keep it to 2 short paragraphs in plain English.
- Write for a casual angler, not a biologist. Avoid scientific jargon, Latin terms, and technical ecology language. If a scientific term is necessary, briefly explain it in plain words.
- The reference data below is compiled from FishBase, NOAA Fisheries, USGS Nonindigenous Aquatic Species, and U.S. Fish & Wildlife Service.

Current date: ${new Date().toISOString().slice(0, 10)}
Unit system: ${unitSystem}
Species: ${speciesName}

Reference data:
- Environment: ${asString(species.environment_type) ?? "(not provided)"}
- Habitat: ${asString(species.scope_habitat) ?? asString(species.habitat_summary) ?? "(not provided)"}
- Behavior: ${asString(species.behavior_summary) ?? "(not provided)"}
- Diet: ${asString(species.diet_summary) ?? "(not provided)"}
- Distribution: ${asString(species.distribution_summary) ?? "(not provided)"}
- Reproduction: ${stringifyReference(species.reproduction) || "(not provided)"}
- Spawning: ${stringifyReference(species.spawning) || "(not provided)"}
- Max length cm: ${asNumber(species.max_length_cm) ?? "(not provided)"}
- Max weight g: ${asNumber(species.max_weight_g) ?? "(not provided)"}

Conditions:
- ${weather ? weather.currentSummary : "No live location or weather context was provided."}
- ${weather ? weather.outlookSummary : "Use a general current-season summary rather than a local one."}
  `.trim();
}

async function createSummary(prompt: string) {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Summarize fish behavior only from supplied trusted references. Write in plain, everyday language for a casual angler — no jargon or scientific terms. Output valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `OpenAI request failed (${res.status}): ${body.slice(0, 500)}`,
    );
  }

  const data = (await res.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const choices = Array.isArray(data?.choices) ? data?.choices : [];
  const firstChoice = asObject(choices[0]);
  const message = asObject(firstChoice?.message);
  const content = typeof message?.content === "string" ? message.content : "{}";
  const parsed = JSON.parse(content) as Record<string, unknown>;
  const summary = normalizeText(parsed.summary);

  if (!summary) {
    throw new Error("Summary unavailable right now.");
  }

  return summary;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "expected POST" });
  }

  try {
    const body = await req.json();
    const payload = asObject(body);
    const slug = normalizeText(payload?.slug);
    const unitSystem =
      payload?.unitSystem === "imperial" ? "imperial" : "metric";
    const location = asObject(payload?.location);
    const weatherContext = asObject(payload?.weatherContext);

    if (!slug) {
      return jsonResponse(400, { ok: false, error: "invalid slug" });
    }

    const species = await fetchSpecies(slug);
    const weather =
      getCachedWeatherSummary(location, weatherContext, unitSystem) ??
      (location ? await fetchOpenMeteoWeather(location, unitSystem) : null);
    const summary = await createSummary(
      buildPrompt(species, weather, unitSystem),
    );

    const sources = [
      {
        source: "FishBase",
        type: "trusted_web",
        key: "fishbase_species_reference",
        url: getFishBaseUrl(species),
      },
      {
        source: "NOAA Fisheries",
        type: "trusted_web",
        key: "noaa_fisheries_reference",
        url: "https://www.fisheries.noaa.gov",
      },
      {
        source: "USGS Nonindigenous Aquatic Species",
        type: "trusted_web",
        key: "usgs_nas_reference",
        url: "https://nas.er.usgs.gov",
      },
      {
        source: "U.S. Fish & Wildlife Service",
        type: "trusted_web",
        key: "usfws_reference",
        url: "https://www.fws.gov",
      },
    ];

    if (weather) {
      sources.push({
        source: weather.sourceLabel,
        type: "trusted_web",
        key: "weather_context",
        url: weather.sourceUrl,
      });
    }

    return jsonResponse(200, {
      ok: true,
      cached: false,
      model: OPENAI_MODEL,
      summary,
      sources,
      species: {
        spec_code: Number.parseInt(String(species.spec_code ?? ""), 10),
        slug: asString(species.slug) ?? slug,
        scientific_name: asString(species.scientific_name) ?? "Unknown species",
        canonical_common_name: asString(species.canonical_common_name),
      },
    });
  } catch (error) {
    return jsonResponse(500, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});
