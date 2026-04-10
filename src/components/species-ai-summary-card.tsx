import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useUnitPreference } from "@/hooks/use-unit-preference";
import { appQueryKeys } from "@/lib/query-keys";
import { formatMeasurementText } from "@/lib/unit-preferences";
import {
  formatWeatherLocationSubtitle,
  loadActiveWeatherLocation,
  type WeatherLocation,
} from "@/lib/weather-locations";
import type { WeatherForecast, WeatherSnapshot } from "@/lib/weather";
import type {
  AiSummarySource,
  GenerateSpeciesSummaryResponse,
} from "@/types/field-guide";

type SpeciesAiSummaryCardProps = {
  slug: string | null | undefined;
  fallbackSummary?: string | null;
};

type SpeciesAiSummaryData = {
  summary: string;
  sources: AiSummarySource[];
  cached?: boolean;
  model?: string;
};

const SUMMARY_UNAVAILABLE_MESSAGE = "Summary unavailable right now.";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const speciesSummaryUrl = supabaseUrl
  ? `${supabaseUrl}/functions/v1/generate-species-summary`
  : null;
function isAiSummarySource(value: unknown): value is AiSummarySource {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.source === "string" && typeof candidate.type === "string";
}

function parseGenerateSpeciesSummaryResponse(payload: unknown): SpeciesAiSummaryData {
  if (!payload || typeof payload !== "object") {
    throw new Error(SUMMARY_UNAVAILABLE_MESSAGE);
  }

  const response = payload as GenerateSpeciesSummaryResponse;

  if (response.ok !== true) {
    throw new Error(response.error ?? SUMMARY_UNAVAILABLE_MESSAGE);
  }

  const summary = typeof response.summary === "string" ? response.summary.trim() : "";
  if (!summary) {
    throw new Error(SUMMARY_UNAVAILABLE_MESSAGE);
  }

  const sources = Array.isArray(response.sources)
    ? response.sources
        .filter(isAiSummarySource)
        .map((source) => ({
          ...source,
          source: source.source.trim(),
          url: typeof source.url === "string" ? source.url.trim() || null : null,
        }))
        .filter((source) => source.source.length > 0)
    : [];

  return {
    summary,
    sources,
    cached: response.cached,
    model: typeof response.model === "string" ? response.model.trim() || undefined : undefined,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error.trim();
  }

  return SUMMARY_UNAVAILABLE_MESSAGE;
}

async function getSpeciesAiSummary(
  slug: string,
  unitSystem: "metric" | "imperial",
  activeWeatherLocation: WeatherLocation | null,
  cachedWeather: {
    current?: WeatherSnapshot | null;
    forecast?: WeatherForecast | null;
  } | null,
) {
  if (!speciesSummaryUrl) {
    throw new Error("Missing VITE_SUPABASE_URL");
  }

  const locationLabel = activeWeatherLocation
    ? [activeWeatherLocation.name, formatWeatherLocationSubtitle(activeWeatherLocation)]
        .filter(Boolean)
        .join(", ")
    : null;

  const response = await fetch(speciesSummaryUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
    },
    body: JSON.stringify({
      slug,
      unitSystem,
      location: activeWeatherLocation
        ? {
            latitude: activeWeatherLocation.latitude,
            longitude: activeWeatherLocation.longitude,
            label: locationLabel ?? activeWeatherLocation.name,
            timezone: activeWeatherLocation.timezone ?? null,
          }
        : null,
      weatherContext: cachedWeather
        ? {
            current: cachedWeather.current ?? null,
            forecast: cachedWeather.forecast
              ? {
                  hourly: cachedWeather.forecast.hourly.slice(0, 6),
                  daily: cachedWeather.forecast.daily.slice(0, 2),
                }
              : null,
          }
        : null,
    }),
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(SUMMARY_UNAVAILABLE_MESSAGE);
    }
  }

  if (!response.ok) {
    throw new Error(
      payload && typeof payload === "object" && "error" in (payload as Record<string, unknown>)
        ? String((payload as Record<string, unknown>).error ?? SUMMARY_UNAVAILABLE_MESSAGE)
        : SUMMARY_UNAVAILABLE_MESSAGE,
    );
  }

  return parseGenerateSpeciesSummaryResponse(payload);
}

function SummarySources({ sources }: { sources: AiSummarySource[] }) {
  if (sources.length === 0) {
    return null;
  }

  return (
    <p className="resources-ai-summary-sources">
      <span className="resources-ai-summary-sources-label">Sources:</span>{" "}
      <span className="resources-ai-summary-source-list">
        {sources.map((source, index) => (
          <span key={`${source.key ?? source.source}-${index}`}>
            {source.url ? (
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="text-link resources-ai-summary-source-link"
                aria-label={`Open ${source.source} source in a new tab`}
              >
                {source.source}
              </a>
            ) : (
              <span>{source.source}</span>
            )}
            {index < sources.length - 1 ? ", " : null}
          </span>
        ))}
      </span>
    </p>
  );
}

