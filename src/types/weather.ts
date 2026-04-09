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

export interface LunarPhaseData {
  date: string;
  value: number;
  phaseName: string;
  illuminationPercent: number;
}

export interface LunarPhaseFunctionResponse {
  ok: boolean;
  phases?: LunarPhaseData[];
  error?: string;
}
