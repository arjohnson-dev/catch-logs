import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useUnitPreference } from "@/hooks/use-unit-preference";
import { appQueryKeys } from "@/lib/query-keys";
import { supabase } from "@/lib/supabase";
import { formatMeasurementText } from "@/lib/unit-preferences";
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
};

const SUMMARY_UNAVAILABLE_MESSAGE = "Summary unavailable right now.";
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

async function getSpeciesAiSummary(slug: string, unitSystem: "metric" | "imperial") {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke("generate-species-summary", {
    body: {
      slug,
      unitSystem,
    },
    headers: session?.access_token
      ? {
          Authorization: `Bearer ${session.access_token}`,
        }
      : undefined,
  });

  if (error) {
    throw error;
  }

  return parseGenerateSpeciesSummaryResponse(data);
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
  const { isAuthenticated } = useAuth();
  const { unitSystem } = useUnitPreference();
  const summaryUnitSystem: "metric" | "imperial" =
    unitSystem === "imperial" ? "imperial" : "metric";
  const normalizedSlug = slug?.trim() ?? "";
  const hasSlug = normalizedSlug.length > 0;

  const summaryQuery = useQuery({
    queryKey: appQueryKeys.fieldGuideSpeciesAiSummary(normalizedSlug, summaryUnitSystem),
    queryFn: () => getSpeciesAiSummary(normalizedSlug, summaryUnitSystem),
    enabled: hasSlug && isAuthenticated,
    staleTime: 1000 * 60 * 30,
    retry: false,
  });

  if (!hasSlug && !fallbackSummary) {
    return null;
  }

  let content = fallbackSummary ?? SUMMARY_UNAVAILABLE_MESSAGE;
  let sources: AiSummarySource[] = [];

  if (summaryQuery.data?.summary) {
    content = summaryQuery.data.summary;
    sources = summaryQuery.data.sources;
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
            AI-generated from CatchLogs data and trusted references. AI can make mistakes, and summaries may sometimes take a little time to load.
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
