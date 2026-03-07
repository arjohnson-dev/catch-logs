import { FaChartLine, FaLocationDot, FaTrophy } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatsOverviewData } from "@/lib/supabase-data";
import { formatLength, formatStatDate, formatWeight } from "@/stats/helpers";

type Props = {
  overview: StatsOverviewData;
};

export default function StatsSummaryCards({ overview }: Props) {
  const personalBest = overview.personalBest;
  const bestLocation = overview.bestLocation;

  return (
    <div className="stats-grid-summary">
      <Card className="stats-card">
        <CardHeader className="pb-3">
          <CardTitle className="stats-card-title">
            <FaChartLine className="h-4 w-4" />
            Total Caught
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="stats-metric-value">{overview.totalCaught}</p>
          <p className="stats-metric-subtle">Across all logged catches</p>
        </CardContent>
      </Card>

      <Card className="stats-card">
        <CardHeader className="pb-3">
          <CardTitle className="stats-card-title">
            <FaTrophy className="h-4 w-4" />
            Personal Best
          </CardTitle>
        </CardHeader>
        <CardContent>
          {personalBest ? (
            <div className="stats-metric-stack">
              <p className="stats-metric-primary">{personalBest.species ?? "Unknown Species"}</p>
              <p className="stats-metric-subtle">
                {formatWeight(personalBest.weight)} | {formatLength(personalBest.length)}
              </p>
              <p className="stats-metric-subtle">{formatStatDate(personalBest.dateTime)}</p>
            </div>
          ) : (
            <p className="stats-metric-subtle">No catches logged yet.</p>
          )}
        </CardContent>
      </Card>

      <Card className="stats-card stats-summary-location">
        <CardHeader className="pb-3">
          <CardTitle className="stats-card-title">
            <FaLocationDot className="h-4 w-4" />
            Best Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          {bestLocation ? (
            <div className="stats-metric-stack">
              <p className="stats-metric-primary stats-wrap">{bestLocation.name ?? "Unknown Location"}</p>
              <p className="stats-metric-subtle">{bestLocation.catches} catches logged</p>
            </div>
          ) : (
            <p className="stats-metric-subtle">No location data available yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

