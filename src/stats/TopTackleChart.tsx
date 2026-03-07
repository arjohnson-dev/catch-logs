import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatsOverviewData } from "@/lib/supabase-data";

type Props = {
  rows: StatsOverviewData["topTackle"];
  title?: string;
};

export default function TopTackleChart({ rows, title = "Top Tackle" }: Props) {
  const data = rows.slice(0, 8).map((row) => ({
    ...row,
    shortName: row.tackle.length > 28 ? `${row.tackle.slice(0, 28)}...` : row.tackle,
  }));

  return (
    <Card className="stats-card">
      <CardHeader>
        <CardTitle className="stats-card-title">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(180, data.length * 34)}>
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
              <XAxis type="number" allowDecimals={false} tick={{ fill: "#9aa3b2", fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="shortName"
                width={138}
                tick={{ fill: "#cbd5e1", fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as { tackle: string; count: number };
                  return (
                    <div className="stats-tooltip">
                      <p className="stats-wrap">{row.tackle}</p>
                      <p className="stats-tooltip-value">{row.count} catches</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[3, 3, 3, 3]}>
                {data.map((row, index) => (
                  <Cell key={row.tackle} fill={index === 0 ? "#3b82f6" : "#2563eb"} fillOpacity={1 - index * 0.06} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="stats-empty-inline">No tackle data available yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

