import "@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

type LunarPhase = {
  date: string;
  value: number;
  phaseName: string;
  illuminationPercent: number;
};

type LunarPhaseRequest = {
  latitude: number;
  longitude: number;
  date?: string;
  days?: number;
};

type LunarPhaseResponse = {
  ok: boolean;
  phases?: LunarPhase[];
  error?: string;
};

type AstronomyApiResponse = {
  date?: string;
  moon_phase?: string;
  moon_illumination_percentage?: string | number;
  error_message?: string;
  error_status?: string;
};

const PHASE_VALUE_MAP: Record<string, number> = {
  NEW_MOON: 0,
  WAXING_CRESCENT: 0.125,
  FIRST_QUARTER: 0.25,
  WAXING_GIBBOUS: 0.375,
  FULL_MOON: 0.5,
  WANING_GIBBOUS: 0.625,
  LAST_QUARTER: 0.75,
  WANING_CRESCENT: 0.875,
};

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

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseRequest(body: unknown): LunarPhaseRequest {
  if (!body || typeof body !== "object") {
    throw new Error("invalid request body");
  }

  const candidate = body as Record<string, unknown>;
  const latitude = candidate.latitude;
  const longitude = candidate.longitude;
  const date = candidate.date;
  const days = candidate.days;

  if (!isFiniteNumber(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("invalid latitude");
  }

  if (!isFiniteNumber(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("invalid longitude");
  }

  if (date != null && (typeof date !== "string" || !isIsoDate(date))) {
    throw new Error("invalid date");
  }

  if (days != null && (!Number.isInteger(days) || days < 1 || days > 10)) {
    throw new Error("invalid days");
  }

  return {
    latitude,
    longitude,
    date: typeof date === "string" ? date : undefined,
    days: typeof days === "number" ? days : undefined,
  };
}

function addDays(isoDate: string, offset: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function normalizePhaseName(value: string | undefined) {
  const raw = (value ?? "").trim().toUpperCase();
  const fallback = "UNKNOWN";
  const key = raw || fallback;

  return {
    key,
    label: key
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
  };
}

function normalizeIllumination(value: string | number | undefined) {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.round(Math.abs(numeric));
}

async function fetchAstronomyDay(
  apiKey: string,
  latitude: number,
  longitude: number,
  date: string,
): Promise<LunarPhase> {
  const url = new URL("https://api.ipgeolocation.io/astronomy");
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("long", String(longitude));
  url.searchParams.set("date", date);

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`IPGeolocation request failed (${res.status}): ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as AstronomyApiResponse;
  if (typeof data.error_message === "string" && data.error_message.trim().length > 0) {
    throw new Error(data.error_message.trim());
  }

  const phase = normalizePhaseName(data.moon_phase);
  if (phase.key === "UNKNOWN") {
    throw new Error("IPGeolocation response did not include a recognizable moon phase.");
  }

  return {
    date: typeof data.date === "string" && isIsoDate(data.date) ? data.date : date,
    value: PHASE_VALUE_MAP[phase.key] ?? -1,
    phaseName: phase.label,
    illuminationPercent: normalizeIllumination(data.moon_illumination_percentage),
  };
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

  let payload: LunarPhaseRequest;
  try {
    payload = parseRequest(await req.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid request body";
    return jsonResponse(400, { ok: false, error: message } satisfies LunarPhaseResponse);
  }

  const apiKey = Deno.env.get("IPGEOLOCATION_API_KEY");
  if (!apiKey) {
    return jsonResponse(
      500,
      { ok: false, error: "Missing IPGEOLOCATION_API_KEY" } satisfies LunarPhaseResponse,
    );
  }

  const startDate = payload.date ?? new Date().toISOString().slice(0, 10);
  const totalDays = payload.days ?? 1;

  try {
    const phases = await Promise.all(
      Array.from({ length: totalDays }, (_, index) =>
        fetchAstronomyDay(
          apiKey,
          payload.latitude,
          payload.longitude,
          addDays(startDate, index),
        )),
    );

    return jsonResponse(200, {
      ok: true,
      phases,
    } satisfies LunarPhaseResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return jsonResponse(500, { ok: false, error: message } satisfies LunarPhaseResponse);
  }
});
