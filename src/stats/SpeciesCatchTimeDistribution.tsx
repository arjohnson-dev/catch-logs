import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatsSpeciesDetailData } from "@/lib/supabase-data";
import { formatHour } from "@/stats/helpers";

type Props = {
  catchTimes: StatsSpeciesDetailData["catchTimes"];
  color: string;
};

export default function SpeciesCatchTimeDistribution({ catchTimes, color }: Props) {
  const hasCatchTimes = catchTimes.some((row) => row.catches > 0);

  return (
    <Card className="stats-card">
      <CardHeader>
        <CardTitle className="stats-card-title">Catch Distribution By Time Of Day</CardTitle>
      </CardHeader>
      <CardContent>
        {hasCatchTimes ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={catchTimes} margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#2f2f2f" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="hour"
                ticks={[0, 6, 12, 18, 23]}
                tickFormatter={(value) => formatHour(Number(value))}
                tick={{ fill: "#9aa3b2", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "#9aa3b2", fontSize: 10 }}
                width={32}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(47, 128, 237, 0.08)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as { hour: number; catches: number };
                  return (
                    <div className="stats-tooltip">
                      <p>{formatHour(row.hour)}</p>
                      <p className="stats-tooltip-value">
                        {row.catches} {row.catches === 1 ? "catch" : "catches"}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="catches" fill={color} radius={[0, 0, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="stats-empty-inline">
            No catch-time data available for this species yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
