import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Row = {
  name: string;
  count: number;
};

type Props = {
  rows: Row[];
  title: string;
  emptyLabel?: string;
};

export default function TopNamedCountChart({
  rows,
  title,
  emptyLabel = "No data available yet.",
}: Props) {
  const data = rows.slice(0, 8).map((row) => ({
    ...row,
    shortName: row.name.length > 28 ? `${row.name.slice(0, 28)}...` : row.name,
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
                  const row = payload[0].payload as Row;
                  return (
                    <div className="stats-tooltip">
                      <p className="stats-wrap">{row.name}</p>
                      <p className="stats-tooltip-value">{row.count} catches</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="count" radius={[3, 3, 3, 3]}>
                {data.map((row, index) => (
                  <Cell key={row.name} fill={index === 0 ? "#3b82f6" : "#2563eb"} fillOpacity={1 - index * 0.06} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="stats-empty-inline">{emptyLabel}</p>
        )}
      </CardContent>
    </Card>
  );
}
