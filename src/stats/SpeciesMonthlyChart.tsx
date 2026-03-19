import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatsSpeciesDetailData } from "@/lib/supabase-data";

type Props = {
  monthly: StatsSpeciesDetailData["monthly"];
  color: string;
};

export default function SpeciesMonthlyChart({ monthly, color }: Props) {
  return (
    <Card className="stats-card">
      <CardHeader>
        <CardTitle className="stats-card-title">Catches By Month</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthly} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2f2f2f" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: "#9aa3b2", fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis
              allowDecimals={false}
              tick={{ fill: "#9aa3b2", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const row = payload[0].payload as { month: string; catches: number };
                return (
                  <div className="stats-tooltip">
                    <p>{row.month}</p>
                    <p className="stats-tooltip-value">{row.catches} catches</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="catches" fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

