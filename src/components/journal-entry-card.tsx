import { format } from "date-fns";
import {
  FaCloud,
  FaEye,
  FaFish,
  FaRuler,
  FaTemperatureHalf,
  FaWeightHanging,
  FaWind,
} from "react-icons/fa6";
import { GiFishingHook } from "react-icons/gi";
import type { IconType } from "react-icons";
import { Button } from "@/components/ui/button";
import { getTemperatureIconColorClass } from "@/lib/temperature-ui";
import { formatVisibility, getWeatherVisual, getWindDirection } from "@/lib/weather-ui";
import { cn } from "@/lib/utils";
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
}

function hasValue(value: number | null | undefined): value is number {
  return value !== null && value !== undefined;
}

export default function JournalEntryCard({
  entry,
  actions = [],
  className,
}: JournalEntryCardProps) {
  const hasWeather =
    hasValue(entry.temperature) ||
    hasValue(entry.windSpeed) ||
    Boolean(entry.weatherCondition) ||
    hasValue(entry.cloudCoverage) ||
    hasValue(entry.visibility);

  return (
    <div className={cn("surface-card surface-card-hover p-3", className)}>
      <div className="flex items-start gap-2.5">
        {entry.photoUrl ? (
          <img
            src={entry.photoUrl}
            alt={`Caught ${entry.fishType}`}
            className="w-14 h-14 rounded-md object-cover flex-shrink-0"
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
              <span className="truncate">{entry.tackle || "-"}</span>
            </div>
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center space-x-1">
                <FaRuler className="h-3 w-3 flex-shrink-0" />
                <span>{hasValue(entry.length) ? `${entry.length}"` : "-"}</span>
              </div>
              <div className="flex items-center space-x-1">
                <FaWeightHanging className="h-3 w-3 flex-shrink-0" />
                <span>{hasValue(entry.weight) ? `${entry.weight} lbs` : "-"}</span>
              </div>
            </div>
          </div>
          <div className="text-right flex-shrink-0 pl-1">
            <div className="text-[11px] leading-tight text-[#999999]">
              {format(new Date(entry.dateTime), "MMM dd")}
            </div>
            <div className="text-[11px] leading-tight text-[#999999]">
              {format(new Date(entry.dateTime), "h:mm a")}
            </div>
          </div>
        </div>
      </div>

      {hasWeather ? (
        <div className="mt-2">
          <div className="flex items-center gap-3 text-xs text-[#999999] min-w-0">
            {hasValue(entry.temperature) && (
              <div className="flex items-center space-x-1 whitespace-nowrap">
                <FaTemperatureHalf
                  className={`h-3 w-3 ${getTemperatureIconColorClass(entry.temperature)}`}
                />
                <span>{entry.temperature}°F</span>
              </div>
            )}
            {hasValue(entry.windSpeed) && (
              <div className="flex items-center space-x-1 whitespace-nowrap">
                <FaWind className="h-3 w-3 text-gray-400" />
                <span>{entry.windSpeed} mph</span>
                {hasValue(entry.windDirection) && (
                  <span className="text-[#777777]">
                    ({getWindDirection(entry.windDirection)})
                  </span>
                )}
              </div>
            )}
            {entry.weatherCondition && (
              <div className="flex items-center space-x-1 min-w-0">
                {(() => {
                  const { Icon: WeatherIcon, colorClass } = getWeatherVisual(
                    entry.weatherCondition,
                  );
                  return <WeatherIcon className={`h-3 w-3 ${colorClass}`} />;
                })()}
                <span className="capitalize truncate">
                  {entry.weatherDescription || entry.weatherCondition}
                </span>
              </div>
            )}
          </div>

          {(hasValue(entry.cloudCoverage) || hasValue(entry.visibility)) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5 text-xs text-[#777777]">
              {hasValue(entry.cloudCoverage) && (
                <div className="flex items-center space-x-1">
                  <FaCloud className="h-3 w-3" />
                  <span>{entry.cloudCoverage}% clouds</span>
                </div>
              )}
              {hasValue(entry.visibility) && entry.visibility < 10000 && (
                <div className="flex items-center space-x-1">
                  <FaEye className="h-3 w-3" />
                  <span>{formatVisibility(entry.visibility)} vis</span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-2 text-xs text-[#777777]">Weather data unavailable</div>
      )}

      {entry.notes && (
        <p className="text-[13px] text-[#cccccc] mt-2 line-clamp-2">{entry.notes}</p>
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
              action.tone === "danger" ? "btn-outline-danger" : "btn-outline-info";

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
