/*
 * File:        src/components/journal-entry-card.tsx
 * Description: <brief description of the purpose of this file>
 *
 * Author:      Andrew Johnson
 * Company:     CatchLogs LLC
 *
 * Copyright (c) 2026 CatchLogs LLC. All rights reserved.
 *
 * This source code and all associated files are the property of CatchLogs LLC.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without explicit written permission
 * from CatchLogs LLC.
 */
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { FaBookOpen, FaFish, FaRuler, FaWeightHanging } from "react-icons/fa6";
import { GiFishingHook } from "react-icons/gi";
import type { IconType } from "react-icons";
import { Button } from "@/components/ui/button";
import { useUnitPreference } from "@/hooks/use-unit-preference";
import { formatCatchGearSummary } from "@/lib/catch-gear";
import {
  getFieldGuideSpeciesDetail,
  getFieldGuideSpeciesPhotoUrlMap,
  UNIDENTIFIED_FIELD_GUIDE_SPEC_CODE,
} from "@/lib/field-guide";
import {
  convertWindSpeedForDisplay,
  getWindSpeedUnitLabel,
} from "@/lib/unit-preferences";
import { getWeatherVisual, getWindDirection } from "@/lib/weather-ui";
import { cn } from "@/lib/utils";
import { formatFishingSetup } from "@/lib/fishing-gear";
import { appQueryKeys } from "@/lib/query-keys";
import type { JournalEntry } from "@/types/domain";

export type JournalEntryCardAction = {
  id: string;
  label: string;
  icon: IconType;
  onClick: () => void;
  disabled?: boolean;
  tone?: "info" | "danger";
};

interface JournalEntryCardProps {
  entry: JournalEntry;
  actions?: JournalEntryCardAction[];
  className?: string;
  onViewFieldGuide?: ((path: string) => void) | null;
}

function hasValue(value: number | null | undefined): value is number {
  return value !== null && value !== undefined;
}

