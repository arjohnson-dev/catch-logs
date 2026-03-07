import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatsSpeciesDetailData } from "@/lib/supabase-data";

type Props = {
  conditions: StatsSpeciesDetailData["conditions"];
};

export default function SpeciesConditionsCard({ conditions }: Props) {
  if (!conditions) {
    return null;
  }

  const formatMaybe = (value: number | null, suffix: string) =>
    value === null ? "N/A" : `${value.toFixed(1)}${suffix}`;

  return (
    <Card className="stats-card">
      <CardHeader>
        <CardTitle className="stats-card-title">Typical Conditions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="stats-conditions-grid">
          <div className="stats-condition-item">
            <p className="stats-condition-label">Most Common</p>
            <p className="stats-condition-value stats-wrap">{conditions.commonCondition ?? "N/A"}</p>
          </div>
          <div className="stats-condition-item">
            <p className="stats-condition-label">Avg Temp</p>
            <p className="stats-condition-value">{formatMaybe(conditions.avgTemp, "°F")}</p>
          </div>
          <div className="stats-condition-item">
            <p className="stats-condition-label">Avg Wind</p>
            <p className="stats-condition-value">{formatMaybe(conditions.avgWind, " mph")}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