function splitSummaryIntoParagraphs(summary: string) {
  const normalized = summary
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (normalized.length >= 2) {
    return normalized.slice(0, 2);
  }

  const sentences = summary.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g)?.map((part) => part.trim()) ?? [];

  if (sentences.length <= 2) {
    return [summary.trim()].filter(Boolean);
  }

  const splitIndex = Math.ceil(sentences.length / 2);
  const firstParagraph = sentences.slice(0, splitIndex).join(" ").trim();
  const secondParagraph = sentences.slice(splitIndex).join(" ").trim();

  return [firstParagraph, secondParagraph].filter(Boolean);
}

export function SpeciesAiSummaryCard({
  slug,
  fallbackSummary = null,
}: SpeciesAiSummaryCardProps) {
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuth();
  const { unitSystem } = useUnitPreference();
  const summaryUnitSystem: "metric" | "imperial" =
    unitSystem === "imperial" ? "imperial" : "metric";
  const normalizedSlug = slug?.trim() ?? "";
  const hasSlug = normalizedSlug.length > 0;
  const activeWeatherLocation: WeatherLocation | null = loadActiveWeatherLocation(user?.id);
  const activeLocationLabel = activeWeatherLocation
    ? [activeWeatherLocation.name, formatWeatherLocationSubtitle(activeWeatherLocation)]
        .filter(Boolean)
        .join(", ")
    : null;
  const cachedCurrentWeather = activeWeatherLocation
    ? queryClient.getQueryData<WeatherSnapshot | null>([
        "weather",
        "current-conditions",
        activeWeatherLocation.latitude,
        activeWeatherLocation.longitude,
        summaryUnitSystem,
      ])
    : null;
  const cachedForecast = activeWeatherLocation
    ? queryClient.getQueryData<WeatherForecast | null>([
        "weather",
        "forecast",
        activeWeatherLocation.latitude,
        activeWeatherLocation.longitude,
        summaryUnitSystem,
      ])
    : null;
  const cachedWeather =
    cachedCurrentWeather || cachedForecast
      ? {
          current: cachedCurrentWeather,
          forecast: cachedForecast,
        }
      : null;

  const summaryQuery = useQuery({
    queryKey: appQueryKeys.fieldGuideSpeciesAiSummary(
      normalizedSlug,
      `${summaryUnitSystem}:${activeWeatherLocation?.id ?? "no-location"}:${cachedCurrentWeather?.observedTime ?? "no-current"}:${cachedForecast?.daily?.[0]?.date ?? "no-forecast"}`,
    ),
    queryFn: () =>
      getSpeciesAiSummary(
        normalizedSlug,
        summaryUnitSystem,
        activeWeatherLocation,
        cachedWeather,
      ),
    enabled: hasSlug && isAuthenticated,
    staleTime: 1000 * 60 * 30,
    retry: false,
  });

  if (!hasSlug && !fallbackSummary) {
    return null;
  }

  let content = fallbackSummary ?? SUMMARY_UNAVAILABLE_MESSAGE;
  let sources: AiSummarySource[] = [];
  let modelLabel: string | null = null;

  if (summaryQuery.data?.summary) {
    content = summaryQuery.data.summary;
    sources = summaryQuery.data.sources;
    modelLabel = summaryQuery.data.model ?? null;
  } else if (summaryQuery.isError) {
    content = getErrorMessage(summaryQuery.error);
  } else if (!hasSlug && !fallbackSummary) {
    content = SUMMARY_UNAVAILABLE_MESSAGE;
  }

  const formattedContent = formatMeasurementText(content, unitSystem);
  const paragraphs =
    formattedContent === SUMMARY_UNAVAILABLE_MESSAGE
      ? [formattedContent]
      : splitSummaryIntoParagraphs(formattedContent);

  return (
    <Card className="resources-card surface-card resources-ai-summary-card">
      <section aria-labelledby="species-ai-summary-title">
        <CardHeader className="pb-3">
          <CardTitle id="species-ai-summary-title" className="resources-section-title">
            AI Summary
          </CardTitle>
          <p className="resources-ai-summary-helper">
            AI may make mistakes, double check your results.
            {modelLabel ? ` Model: ${modelLabel}.` : ""}
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          {summaryQuery.isLoading ? (
            <div
              className="resources-ai-summary-loading"
              aria-live="polite"
              aria-busy="true"
              role="status"
            >
              <p className="resources-ai-summary-status">Generating summary...</p>
              <div className="resources-ai-summary-skeleton" aria-hidden="true">
                <span className="resources-ai-summary-line" />
                <span className="resources-ai-summary-line" />
                <span className="resources-ai-summary-line resources-ai-summary-line-short" />
              </div>
            </div>
          ) : (
            <div className="resources-detail-list" aria-live="polite">
              <div className="resources-ai-summary-copy">
                {paragraphs.map((paragraph, index) => (
                  <p key={`${slug ?? "summary"}-${index}`} className="resources-ai-summary-body">
                    {paragraph}
                  </p>
                ))}
              </div>
              <SummarySources sources={sources} />
              <p className="resources-ai-summary-disclaimer">
                Double-check important details and{" "}
                <Link to="/resources/trusted-sources" className="text-link resources-ai-summary-cta">
                  review our whitelist of trusted resources
                </Link>
                .
              </p>
            </div>
          )}
        </CardContent>
      </section>
    </Card>
  );
}
