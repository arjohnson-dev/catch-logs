import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnitPreference } from "@/hooks/use-unit-preference";
import { appQueryKeys } from "@/lib/query-keys";
import { formatWeatherMeasurementText } from "@/lib/unit-preferences";
import type { AiSummarySource } from "@/types/field-guide";
import type { GenerateWeatherSummaryResponse } from "@/types/weather";

type WeatherAiSummaryCardProps = {
  latitude: number | null;
  longitude: number | null;
  locationLabel: string;
};

type WeatherAiSummaryData = {
  summary: string;
  sources: AiSummarySource[];
  cached?: boolean;
};

const SUMMARY_UNAVAILABLE_MESSAGE = "Written weather summary unavailable right now.";
const SUMMARY_PREVIEW_LENGTH = 220;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const weatherSummaryUrl = supabaseUrl
  ? `${supabaseUrl}/functions/v1/generate-weather-summary`
  : null;

function isAiSummarySource(value: unknown): value is AiSummarySource {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.source === "string" && typeof candidate.type === "string";
}

function parseGenerateWeatherSummaryResponse(payload: unknown): WeatherAiSummaryData {
  if (!payload || typeof payload !== "object") {
    throw new Error(SUMMARY_UNAVAILABLE_MESSAGE);
  }

  const response = payload as GenerateWeatherSummaryResponse;
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

async function getWeatherAiSummary(latitude: number, longitude: number, locationLabel: string) {
  if (!weatherSummaryUrl) {
    throw new Error("Missing VITE_SUPABASE_URL");
  }

  const response = await fetch(weatherSummaryUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
    },
    body: JSON.stringify({
      latitude,
      longitude,
      locationLabel,
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

  return parseGenerateWeatherSummaryResponse(payload);
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

export function WeatherAiSummaryCard({
  latitude,
  longitude,
  locationLabel,
}: WeatherAiSummaryCardProps) {
  const hasLocation = latitude != null && longitude != null;
  const [isExpanded, setIsExpanded] = useState(false);
  const { unitSystem, windSpeedDisplay } = useUnitPreference();

  const summaryQuery = useQuery({
    queryKey: appQueryKeys.weatherAiSummary(latitude, longitude, locationLabel),
    queryFn: () => getWeatherAiSummary(latitude!, longitude!, locationLabel),
    enabled: hasLocation,
    staleTime: 1000 * 60 * 30,
    retry: false,
  });

  if (!hasLocation) {
    return null;
  }

  let content = SUMMARY_UNAVAILABLE_MESSAGE;
  let sources: AiSummarySource[] = [];

  if (summaryQuery.data?.summary) {
    content = summaryQuery.data.summary;
    sources = summaryQuery.data.sources;
  } else if (summaryQuery.isError) {
    content = getErrorMessage(summaryQuery.error);
  }

  const formattedContent = formatWeatherMeasurementText(
    content,
    unitSystem,
    windSpeedDisplay,
  );

  useEffect(() => {
    setIsExpanded(false);
  }, [formattedContent, locationLabel]);

  const paragraphs =
    formattedContent === SUMMARY_UNAVAILABLE_MESSAGE
      ? [formattedContent]
      : splitSummaryIntoParagraphs(formattedContent);
  const plainSummary = paragraphs.join(" ").trim();
  const shouldTruncate =
    formattedContent !== SUMMARY_UNAVAILABLE_MESSAGE && plainSummary.length > SUMMARY_PREVIEW_LENGTH;
  const displayedSummary =
    shouldTruncate && !isExpanded
      ? `${plainSummary.slice(0, SUMMARY_PREVIEW_LENGTH).trimEnd()}...`
      : plainSummary;
  const displayParagraphs = [displayedSummary];

  return (
    <Card className="resources-card surface-card resources-ai-summary-card">
      <section aria-labelledby="weather-ai-summary-title">
        <CardHeader className="pb-3">
          <CardTitle id="weather-ai-summary-title" className="resources-section-title">
            Weather Summary
          </CardTitle>
          <p className="resources-ai-summary-helper">
            AI-generated from official weather reports and alerts. AI can make mistakes, so double-check time-sensitive details.
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
                {displayParagraphs.map((paragraph, index) => (
                  <p
                    key={`weather-summary-${locationLabel}-${index}`}
                    className="resources-ai-summary-body"
                  >
                    {paragraph}
                  </p>
                ))}
                {shouldTruncate ? (
                  <button
                    type="button"
                    className="resources-ai-summary-toggle text-link"
                    onClick={() => setIsExpanded((value) => !value)}
                  >
                    {isExpanded ? "See less" : "See more"}
                  </button>
                ) : null}
              </div>
              <SummarySources sources={sources} />
              <p className="resources-ai-summary-disclaimer">
                Review the original reports and{" "}
                <Link to="/resources/trusted-sources" className="text-link resources-ai-summary-cta">
                  trusted sources
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
