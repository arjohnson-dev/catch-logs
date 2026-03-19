import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatsOverviewData } from "@/lib/supabase-data";
import { getSpeciesColor } from "@/stats/helpers";

type Props = {
  speciesBreakdown: StatsOverviewData["speciesBreakdown"];
  totalCaught: number;
  onSelectSpecies: (species: string) => void;
};

export default function SpeciesBreakdownChart({
  speciesBreakdown,
  totalCaught,
  onSelectSpecies,
}: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const chartData = useMemo(
    () =>
      speciesBreakdown.map((entry, index) => ({
        ...entry,
        color: getSpeciesColor(entry.species, index),
      })),
    [speciesBreakdown],
  );

  return (
    <Card className="stats-card">
      <CardHeader>
        <CardTitle className="stats-card-title">Species Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="stats-species-layout">
            <div className="stats-species-chart">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="count"
                    nameKey="species"
                    innerRadius={56}
                    outerRadius={92}
                    paddingAngle={2}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                    onClick={(_, index) => onSelectSpecies(chartData[index]?.species ?? "")}
                    style={{ cursor: "pointer" }}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={entry.species}
                        fill={entry.color}
                        opacity={activeIndex === null || activeIndex === index ? 1 : 0.32}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0];
                      return (
                        <div className="stats-tooltip">
                          <p>{row.name}</p>
                          <p className="stats-tooltip-value">{row.value} catches</p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="stats-species-list">
              {chartData.map((entry) => {
                const pct = totalCaught > 0 ? Math.round((entry.count / totalCaught) * 100) : 0;
                return (
                  <button
                    key={entry.species}
                    type="button"
                    className="stats-species-row"
                    onClick={() => onSelectSpecies(entry.species)}
                  >
                    <span className="stats-species-dot" style={{ backgroundColor: entry.color }} />
                    <span className="stats-species-name stats-wrap">{entry.species}</span>
                    <span className="stats-species-count">{entry.count}</span>
                    <span className="stats-species-pct">{pct}%</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="stats-empty-inline">Log catches to see species breakdown.</p>
        )}
      </CardContent>
    </Card>
  );
}

