import type { AiSummarySource } from "@/types/field-guide";

export interface GenerateWeatherSummaryResponse {
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
}