export default function JournalEntryCard({
  entry,
  actions = [],
  className,
  onViewFieldGuide = null,
}: JournalEntryCardProps) {
  const { unitSystem, windSpeedDisplay } = useUnitPreference();
  const { data: resolvedSpeciesPhotoUrl = null } = useQuery({
    queryKey: appQueryKeys.journalEntrySpeciesPhoto(entry.fishSpeciesSpecCode),
    queryFn: async () => {
      const photoUrlMap = await getFieldGuideSpeciesPhotoUrlMap([
        entry.fishSpeciesSpecCode,
      ]);
      return photoUrlMap.get(entry.fishSpeciesSpecCode) ?? null;
    },
    enabled:
      !entry.photoUrl &&
      entry.fishSpeciesSpecCode !== UNIDENTIFIED_FIELD_GUIDE_SPEC_CODE,
    staleTime: 1000 * 60 * 60,
  });
  const { data: fieldGuideSpecies = null } = useQuery({
    queryKey: appQueryKeys.fieldGuideSpeciesLink(entry.fishSpeciesSpecCode),
    queryFn: () =>
      getFieldGuideSpeciesDetail({ specCode: entry.fishSpeciesSpecCode }),
    enabled:
      entry.fishSpeciesSpecCode !== UNIDENTIFIED_FIELD_GUIDE_SPEC_CODE &&
      onViewFieldGuide !== null,
    staleTime: 1000 * 60 * 60,
  });
  const displayPhotoUrl =
    entry.photoUrl ?? entry.speciesPhotoUrl ?? resolvedSpeciesPhotoUrl ?? null;
  const hasWeather =
    hasValue(entry.temperature) ||
    hasValue(entry.pressure) ||
    hasValue(entry.precipitationProbability) ||
    hasValue(entry.windSpeed) ||
    hasValue(entry.cloudCoverage) ||
    hasValue(entry.windDirection) ||
    Boolean(entry.weatherCondition);
  const fishingSetup = formatFishingSetup(entry);
  const gearSummary = formatCatchGearSummary(entry);
  const displayTemperature = hasValue(entry.temperature)
    ? `${Math.round(
        unitSystem === "metric"
          ? ((entry.temperature - 32) * 5) / 9
          : entry.temperature,
      )}°${unitSystem === "metric" ? "C" : "F"}`
    : "--";
  const displayPressure = hasValue(entry.pressure)
    ? unitSystem === "metric"
      ? `${Math.round(entry.pressure)} hPa`
      : `${(entry.pressure * 0.0295299830714).toFixed(2)} inHg`
    : "--";
  const displayWindSpeed = hasValue(entry.windSpeed)
    ? `${Math.round(
        convertWindSpeedForDisplay(
          entry.windSpeed,
          unitSystem,
          windSpeedDisplay,
        ) ?? entry.windSpeed,
      )} ${getWindSpeedUnitLabel(unitSystem, windSpeedDisplay)}`
    : "--";
  const displayLength = hasValue(entry.length)
    ? unitSystem === "metric"
      ? `${(entry.length * 2.54).toFixed(1)} cm`
      : `${entry.length}"`
    : "-";
  const displayWeight = hasValue(entry.weight)
    ? unitSystem === "metric"
      ? `${(entry.weight * 0.45359237).toFixed(2)} kg`
      : `${entry.weight} lbs`
    : "-";
  const canViewFieldGuide =
    entry.fishSpeciesSpecCode !== UNIDENTIFIED_FIELD_GUIDE_SPEC_CODE &&
    onViewFieldGuide !== null;
  const fieldGuidePath = fieldGuideSpecies?.slug
    ? `/resources/field-guide/${fieldGuideSpecies.slug}`
    : `/resources/field-guide/${entry.fishSpeciesSpecCode}`;

  return (
    <div className={cn("surface-card surface-card-hover p-3", className)}>
      <div className="flex items-start gap-2.5">
        {displayPhotoUrl ? (
          <img
            src={displayPhotoUrl}
            alt={`Caught ${entry.fishType}`}
            className="w-14 h-14 rounded-md object-contain bg-[#222222] flex-shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-md bg-[#222222] flex items-center justify-center flex-shrink-0">
            <FaFish className="h-7 w-7 text-[#666666]" />
          </div>
        )}

        <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
          <div className="space-y-0.5 text-xs leading-tight text-[#cccccc] min-w-0">
            <div className="min-w-0">
              <span className="truncate font-semibold text-white">
                {entry.fishType}
              </span>
            </div>
            <div className="flex items-center space-x-1 min-w-0">
              <GiFishingHook className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{fishingSetup || "-"}</span>
            </div>
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center space-x-1">
                <FaRuler className="h-3 w-3 flex-shrink-0" />
                <span>{displayLength}</span>
              </div>
              <div className="flex items-center space-x-1">
                <FaWeightHanging className="h-3 w-3 flex-shrink-0" />
                <span>{displayWeight}</span>
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0 pl-1 space-y-1.5">
            <div className="text-[11px] leading-tight text-[#999999]">
              {format(new Date(entry.dateTime), "MMM dd")}
            </div>
            <div className="text-[11px] leading-tight text-[#999999]">
              {format(new Date(entry.dateTime), "h:mm a")}
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="btn-outline-info h-8 px-2.5 text-[11px]"
                onClick={() => onViewFieldGuide?.(fieldGuidePath)}
                disabled={!canViewFieldGuide}
                aria-label={
                  canViewFieldGuide
                    ? `View ${entry.fishType} in the field guide`
                    : `${entry.fishType} is unavailable in the field guide`
                }
              >
                <FaBookOpen className="mr-1.5 h-3.5 w-3.5" />
                See in Field Guide
              </Button>
            </div>
          </div>
        </div>
      </div>

      {hasWeather ? (
        <div className="mt-2">
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <div className="rounded-md border border-[#2d3748] bg-[#141922] px-2 py-1.5">
              <div className="text-[#8f98a8]">Temp</div>
              <div className="mt-0.5 font-semibold text-white">
                {displayTemperature}
              </div>
            </div>
            <div className="rounded-md border border-[#2d3748] bg-[#141922] px-2 py-1.5">
              <div className="text-[#8f98a8]">Condition</div>
              <div className="mt-0.5 flex items-center gap-1.5 font-semibold text-white min-w-0">
                {entry.weatherCondition ? (
                  <>
                    {(() => {
                      const { Icon: WeatherIcon, colorClass } =
                        getWeatherVisual(entry.weatherCondition);
                      return (
                        <WeatherIcon
                          className={`h-3 w-3 flex-shrink-0 ${colorClass}`}
                        />
                      );
                    })()}
                    <span className="capitalize truncate">
                      {entry.weatherDescription || entry.weatherCondition}
                    </span>
                  </>
                ) : (
                  <span>--</span>
                )}
              </div>
            </div>
            <div className="rounded-md border border-[#2d3748] bg-[#141922] px-2 py-1.5">
              <div className="text-[#8f98a8]">Pressure</div>
              <div className="mt-0.5 font-semibold text-white">
                {displayPressure}
              </div>
            </div>
            <div className="rounded-md border border-[#2d3748] bg-[#141922] px-2 py-1.5">
              <div className="text-[#8f98a8]">Cloud Cover</div>
              <div className="mt-0.5 font-semibold text-white">
                {hasValue(entry.cloudCoverage)
                  ? `${Math.round(entry.cloudCoverage)}%`
                  : "--"}
              </div>
            </div>
            <div className="rounded-md border border-[#2d3748] bg-[#141922] px-2 py-1.5">
              <div className="text-[#8f98a8]">Wind Speed</div>
              <div className="mt-0.5 font-semibold text-white">
                {displayWindSpeed}
              </div>
            </div>
            <div className="rounded-md border border-[#2d3748] bg-[#141922] px-2 py-1.5">
              <div className="text-[#8f98a8]">Wind Dir</div>
              <div className="mt-0.5 font-semibold text-white">
                {hasValue(entry.windDirection)
                  ? getWindDirection(entry.windDirection)
                  : "--"}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-2 text-xs text-[#777777]">
          Weather data unavailable
        </div>
      )}

      {entry.notes && (
        <p className="text-[13px] text-[#cccccc] mt-2 line-clamp-2">
          {entry.notes}
        </p>
      )}

      {gearSummary.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-[#b7c0ce]">
          {gearSummary.map((item) => (
            <span
              key={item}
              className="rounded-full border border-[#2d3748] bg-[#141922] px-2 py-1"
            >
              {item}
            </span>
          ))}
        </div>
      )}

      {actions.length > 0 && (
        <div
          className={cn(
            "mt-2.5 grid gap-2",
            actions.length === 1 ? "grid-cols-1" : "grid-cols-2",
          )}
        >
          {actions.map((action) => {
            const ActionIcon = action.icon;
            const toneClass =
              action.tone === "danger"
                ? "btn-outline-danger"
                : "btn-outline-info";

            return (
              <Button
                key={action.id}
                size="sm"
                variant="outline"
                className={cn(toneClass, "w-full h-9 text-sm")}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                <ActionIcon className="h-4 w-4 mr-1.5" />
                {action.label}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
