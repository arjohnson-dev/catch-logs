const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

type AiSummarySource = {
  source: string;
  type: "internal" | "trusted_web" | string;
  key?: string;
  url?: string | null;
};

type GenerateWeatherSummaryResponse = {
  ok: boolean;
  cached?: boolean;
  summary?: string;
  sources?: AiSummarySource[];
  location?: {
    latitude: number;
    longitude: number;
    label: string;
  };
  error?: string;
};

type WeatherRequest = {
  latitude: number;
  longitude: number;
  locationLabel: string;
};

const OpenAIModel = Deno.env.get("OPENAI_MODEL") ?? "gpt-4.1-mini";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseWeatherRequest(body: unknown): WeatherRequest {
  if (!body || typeof body !== "object") {
    throw new Error("invalid request body");
  }

  const candidate = body as Record<string, unknown>;
  const latitude = candidate.latitude;
  const longitude = candidate.longitude;
  const locationLabel = candidate.locationLabel;

  if (!isFiniteNumber(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("invalid latitude");
  }

  if (!isFiniteNumber(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("invalid longitude");
  }

  if (typeof locationLabel !== "string" || locationLabel.trim().length < 1 || locationLabel.length > 200) {
    throw new Error("invalid locationLabel");
  }

  return {
    latitude,
    longitude,
    locationLabel: locationLabel.trim(),
  };
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": Deno.env.get("NWS_USER_AGENT") ?? "supabase-weather-summary/1.0",
      Accept: "application/ld+json, application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`NWS fetch failed (${res.status}) ${url} :: ${body.slice(0, 300)}`);
  }

  return res.json();
}

function normalizeTextFromNwsHtml(htmlOrText: unknown): string {
  if (typeof htmlOrText === "string") {
    return htmlOrText
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  if (htmlOrText == null) return "";
  return String(htmlOrText).trim();
}

function getObjectRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function getNwsRecord(value: unknown): Record<string, unknown> {
  const root = getObjectRecord(value);
  const props = getObjectRecord(root.properties);
  return Object.keys(props).length > 0 ? props : root;
}

function getNwsArray(value: unknown, key: string): Array<Record<string, unknown>> {
  const root = getObjectRecord(value);
  const props = getObjectRecord(root.properties);
  const candidate =
    (Array.isArray(root[key]) ? root[key] : null) ??
    (Array.isArray(props[key]) ? props[key] : null) ??
    (key === "features" && Array.isArray(root["@graph"]) ? root["@graph"] : null);

  return Array.isArray(candidate) ? (candidate as Array<Record<string, unknown>>) : [];
}

function pickDiscussionText(forecastPeriods: Array<Record<string, unknown>>): string {
  const discussionish = forecastPeriods
    .map((period) =>
      typeof period?.detailedForecast === "string"
        ? normalizeTextFromNwsHtml(period.detailedForecast)
        : "",
    )
    .filter(Boolean)
    .join("\n\n");

  return discussionish.slice(0, 12_000).trim();
}

async function getNwsTrustedInputs(latitude: number, longitude: number) {
  const pointsUrl = `https://api.weather.gov/points/${latitude},${longitude}`;
  const points = await fetchJson(pointsUrl);
  const pointData = getNwsRecord(points);

  const forecastUrl = typeof pointData.forecast === "string" ? pointData.forecast : undefined;
  const forecastZoneUrl =
    typeof pointData.forecastZone === "string" ? pointData.forecastZone : undefined;
  const forecastZone = forecastZoneUrl?.split("/").pop();
  const alertsApiUrl = forecastZone
    ? `https://api.weather.gov/alerts/active?zone=${encodeURIComponent(forecastZone)}`
    : undefined;

  if (!forecastUrl) {
    throw new Error("NWS points response missing forecast");
  }

  const forecast = await fetchJson(forecastUrl);
  const periods = getNwsArray(forecast, "periods");

  const forecastText = periods
    .slice(0, 8)
    .map((period) => {
      const name = typeof period.name === "string" ? period.name : "Forecast";
      const detail = normalizeTextFromNwsHtml(period.detailedForecast ?? period.shortForecast ?? "");
      return `${name}: ${detail}`.trim();
    })
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 10_000);

  const discussionText = pickDiscussionText(periods);

  let alertsText = "";
  let alertsSourceUrl: string | undefined;

  if (alertsApiUrl) {
    const alerts = await fetchJson(alertsApiUrl);
    const features = getNwsArray(alerts, "features");

    if (features.length > 0) {
      alertsSourceUrl = alertsApiUrl;
      alertsText = features
        .slice(0, 5)
        .map((feature) => {
          const properties = getNwsRecord(feature);

          const headline = typeof properties.headline === "string" ? properties.headline : "";
          const description = normalizeTextFromNwsHtml(properties.description);
          const areaDesc = typeof properties.areaDesc === "string" ? properties.areaDesc : "";
          const effective = typeof properties.effective === "string" ? properties.effective : "";
          const expires = typeof properties.expires === "string" ? properties.expires : "";
          const meta = [areaDesc, effective, expires].filter(Boolean).join(" • ");

          return [headline, meta, description].filter(Boolean).join("\n");
        })
        .join("\n\n")
        .slice(0, 10_000);
    }
  }

  return {
    forecastUrl,
    alertsUrl: alertsSourceUrl,
    forecastText: forecastText.trim(),
    alertsText: alertsText.trim(),
    discussionText: discussionText.trim(),
  };
}

function buildPrompt({
  locationLabel,
  forecastText,
  alertsText,
  discussionText,
}: {
  locationLabel: string;
  forecastText: string;
  alertsText: string;
  discussionText: string;
}) {
  return `
You are a weather summarizer.

Return ONLY valid JSON with:
{ "summary": string }

Rules:
- Do NOT invent details not present in the provided NWS text.
- Mention notable changes over time (next several periods).
- If active alerts exist, summarize them clearly and what they mean for the user.
- Use the provided location label in the first sentence.

Location: ${locationLabel}

NWS Forecast Text:
${forecastText}

NWS Alerts (may be empty):
${alertsText || "(none)"}

NWS Forecast Detail / Discussion (may be empty):
${discussionText || "(none)"}
`.trim();
}

async function createWeatherSummary({
  apiKey,
  model,
  prompt,
}: {
  apiKey: string;
  model: string;
  prompt: string;
}) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Summarize weather only from the provided NWS text. Output valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI request failed (${res.status}): ${body.slice(0, 500)}`);
  }

  const data = await res.json();
  const choices = typeof data === "object" && data ? (data as Record<string, unknown>).choices : null;
  const firstChoice = Array.isArray(choices) ? choices[0] : null;
  const message =
    firstChoice && typeof firstChoice === "object" ? (firstChoice as Record<string, unknown>).message : null;
  const content = message && typeof message === "object"
    ? (message as Record<string, unknown>).content
    : "{}";

  const parsed = JSON.parse(typeof content === "string" ? content : "{}") as { summary?: string };
  return String(parsed.summary ?? "").trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 204,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, { ok: false, error: "expected POST" });
  }

  let payload: WeatherRequest;
  try {
    payload = parseWeatherRequest(await req.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid request body";
    return jsonResponse(400, { ok: false, error: message });
  }

  try {
    const { forecastUrl, alertsUrl, forecastText, alertsText, discussionText } =
      await getNwsTrustedInputs(payload.latitude, payload.longitude);

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      throw new Error("Missing OPENAI_API_KEY");
    }

    const summary = await createWeatherSummary({
      apiKey: openaiApiKey,
      model: OpenAIModel,
      prompt: buildPrompt({
        locationLabel: payload.locationLabel,
        forecastText,
        alertsText,
        discussionText,
      }),
    });

    const sources: AiSummarySource[] = [
      {
        source: "NWS Forecast",
        type: "trusted_web",
        key: "nws_forecast",
        url: forecastUrl ?? null,
      },
    ];

    if (alertsText) {
      sources.push({
        source: "NWS Alerts",
        type: "trusted_web",
        key: "nws_alerts",
        url: alertsUrl ?? null,
      });
    }

    if (discussionText) {
      sources.push({
        source: "NWS Forecast Detail / Discussion",
        type: "trusted_web",
        key: "nws_discussion",
        url: forecastUrl ?? null,
      });
    }

    const response: GenerateWeatherSummaryResponse = {
      ok: true,
      cached: false,
      summary,
      sources,
      location: {
        latitude: payload.latitude,
        longitude: payload.longitude,
        label: payload.locationLabel,
      },
    };

    return jsonResponse(200, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const response: GenerateWeatherSummaryResponse = { ok: false, error: message };
    return jsonResponse(500, response);
  }
});
