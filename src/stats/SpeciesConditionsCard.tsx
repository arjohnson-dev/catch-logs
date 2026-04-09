import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUnitPreference } from "@/hooks/use-unit-preference";
import {
  convertWindSpeedForDisplay,
  getWindSpeedUnitLabel,
} from "@/lib/unit-preferences";
import type { StatsSpeciesDetailData } from "@/lib/supabase-data";

type Props = {
  conditions: StatsSpeciesDetailData["conditions"];
};

export default function SpeciesConditionsCard({ conditions }: Props) {
  const { unitSystem, windSpeedDisplay } = useUnitPreference();

  if (!conditions) {
    return null;
  }

  const formatTemperature = (value: number | null) => {
    if (value === null) {
      return "N/A";
    }

    if (unitSystem === "metric") {
      return `${(((value - 32) * 5) / 9).toFixed(1)}°C`;
    }

    return `${value.toFixed(1)}°F`;
  };

  const formatWind = (value: number | null) => {
    if (value === null) {
      return "N/A";
    }

    const converted =
      convertWindSpeedForDisplay(value, unitSystem, windSpeedDisplay) ?? value;
    return `${converted.toFixed(1)} ${getWindSpeedUnitLabel(unitSystem, windSpeedDisplay)}`;
  };

  return (
    <Card className="stats-card">
      <CardHeader>
        <CardTitle className="stats-card-title">Typical Conditions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="stats-conditions-grid">
          <div className="stats-condition-item">
            <p className="stats-condition-label">Most Common</p>
            <p className="stats-condition-value stats-wrap">
              {conditions.commonCondition ?? "N/A"}
            </p>
          </div>
          <div className="stats-condition-item">
            <p className="stats-condition-label">Avg Temp</p>
            <p className="stats-condition-value">
              {formatTemperature(conditions.avgTemp)}
            </p>
          </div>
          <div className="stats-condition-item">
            <p className="stats-condition-label">Avg Wind</p>
            <p className="stats-condition-value">
              {formatWind(conditions.avgWind)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
