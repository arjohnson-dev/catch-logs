import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StatsSpeciesDetailData } from "@/lib/supabase-data";
import { formatHour } from "@/stats/helpers";

type Metric = "length" | "weight";

type Props = {
  points: StatsSpeciesDetailData["points"];
  color: string;
};

export default function SpeciesTimeScatter({ points, color }: Props) {
  const [metric, setMetric] = useState<Metric>("length");
  const rows = useMemo(
    () =>
      points
        .filter((point) => (metric === "length" ? point.length !== null : point.weight !== null))
        .map((point) => ({
          ...point,
          value: metric === "length" ? point.length ?? 0 : point.weight ?? 0,
        })),
    [metric, points],
  );

  const yDomain = useMemo((): [number, number] => {
    if (rows.length === 0) return [0, 1];
    const values = rows.map((row) => row.value).filter((value) => Number.isFinite(value));
    if (values.length === 0) return [0, 1];
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (min === max) {
      return [Math.max(0, min - 1), max + 1];
    }
    const pad = (max - min) * 0.15;
    return [Math.max(0, min - pad), max + pad];
  }, [rows]);

  return (
    <Card className="stats-card">
      <CardHeader className="stats-scatter-header">
        <CardTitle className="stats-card-title">Size vs Time Of Day</CardTitle>
        <div className="stats-toggle-group">
          <button
            type="button"
            className={`stats-toggle-button ${metric === "length" ? "stats-toggle-button-active" : ""}`}
            onClick={() => setMetric("length")}
          >
            Length
          </button>
          <button
            type="button"
            className={`stats-toggle-button ${metric === "weight" ? "stats-toggle-button-active" : ""}`}
            onClick={() => setMetric("weight")}
          >
            Weight
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <ScatterChart margin={{ top: 6, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#2f2f2f" strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="hour"
                domain={[0, 23]}
                ticks={[0, 6, 12, 18, 23]}
                tickFormatter={(value) => formatHour(value)}
                tick={{ fill: "#9aa3b2", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="number"
                dataKey="value"
                domain={yDomain}
                tickFormatter={(value) => (metric === "length" ? `${value}"` : `${value}lb`)}
                tick={{ fill: "#9aa3b2", fontSize: 10 }}
                width={40}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const row = payload[0].payload as {
                    hour: number;
                    value: number;
                    label: string;
                  };
                  return (
                    <div className="stats-tooltip">
                      <p>{formatHour(row.hour)}</p>
                      <p className="stats-tooltip-value">
                        {metric === "length" ? `${row.value.toFixed(1)}"` : `${row.value.toFixed(1)} lbs`}
                      </p>
                      <p>{row.label}</p>
                    </div>
                  );
                }}
              />
              <Scatter data={rows} fill={color} />
            </ScatterChart>
          </ResponsiveContainer>
        ) : (
          <p className="stats-empty-inline">
            No {metric} data available for this species yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

