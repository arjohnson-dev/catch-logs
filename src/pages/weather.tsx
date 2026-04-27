import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { APIProvider } from "@vis.gl/react-google-maps";
import {
  FaArrowLeft,
  FaBookmark,
  FaLocationArrow,
  FaRegBookmark,
} from "react-icons/fa6";
import {
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FeatureBetaBanner from "@/components/feature-beta-banner";
import { WeatherAiSummaryCard } from "@/components/weather-ai-summary-card";
import { WeatherLocationAutocomplete } from "@/components/weather-location-autocomplete";
import { useAuth } from "@/hooks/useAuth";
import { useUnitPreference } from "@/hooks/use-unit-preference";
import { useToast } from "@/hooks/use-toast";
import { appQueryKeys } from "@/lib/query-keys";
import {
  areWeatherLocationsEqual,
  createDeviceWeatherLocation,
  formatWeatherLocationCoordinates,
  formatWeatherLocationSubtitle,
  loadActiveWeatherLocation,
  loadSavedWeatherLocations,
  reverseGeocodeWeatherLocation,
  saveActiveWeatherLocation,
  saveSavedWeatherLocations,
  type WeatherLocation,
} from "@/lib/weather-locations";
import {
  getCurrentWeatherForLocation,
  getWeatherForecastForLocation,
  type WeatherForecastDailyPoint,
  type WeatherForecastHourlyPoint,
} from "@/lib/weather";
import { getWeatherVisual, getWindDirection } from "@/lib/weather-ui";
import {
  convertWindSpeedForDisplay,
  getWindSpeedUnitLabel,
  type UnitSystem,
} from "@/lib/unit-preferences";
import type {
  LunarPhaseData,
  LunarPhaseFunctionResponse,
} from "@/types/weather";

type SelectedLocationSource = "device" | "search" | "saved";
type WeatherScreen = "overview" | "location";
type ForecastRange = "12h" | "24h" | "10d";
type WeatherMetricKey =
  | "temperature"
  | "pressure"
  | "cloudCoverage"
  | "precipitationProbability"
  | "windSpeed";

type ForecastChartPoint = {
  xValue: string;
  xLabel: string;
  tooltipLabel: string;
  value: number | null;
  secondaryValue?: number | null;
  windDirection?: number | null;
};

type WeatherMetricConfig = {
  key: WeatherMetricKey;
  label: string;
  color: string;
  formatValue: (value: number | null) => string;
  yAxisUnit: string;
  formatAxisValue?: (value: number) => string;
};

function getNumericValues(
  data: ForecastChartPoint[],
  {
    includeSecondaryValues = false,
  }: {
    includeSecondaryValues?: boolean;
  },
): number[] {
  return data
    .flatMap((point) => {
      const candidates = [point.value];
      if (includeSecondaryValues) {
        candidates.push(point.secondaryValue ?? null);
      }
      return candidates;
    })
    .filter(
      (value): value is number => typeof value === "number" && Number.isFinite(value),
    );
}

function buildSteppedAxis(
  values: number[],
  step: number,
): { domain: [number, number]; ticks: number[] } | undefined {
  if (values.length === 0) {
    return undefined;
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const lower = Math.floor(minValue / step) * step - step;
  const upper = Math.ceil(maxValue / step) * step + step;
  const ticks: number[] = [];

  for (let value = lower; value <= upper + step / 2; value += step) {
    ticks.push(Number(value.toFixed(10)));
  }

  return {
    domain: [Number(lower.toFixed(10)), Number(upper.toFixed(10))],
    ticks,
  };
}

function getTemperatureYAxisDomain(
  data: ForecastChartPoint[],
): { domain: [number, number]; ticks: number[] } | undefined {
  return buildSteppedAxis(getNumericValues(data, {
    includeSecondaryValues: true,
  }), 5);
}

function getPressureYAxisDomain(
  data: ForecastChartPoint[],
  unitSystem: UnitSystem,
): { domain: [number, number]; ticks: number[] } | undefined {
  return buildSteppedAxis(
    getNumericValues(data, {}),
    unitSystem === "metric" ? 5 : 0.05,
  );
}

function getWindYAxisDomain(
  data: ForecastChartPoint[],
): { domain: [number, number]; ticks: number[] } | undefined {
  return buildSteppedAxis(getNumericValues(data, {}), 5);
}

function getForecastXAxisTicks(
  data: ForecastChartPoint[],
  range: ForecastRange,
) {
  if (data.length <= 2 || range === "10d") {
    return data.map((point) => point.xValue);
  }

  const step = range === "12h" ? 2 : 4;
  const ticks = data
    .filter((_, index) => index % step === 0)
    .map((point) => point.xValue);
  const lastTick = data[data.length - 1]?.xValue;

  if (lastTick && !ticks.includes(lastTick)) {
    ticks.push(lastTick);
  }

  return ticks;
}

const LUNAR_PHASE_UNAVAILABLE_MESSAGE =
  "Lunar phase data is unavailable right now.";
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const lunarPhaseUrl = supabaseUrl
  ? `${supabaseUrl}/functions/v1/lunar-phase`
  : null;

const FARGO_DEFAULT_LOCATION: WeatherLocation = {
  id: "default:fargo-nd",
  name: "Fargo, ND",
  latitude: 46.8772,
  longitude: -96.7898,
  admin1: "North Dakota",
  country: "United States",
  timezone: "America/Chicago",
};
const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? "";

function getStoredLocationState(userId?: string | null) {
  const savedLocations = loadSavedWeatherLocations(userId);
  const activeLocation = loadActiveWeatherLocation(userId);
  const selectedSource = activeLocation
    ? savedLocations.some((location) =>
        areWeatherLocationsEqual(location, activeLocation),
      )
      ? "saved"
      : "search"
    : null;

  return {
    savedLocations,
    activeLocation,
    selectedSource,
  } as const;
}

function formatTemperatureValue(value: number | null, unitSystem: UnitSystem) {
  if (value == null) {
    return "--";
  }

  return `${Math.round(value)}°${unitSystem === "metric" ? "C" : "F"}`;
}

function convertPressureForDisplay(
  value: number | null,
  unitSystem: UnitSystem,
) {
  if (value == null) {
    return null;
  }

  return unitSystem === "metric" ? value : value * 0.0295299830714;
}

function formatPressureValue(value: number | null, unitSystem: UnitSystem) {
  const converted = convertPressureForDisplay(value, unitSystem);
  if (converted == null) {
    return "--";
  }

  return unitSystem === "metric"
    ? `${Math.round(converted)} hPa`
    : `${converted.toFixed(2)} inHg`;
}

function formatPressureDisplayValue(
  value: number | null,
  unitSystem: UnitSystem,
) {
  if (value == null) {
    return "--";
  }

  return unitSystem === "metric"
    ? `${Math.round(value)} hPa`
    : `${value.toFixed(2)} inHg`;
}

function formatWindSpeedValue(
  value: number | null,
  unitSystem: UnitSystem,
  windSpeedDisplay: "knots" | "system",
) {
  const converted = convertWindSpeedForDisplay(
    value,
    unitSystem,
    windSpeedDisplay,
  );
  if (converted == null) {
    return "--";
  }

  return `${Math.round(converted)} ${getWindSpeedUnitLabel(unitSystem, windSpeedDisplay)}`;
}

function formatHourlyAxisLabel(value: string) {
  return value.replace("AM", "a").replace("PM", "p");
}

function getForecastMetrics(
  unitSystem: UnitSystem,
  windSpeedDisplay: "knots" | "system",
): WeatherMetricConfig[] {
  return [
    {
      key: "temperature",
      label: "Temperature",
      color: "var(--chart-3)",
      formatValue: (value) => formatTemperatureValue(value, unitSystem),
      yAxisUnit: unitSystem === "metric" ? "°C" : "°F",
    },
    {
      key: "pressure",
      label: "Barometric Pressure",
      color: "#2db395",
      // Forecast chart pressure values are already converted for display units.
      formatValue: (value) => formatPressureDisplayValue(value, unitSystem),
      yAxisUnit: unitSystem === "metric" ? "hPa" : "inHg",
      formatAxisValue: (value) =>
        unitSystem === "metric" ? `${Math.round(value)}` : value.toFixed(2),
    },
    {
      key: "cloudCoverage",
      label: "Cloud Cover",
      color: "var(--chart-1)",
      formatValue: (value) => (value != null ? `${Math.round(value)}%` : "--"),
      yAxisUnit: "%",
    },
    {
      key: "precipitationProbability",
      label: "Precip Chance",
      color: "var(--chart-5)",
      formatValue: (value) => (value != null ? `${Math.round(value)}%` : "--"),
      yAxisUnit: "%",
    },
    {
      key: "windSpeed",
      label: "Wind Speed",
      color: "var(--chart-4)",
      formatValue: (value) =>
        formatWindSpeedValue(value, unitSystem, windSpeedDisplay),
      yAxisUnit: getWindSpeedUnitLabel(unitSystem, windSpeedDisplay),
    },
  ];
}

function buildHourlyChartData(
  points: WeatherForecastHourlyPoint[],
  metric: WeatherMetricKey,
  unitSystem: UnitSystem,
  windSpeedDisplay: "knots" | "system",
): ForecastChartPoint[] {
  return points.map((point) => ({
    xValue: point.time,
    xLabel: formatHourlyAxisLabel(format(parseISO(point.time), "ha")),
    tooltipLabel: format(parseISO(point.time), "EEE h a"),
    value:
      metric === "pressure"
        ? convertPressureForDisplay(point.pressure, unitSystem)
        : metric === "windSpeed"
          ? convertWindSpeedForDisplay(
              point.windSpeed,
              unitSystem,
              windSpeedDisplay,
            )
          : point[metric],
    secondaryValue: metric === "temperature" ? point.temperatureLow : null,
    windDirection: point.windDirection,
  }));
}

function buildDailyChartData(
  points: WeatherForecastDailyPoint[],
  metric: WeatherMetricKey,
  unitSystem: UnitSystem,
  windSpeedDisplay: "knots" | "system",
): ForecastChartPoint[] {
  return points.map((point) => ({
    xValue: point.date,
    xLabel: format(parseISO(point.date), "EEE"),
    tooltipLabel: format(parseISO(point.date), "EEEE, MMM d"),
    value:
      metric === "temperature"
        ? point.temperatureHigh
        : metric === "pressure"
          ? convertPressureForDisplay(point.pressure, unitSystem)
          : metric === "windSpeed"
            ? convertWindSpeedForDisplay(
                point.windSpeed,
                unitSystem,
                windSpeedDisplay,
              )
            : point[metric],
    secondaryValue: metric === "temperature" ? point.temperatureLow : null,
    windDirection: point.windDirection,
  }));
}

function WeatherDirectionDot(props: {
  cx?: number;
  cy?: number;
  payload?: ForecastChartPoint;
  stroke?: string;
}) {
  const { cx, cy, payload, stroke } = props;
  if (
    typeof cx !== "number" ||
    typeof cy !== "number" ||
    payload?.value == null ||
    payload.windDirection == null
  ) {
    return null;
  }

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${payload.windDirection})`}>
      <path
        d="M0 -9 L6 4.5 L0 1.5 L-6 4.5 Z"
        fill={stroke ?? "currentColor"}
        stroke="rgba(15, 15, 18, 0.85)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </g>
  );
}

function TemperatureExtremeDot(props: {
  cx?: number;
  cy?: number;
  visible: boolean;
}) {
  const { cx, cy, visible } = props;
  if (typeof cx !== "number" || typeof cy !== "number") {
    return null;
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill="rgba(239, 242, 247, 0.88)"
      stroke="rgba(15, 15, 18, 0.92)"
      strokeWidth={2}
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 220ms ease",
      }}
    />
  );
}

function TemperatureExtremeLabel(props: {
  x?: number;
  y?: number;
  viewBox?: { x?: number; y?: number };
  value?: string | number;
  dx?: number;
  visible: boolean;
  textAnchor?: "start" | "middle" | "end";
}) {
  const {
    x: markerX,
    y: markerY,
    viewBox,
    value,
    dx = 0,
    visible,
    textAnchor = "middle",
  } = props;
  const x = (markerX ?? viewBox?.x ?? 0) + dx;
  const y = markerY ?? viewBox?.y ?? 0;

  if (value == null) {
    return null;
  }

  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      fill="rgba(239, 242, 247, 0.88)"
      fontSize={11}
      fontWeight={700}
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 220ms ease",
      }}
    >
      {value}
    </text>
  );
}

function WeatherMetricChart({
  title,
  unit,
  color,
  data,
  formatValue,
  showDirectionArrows = false,
  showHighLow = false,
  rangeMarkerMode = "none",
  yAxisWidth = 40,
  yAxisTickFormatter,
  yAxisDomain,
  yAxisTicks,
  xAxisTicks,
}: {
  title: string;
  unit: string;
  color: string;
  data: ForecastChartPoint[];
  formatValue: (value: number | null) => string;
  showDirectionArrows?: boolean;
  showHighLow?: boolean;
  rangeMarkerMode?: "none" | "high" | "high-low";
  yAxisWidth?: number;
  yAxisTickFormatter?: (value: number) => string;
  yAxisDomain?: [number, number];
  yAxisTicks?: number[];
  xAxisTicks?: string[];
}) {
  const markerAnimationDurationMs = 700;
  const rangeMarkers = useMemo(() => {
    if (rangeMarkerMode === "none" || data.length === 0) {
      return [] as Array<{
        key: string;
        xValue: string;
        value: number;
        label: string;
        textAnchor: "start" | "middle" | "end";
        dx: number;
      }>;
    }

    let highestPoint: ForecastChartPoint | null = null;
    let lowestPoint: ForecastChartPoint | null = null;

    data.forEach((point) => {
      if (point.value == null) {
        return;
      }

      if (!highestPoint || point.value > highestPoint.value!) {
        highestPoint = point;
      }

      if (!lowestPoint || point.value < lowestPoint.value!) {
        lowestPoint = point;
      }
    });

    const markers = [] as Array<{
      key: string;
      xValue: string;
      value: number;
      label: string;
      textAnchor: "start" | "middle" | "end";
      dx: number;
    }>;

    const getLabelPlacement = (point: ForecastChartPoint) => {
      const index = data.findIndex((entry) => entry.xValue === point.xValue);
      if (index <= 0) {
        return { textAnchor: "start" as const, dx: 4 };
      }

      if (index >= data.length - 1) {
        return { textAnchor: "end" as const, dx: -4 };
      }

      return { textAnchor: "middle" as const, dx: 0 };
    };

    if (highestPoint?.value != null) {
      const placement = getLabelPlacement(highestPoint);
      markers.push({
        key: `high-${highestPoint.xValue}`,
        xValue: highestPoint.xValue,
        value: highestPoint.value,
        label: formatValue(highestPoint.value),
        textAnchor: placement.textAnchor,
        dx: placement.dx,
      });
    }

    if (rangeMarkerMode === "high-low" && lowestPoint?.value != null) {
      const placement = getLabelPlacement(lowestPoint);
      markers.push({
        key: `low-${lowestPoint.xValue}`,
        xValue: lowestPoint.xValue,
        value: lowestPoint.value,
        label: formatValue(lowestPoint.value),
        textAnchor: placement.textAnchor,
        dx: placement.dx,
      });
    }

    return markers;
  }, [data, formatValue, rangeMarkerMode]);
  const [showMarkerLabelsReady, setShowMarkerLabelsReady] = useState(
    rangeMarkerMode === "none",
  );

  useEffect(() => {
    if (rangeMarkerMode === "none") {
      return;
    }

    const timer = window.setTimeout(() => {
      setShowMarkerLabelsReady(true);
    }, markerAnimationDurationMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [data, markerAnimationDurationMs, rangeMarkerMode]);

  const showMarkerLabels = rangeMarkerMode === "none" || showMarkerLabelsReady;

  return (
    <Card className="resources-card surface-card">
      <CardHeader className="pb-2">
        <div className="resources-weather-chart-header">
          <CardTitle className="resources-section-title">{title}</CardTitle>
          <span className="resources-weather-chart-unit">{unit}</span>
        </div>
      </CardHeader>
      <CardContent className="px-0 pt-0">
        <div className="resources-weather-chart-wrap">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart
              data={data}
              margin={{
                top: rangeMarkerMode !== "none" ? 18 : 6,
                right: 12,
                left: 0,
                bottom: 4,
              }}
            >
              {yAxisTicks?.map((tick) => (
                <ReferenceLine
                  key={`y-grid-${tick}`}
                  y={tick}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeWidth={1}
                />
              ))}
              {xAxisTicks?.map((tick) => (
                <ReferenceLine
                  key={`x-grid-${tick}`}
                  x={tick}
                  stroke="rgba(255, 255, 255, 0.06)"
                  strokeWidth={1}
                />
              ))}
              <XAxis
                dataKey="xValue"
                scale="point"
                ticks={xAxisTicks}
                tick={{ fill: "#8a8f98", fontSize: 11 }}
                tickFormatter={(value) =>
                  data.find((point) => point.xValue === value)?.xLabel ?? ""
                }
                axisLine={false}
                tickLine={false}
                interval={0}
                minTickGap={10}
                tickMargin={8}
                padding="no-gap"
              />
              <YAxis
                ticks={yAxisTicks}
                tick={{ fill: "#8a8f98", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                width={yAxisWidth}
                domain={yAxisDomain}
                tickFormatter={(value) =>
                  yAxisTickFormatter ? yAxisTickFormatter(value) : `${Math.round(value)}`
                }
              />
              <Tooltip
                cursor={{ stroke: "rgba(255, 255, 255, 0.08)", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) {
                    return null;
                  }

                  const row = payload[0].payload as ForecastChartPoint;
                  return (
                    <div className="resources-weather-chart-tooltip">
                      <p>{row.tooltipLabel}</p>
                      {showHighLow ? (
                        <>
                          <p className="resources-weather-chart-tooltip-value">
                            {`High ${formatValue(row.value)}`}
                          </p>
                          <p className="resources-weather-chart-tooltip-value resources-weather-chart-tooltip-value-secondary">
                            {`Low ${formatValue(row.secondaryValue ?? null)}`}
                          </p>
                        </>
                      ) : (
                        <p className="resources-weather-chart-tooltip-value">
                          {formatValue(row.value)}
                        </p>
                      )}
                      {showDirectionArrows && row.windDirection != null ? (
                        <p>{`Wind ${getWindDirection(row.windDirection)} (${Math.round(row.windDirection)}°)`}</p>
                      ) : null}
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                dot={
                  showDirectionArrows ? (
                    <WeatherDirectionDot stroke={color} />
                  ) : (
                    false
                  )
                }
                activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
                connectNulls
                name={showHighLow ? "High" : title}
                isAnimationActive
                animationDuration={markerAnimationDurationMs}
                animationEasing="ease-out"
              />
              {rangeMarkers.map((marker) => (
                <ReferenceDot
                  key={marker.key}
                  x={marker.xValue}
                  y={marker.value}
                  ifOverflow="extendDomain"
                  shape={<TemperatureExtremeDot visible={showMarkerLabels} />}
                  label={
                    <TemperatureExtremeLabel
                      value={marker.label}
                      dx={marker.dx}
                      textAnchor={marker.textAnchor}
                      visible={showMarkerLabels}
                    />
                  }
                />
              ))}
              {showHighLow ? (
                <Line
                  type="monotone"
                  dataKey="secondaryValue"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, fill: "var(--chart-2)", strokeWidth: 0 }}
                  connectNulls
                  name="Low"
                  isAnimationActive
                  animationDuration={markerAnimationDurationMs}
                  animationEasing="ease-out"
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {showHighLow ? (
          <div
            className="resources-weather-chart-legend resources-weather-chart-legend-padded"
            aria-hidden="true"
          >
            <span className="resources-weather-chart-legend-item">
              <span
                className="resources-weather-chart-legend-swatch"
                style={{ backgroundColor: color }}
              />
              High
            </span>
            <span className="resources-weather-chart-legend-item">
              <span
                className="resources-weather-chart-legend-swatch"
                style={{ backgroundColor: "var(--chart-2)" }}
              />
              Low
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

async function getLunarPhaseForecast(
  latitude: number,
  longitude: number,
  days = 5,
) {
  if (!lunarPhaseUrl) {
    throw new Error("Missing VITE_SUPABASE_URL");
  }

  const response = await fetch(lunarPhaseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/plain;charset=UTF-8",
    },
    body: JSON.stringify({
      latitude,
      longitude,
      days,
    }),
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(LUNAR_PHASE_UNAVAILABLE_MESSAGE);
    }
  }

  if (!response.ok) {
    const payload = data as LunarPhaseFunctionResponse | null;
    throw new Error(payload?.error ?? LUNAR_PHASE_UNAVAILABLE_MESSAGE);
  }

  const payload = data as LunarPhaseFunctionResponse | null;
  if (!payload || payload.ok !== true || !Array.isArray(payload.phases)) {
    throw new Error(payload?.error ?? LUNAR_PHASE_UNAVAILABLE_MESSAGE);
  }

  return payload.phases.filter(
    (phase): phase is LunarPhaseData =>
      Boolean(phase) &&
      typeof phase.date === "string" &&
      typeof phase.phaseName === "string" &&
      typeof phase.value === "number" &&
      typeof phase.illuminationPercent === "number",
  );
}

function LunarCycleCard({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const lunarForecastQuery = useQuery({
    queryKey: appQueryKeys.lunarPhase(latitude, longitude, 5),
    queryFn: () => getLunarPhaseForecast(latitude, longitude, 5),
    staleTime: 1000 * 60 * 60 * 6,
    retry: false,
  });
  const lunarForecast = lunarForecastQuery.data ?? [];
  const currentPhase = lunarForecast[0] ?? null;

  return (
    <Card className="resources-card surface-card">
      <CardHeader className="pb-3">
        <CardTitle className="resources-section-title">
          Lunar Calendar
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {lunarForecastQuery.isLoading ? (
          <p className="resources-weather-status-copy">
            Loading lunar phase data for this location...
          </p>
        ) : !currentPhase ? (
          <p className="resources-weather-status-copy">
            {LUNAR_PHASE_UNAVAILABLE_MESSAGE}
          </p>
        ) : (
          <>
            <div className="resources-weather-lunar-current">
              <span
                className="resources-weather-lunar-current-icon"
                aria-hidden="true"
              >
                <LunarPhaseIcon phaseLabel={currentPhase.phaseName} />
              </span>
              <div>
                <p className="resources-weather-lunar-current-label">
                  Current Phase
                </p>
                <p className="resources-weather-lunar-current-value">
                  {currentPhase.phaseName}
                </p>
                <p className="resources-weather-lunar-current-percent">
                  {`${currentPhase.illuminationPercent}% illuminated on ${format(parseISO(currentPhase.date), "MMM d")}`}
                </p>
              </div>
            </div>

            <div
              className="resources-weather-lunar-forecast"
              aria-label="Upcoming lunar forecast"
            >
              <p className="resources-weather-lunar-forecast-label">
                Lunar Forecast
              </p>
              <div className="resources-weather-lunar-forecast-row">
                {lunarForecast.map((day) => (
                  <LunarForecastDay key={day.date} day={day} />
                ))}
              </div>
            </div>
          </>
        )}

        <p className="resources-weather-lunar-attribution">
          Lunar icons by{" "}
          <a href="https://www.freepik.com" target="_blank" rel="noreferrer">
            Freepik
          </a>{" "}
          and{" "}
          <a
            href="https://www.flaticon.com/authors/ifans28"
            target="_blank"
            rel="noreferrer"
          >
            ifans28
          </a>{" "}
          via{" "}
          <a href="https://www.flaticon.com/" target="_blank" rel="noreferrer">
            Flaticon
          </a>
          .
        </p>
      </CardContent>
    </Card>
  );
}

function LunarForecastDay({ day }: { day: LunarPhaseData }) {
  return (
    <div className="resources-weather-lunar-forecast-day">
      <span
        className="resources-weather-lunar-forecast-icon"
        aria-hidden="true"
      >
        <LunarPhaseIcon phaseLabel={day.phaseName} />
      </span>
      <span className="resources-weather-lunar-forecast-date">
        {format(parseISO(day.date), "MMM d")}
      </span>
      <span className="resources-weather-lunar-forecast-phase">
        {day.phaseName}
      </span>
      <span className="resources-weather-lunar-forecast-percent">
        {`${day.illuminationPercent}%`}
      </span>
    </div>
  );
}

function formatSunTime(value: string | null | undefined) {
  if (!value) {
    return "--";
  }

  const date = parseISO(value);
  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return format(date, "h:mm a");
}

function getSunArcProgress(
  sunrise: string | null | undefined,
  sunset: string | null | undefined,
) {
  if (!sunrise || !sunset) {
    return null;
  }

  const observed = Date.now();
  const rise = parseISO(sunrise).getTime();
  const set = parseISO(sunset).getTime();

  if (
    [observed, rise, set].some((value) => Number.isNaN(value)) ||
    set <= rise
  ) {
    return null;
  }

  return Math.max(0, Math.min(1, (observed - rise) / (set - rise)));
}

function SunArcCard({
  sunrise,
  sunset,
}: {
  sunrise: string | null | undefined;
  sunset: string | null | undefined;
}) {
  const progress = getSunArcProgress(sunrise, sunset);
  const hasSunData = Boolean(sunrise && sunset);
  const angle = progress == null ? 180 : 180 - progress * 180;
  const radius = 82;
  const centerX = 120;
  const centerY = 92;
  const sunX = centerX + radius * Math.cos((angle * Math.PI) / 180);
  const sunY = centerY - radius * Math.sin((angle * Math.PI) / 180);

  return (
    <Card className="resources-card surface-card">
      <CardHeader className="pb-3">
        <CardTitle className="resources-section-title">
          Sunrise & Sunset
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {hasSunData ? (
          <div className="resources-weather-sun-card">
            <div className="resources-weather-sun-graphic" aria-hidden="true">
              <svg viewBox="0 0 240 108" className="resources-weather-sun-svg">
                <defs>
                  <linearGradient
                    id="resources-weather-sun-arc-gradient"
                    x1="38"
                    y1="92"
                    x2="202"
                    y2="92"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>
                <path
                  d="M38 92 A82 82 0 0 1 202 92"
                  className="resources-weather-sun-arc"
                />
                <path
                  d="M38 92 A82 82 0 0 1 202 92"
                  pathLength={100}
                  strokeDasharray={
                    progress == null ? 0 : `${progress * 100} 100`
                  }
                  className="resources-weather-sun-arc-fill"
                />
                <circle
                  cx="38"
                  cy="92"
                  r="3"
                  className="resources-weather-sun-horizon-dot"
                />
                <circle
                  cx="202"
                  cy="92"
                  r="3"
                  className="resources-weather-sun-horizon-dot"
                />
                <circle
                  cx={progress == null ? 38 : sunX}
                  cy={progress == null ? 92 : sunY}
                  r="8"
                  className="resources-weather-sun-marker"
                />
              </svg>
            </div>

            <div className="resources-weather-sun-times">
              <div className="resources-weather-sun-time">
                <span className="resources-weather-sun-time-label">
                  Sunrise
                </span>
                <strong className="resources-weather-sun-time-value resources-weather-sun-time-value-sunrise">
                  {formatSunTime(sunrise)}
                </strong>
              </div>
              <div className="resources-weather-sun-time resources-weather-sun-time-end">
                <span className="resources-weather-sun-time-label">Sunset</span>
                <strong className="resources-weather-sun-time-value resources-weather-sun-time-value-sunset">
                  {formatSunTime(sunset)}
                </strong>
              </div>
            </div>
          </div>
        ) : (
          <p className="resources-weather-status-copy">
            Sunrise and sunset data are unavailable right now.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function LunarPhaseIcon({ phaseLabel }: { phaseLabel?: string | null }) {
  const variant = phaseLabel ?? "New Moon";
  const iconPathMap: Record<string, string> = {
    "New Moon": "/lunar-phase-icons/008-new-moon.png",
    "Waxing Crescent": "/lunar-phase-icons/007-waxing-cresent.png",
    "First Quarter": "/lunar-phase-icons/006-first-quarter.png",
    "Waxing Gibbous": "/lunar-phase-icons/005-waxing-gibbous.png",
    "Full Moon": "/lunar-phase-icons/004-full-moon.png",
    "Waning Gibbous": "/lunar-phase-icons/003-waning-gibbous.png",
    "Last Quarter": "/lunar-phase-icons/002-last-quarter.png",
    "Waning Crescent": "/lunar-phase-icons/001-waning-cresnet.png",
  };
  const src = iconPathMap[variant] ?? iconPathMap["New Moon"];

  return (
    <span
      aria-hidden="true"
      className="resources-weather-lunar-phase-image"
      style={{
        maskImage: `url(${src})`,
        WebkitMaskImage: `url(${src})`,
      }}
    />
  );
}

export default function WeatherPage() {
  const { user } = useAuth();
  const { unitSystem, windSpeedDisplay } = useUnitPreference();
  const { toast } = useToast();
  const userId = user?.id ?? null;

  return (
    <WeatherPageContent
      key={userId ?? "guest"}
      userId={userId}
      unitSystem={unitSystem}
      windSpeedDisplay={windSpeedDisplay}
      toast={toast}
    />
  );
}

function WeatherPageContent({
  userId,
  unitSystem,
  windSpeedDisplay,
  toast,
}: {
  userId: string | null;
  unitSystem: UnitSystem;
  windSpeedDisplay: "knots" | "system";
  toast: ReturnType<typeof useToast>["toast"];
}) {
  const storedLocationState = useMemo(
    () => getStoredLocationState(userId),
    [userId],
  );
  const [savedLocations, setSavedLocations] = useState<WeatherLocation[]>(
    storedLocationState.savedLocations,
  );
  const [selectedLocation, setSelectedLocation] =
    useState<WeatherLocation | null>(storedLocationState.activeLocation);
  const [selectedSource, setSelectedSource] =
    useState<SelectedLocationSource | null>(storedLocationState.selectedSource);
  const [searchInput, setSearchInput] = useState("");
  const [locationPermissionState, setLocationPermissionState] = useState<
    PermissionState | "unsupported" | "unknown"
  >("unknown");
  const [locationStatusMessage, setLocationStatusMessage] = useState<
    string | null
  >(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [screen, setScreen] = useState<WeatherScreen>("overview");
  const [forecastRange, setForecastRange] = useState<ForecastRange>("12h");
  const manualSelectionRef = useRef(false);
  const selectedLocationRef = useRef<WeatherLocation | null>(
    storedLocationState.activeLocation,
  );

  useEffect(() => {
    saveSavedWeatherLocations(savedLocations, userId);
  }, [savedLocations, userId]);

  useEffect(() => {
    selectedLocationRef.current = selectedLocation;
  }, [selectedLocation]);

  const applySelectedLocation = useCallback(
    (
      location: WeatherLocation,
      source: SelectedLocationSource,
      options?: { manual?: boolean },
    ) => {
      if (options?.manual) {
        manualSelectionRef.current = true;
      }

      setSelectedLocation(location);
      setSelectedSource(source);

      if (source === "device") {
        saveActiveWeatherLocation(null, userId);
        return;
      }

      saveActiveWeatherLocation(location, userId);
    },
    [userId],
  );

  const requestDeviceLocation = useCallback(
    async (options?: { manual?: boolean }) => {
      if (!("geolocation" in navigator)) {
        setLocationPermissionState("unsupported");
        setLocationStatusMessage(
          "Location services are not supported in this browser.",
        );
        return false;
      }

      const isManualRequest = Boolean(options?.manual);
      if (isManualRequest) {
        setIsRequestingLocation(true);
      }
      setLocationStatusMessage(null);

      return await new Promise<boolean>((resolve) => {
        const applyPosition = (position: GeolocationPosition) => {
          if (isManualRequest) {
            setIsRequestingLocation(false);
          }
          setLocationPermissionState("granted");
          setLocationStatusMessage(null);

          if (!options?.manual && manualSelectionRef.current) {
            resolve(true);
            return;
          }

          applySelectedLocation(
            createDeviceWeatherLocation(
              position.coords.latitude,
              position.coords.longitude,
            ),
            "device",
            options,
          );
          resolve(true);
        };

        const handleFailure = (error: GeolocationPositionError) => {
          if (isManualRequest) {
            setIsRequestingLocation(false);
          }

          if (error.code === error.PERMISSION_DENIED) {
            setLocationPermissionState("denied");
            setLocationStatusMessage(
              "Location access is turned off. Showing Fargo, ND until you choose another location.",
            );
            if (!selectedLocationRef.current) {
              applySelectedLocation(FARGO_DEFAULT_LOCATION, "search");
            }
          } else {
            setLocationStatusMessage(
              "Unable to get your current location right now. You can search for a place instead.",
            );

            if (!selectedLocationRef.current) {
              applySelectedLocation(FARGO_DEFAULT_LOCATION, "search");
            }
          }

          resolve(false);
        };

        const fastOptions: PositionOptions = {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 1000 * 60 * 10,
        };

        const preciseOptions: PositionOptions = {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 0,
        };

        if (isManualRequest) {
          navigator.geolocation.getCurrentPosition(
            applyPosition,
            () => {
              navigator.geolocation.getCurrentPosition(
                applyPosition,
                handleFailure,
                fastOptions,
              );
            },
            preciseOptions,
          );
          return;
        }

        navigator.geolocation.getCurrentPosition(
          applyPosition,
          handleFailure,
          fastOptions,
        );
      });
    },
    [applySelectedLocation],
  );

  useEffect(() => {
    let isCancelled = false;
    let permissionStatus: PermissionStatus | null = null;

    const detectPermissionAndLocation = async () => {
      if (!("geolocation" in navigator)) {
        setLocationPermissionState("unsupported");
        setLocationStatusMessage(
          "Location services are not supported in this browser.",
        );
        return;
      }

      if (!("permissions" in navigator) || !navigator.permissions?.query) {
        if (!selectedLocationRef.current) {
          await requestDeviceLocation();
        }
        return;
      }

      try {
        permissionStatus = await navigator.permissions.query({
          name: "geolocation",
        });
        if (isCancelled) {
          return;
        }

        setLocationPermissionState(permissionStatus.state);

        if (permissionStatus.state === "denied") {
          setLocationStatusMessage(
            "Location access is turned off. Showing Fargo, ND until you choose another location.",
          );
          if (!selectedLocationRef.current) {
            applySelectedLocation(FARGO_DEFAULT_LOCATION, "search");
          }
          return;
        }

        if (!selectedLocationRef.current) {
          await requestDeviceLocation();
        }

        permissionStatus.onchange = () => {
          setLocationPermissionState(permissionStatus?.state ?? "unknown");

          if (
            permissionStatus?.state === "granted" &&
            !selectedLocationRef.current
          ) {
            void requestDeviceLocation();
          }

          if (permissionStatus?.state === "denied") {
            setLocationStatusMessage(
              "Location access is turned off. Showing Fargo, ND until you choose another location.",
            );
            if (!selectedLocationRef.current) {
              applySelectedLocation(FARGO_DEFAULT_LOCATION, "search");
            }
          }
        };
      } catch {
        if (!isCancelled) {
          if (!selectedLocationRef.current) {
            await requestDeviceLocation();
          }
        }
      }
    };

    void detectPermissionAndLocation();

    return () => {
      isCancelled = true;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [applySelectedLocation, requestDeviceLocation]);

  const isLocationScreen = screen === "location";
  const currentWeatherQuery = useQuery({
    queryKey: [
      "weather",
      "current-conditions",
      selectedLocation?.latitude,
      selectedLocation?.longitude,
      unitSystem,
    ],
    queryFn: () =>
      getCurrentWeatherForLocation(
        selectedLocation!.latitude,
        selectedLocation!.longitude,
        unitSystem,
      ),
    enabled: !isLocationScreen && Boolean(selectedLocation),
    staleTime: 1000 * 60 * 10,
    retry: false,
  });
  const currentLocationNameQuery = useQuery({
    queryKey: [
      "weather",
      "current-location-name",
      selectedLocation?.latitude,
      selectedLocation?.longitude,
    ],
    queryFn: () =>
      reverseGeocodeWeatherLocation(
        selectedLocation!.latitude,
        selectedLocation!.longitude,
      ),
    enabled: selectedSource === "device" && Boolean(selectedLocation),
    staleTime: 1000 * 60 * 30,
    retry: false,
  });
  const weatherForecastQuery = useQuery({
    queryKey: [
      "weather",
      "forecast",
      selectedLocation?.latitude,
      selectedLocation?.longitude,
      unitSystem,
    ],
    queryFn: () =>
      getWeatherForecastForLocation(
        selectedLocation!.latitude,
        selectedLocation!.longitude,
        unitSystem,
      ),
    enabled: !isLocationScreen && Boolean(selectedLocation),
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  const savedLocationIds = useMemo(
    () => new Set(savedLocations.map((location) => location.id)),
    [savedLocations],
  );

  const handleSaveLocation = (location: WeatherLocation) => {
    if (savedLocationIds.has(location.id)) {
      return;
    }

    setSavedLocations((currentLocations) => [location, ...currentLocations]);
    toast({
      title: "Location saved",
      description: `${location.name} is now available from your saved locations.`,
    });
  };

  const handleRemoveSavedLocation = (locationToRemove: WeatherLocation) => {
    setSavedLocations((currentLocations) =>
      currentLocations.filter(
        (location) => !areWeatherLocationsEqual(location, locationToRemove),
      ),
    );

    toast({
      title: "Location removed",
      description: `${locationToRemove.name} was removed from your saved locations.`,
    });
  };

  const handleSelectLocationFromMenu = (
    location: WeatherLocation,
    source: Exclude<SelectedLocationSource, "device">,
  ) => {
    applySelectedLocation(location, source, { manual: true });
    setSearchInput("");
    setScreen("overview");
  };

  const handleUseMyLocation = async () => {
    const didResolveLocation = await requestDeviceLocation({ manual: true });
    if (didResolveLocation) {
      setSearchInput("");
      setScreen("overview");
    }
  };
  const currentWeather = currentWeatherQuery.data;
  const currentWeatherVisual = getWeatherVisual(
    currentWeather?.weatherCondition ??
      currentWeather?.weatherDescription ??
      null,
  );
  const CurrentWeatherIcon = currentWeatherVisual.Icon;
  const selectedLocationTitle =
    selectedSource === "device"
      ? currentLocationNameQuery.data
        ? `Current Location | ${currentLocationNameQuery.data}`
        : "Current Location"
      : selectedLocation
        ? [selectedLocation.name, selectedLocation.admin1]
            .filter(Boolean)
            .join(", ")
        : "Choose Location";
  const savableSelectedLocation = useMemo(() => {
    if (!selectedLocation) {
      return null;
    }

    if (selectedSource !== "device") {
      return selectedLocation;
    }

    return {
      ...selectedLocation,
      name: currentLocationNameQuery.data?.trim() || selectedLocation.name,
    } satisfies WeatherLocation;
  }, [currentLocationNameQuery.data, selectedLocation, selectedSource]);
  const isSelectedLocationSaved = savableSelectedLocation
    ? savedLocationIds.has(savableSelectedLocation.id)
    : false;
  const forecastMetrics = useMemo(
    () => getForecastMetrics(unitSystem, windSpeedDisplay),
    [unitSystem, windSpeedDisplay],
  );
  const forecastChartData = useMemo(() => {
    const forecast = weatherForecastQuery.data;
    if (!forecast) {
      return [] as Array<WeatherMetricConfig & { data: ForecastChartPoint[] }>;
    }

    return forecastMetrics.map((metric) => ({
      ...metric,
      data: (() => {
        if (forecastRange === "10d") {
          return buildDailyChartData(
            forecast.daily.slice(0, 11),
            metric.key,
            unitSystem,
            windSpeedDisplay,
          );
        }

        const hourlyPoints =
          forecastRange === "24h"
            ? forecast.hourly.slice(0, 25)
            : forecast.hourly.slice(0, 13);
        return buildHourlyChartData(
          hourlyPoints,
          metric.key,
          unitSystem,
          windSpeedDisplay,
        );
      })(),
    }));
  }, [
    forecastMetrics,
    forecastRange,
    unitSystem,
    weatherForecastQuery.data,
    windSpeedDisplay,
  ]);

  return (
    <div className="page-scroll">
      <div className="page-content resources-page-content">
        <div className="page-header">
          {isLocationScreen ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="legal-back-button"
              onClick={() => setScreen("overview")}
            >
              <FaArrowLeft className="w-4 h-4" />
            </Button>
          ) : null}
          <h1 className="page-title">
            {isLocationScreen ? "Change Location" : "Weather & Conditions"}
          </h1>
        </div>

        <div className="resources-stack">
          <FeatureBetaBanner featureName="Weather" />

          {!isLocationScreen ? (
            <Card className="resources-card surface-card">
              <CardHeader className="pb-3">
                <div className="resources-weather-card-header">
                  <div className="resources-weather-card-header-copy">
                    <CardTitle className="resources-section-title resources-weather-current-title">
                      <FaLocationArrow size={12} />
                      <span>
                        {selectedLocation
                          ? selectedLocationTitle
                          : "Choose Location"}
                      </span>
                    </CardTitle>
                  </div>
                  <div className="resources-weather-location-card-actions">
                    {savableSelectedLocation ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className={
                          isSelectedLocationSaved
                            ? "resources-save-button"
                            : "btn-outline-muted"
                        }
                        onClick={() => {
                          if (isSelectedLocationSaved) {
                            handleRemoveSavedLocation(savableSelectedLocation);
                            return;
                          }

                          handleSaveLocation(savableSelectedLocation);
                        }}
                        aria-label={
                          isSelectedLocationSaved
                            ? "Unsave location"
                            : "Save location"
                        }
                        title={
                          isSelectedLocationSaved
                            ? "Saved location"
                            : "Save location"
                        }
                      >
                        {isSelectedLocationSaved ? (
                          <FaBookmark size={15} />
                        ) : (
                          <FaRegBookmark size={15} />
                        )}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="outline"
                      className="btn-outline-muted"
                      onClick={() => setScreen("location")}
                    >
                      {selectedLocation ? "Change Location" : "Choose Location"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {!selectedLocation && (
                  <div className="resources-empty-state">
                    <FaLocationArrow size={20} />
                    <div>
                      <h2 className="resources-empty-title">
                        No location selected
                      </h2>
                      <p className="resources-empty-copy">
                        Use your current location, search for a place, or choose
                        a saved location to get started.
                      </p>
                    </div>
                  </div>
                )}

                {locationStatusMessage && (
                  <p className="resources-weather-status-copy resources-weather-inline-status">
                    {locationStatusMessage}
                  </p>
                )}
              </CardContent>
            </Card>
          ) : null}

          {!isLocationScreen && selectedLocation ? (
            <>
              <Card className="resources-card surface-card">
                <CardHeader className="pb-3">
                  <div className="resources-weather-snapshot-header">
                    <div className="resources-weather-snapshot-heading">
                      <div className="resources-weather-snapshot-icon">
                        <CurrentWeatherIcon
                          className={currentWeatherVisual.colorClass}
                          size={20}
                        />
                      </div>
                      <div>
                        <CardTitle className="resources-section-title">
                          Current Weather
                        </CardTitle>
                        {currentWeather?.weatherDescription ? (
                          <p className="resources-weather-snapshot-summary">
                            {currentWeather.weatherDescription}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {currentWeatherQuery.isLoading ? (
                    <p className="resources-weather-status-copy">
                      Loading the latest conditions for this location...
                    </p>
                  ) : currentWeatherQuery.isError || !currentWeather ? (
                    <p className="resources-weather-status-copy">
                      Current weather is unavailable right now.
                    </p>
                  ) : (
                    <div className="resources-weather-snapshot-grid">
                      <div className="resources-weather-snapshot-item">
                        <span className="resources-weather-snapshot-label">
                          Temp
                        </span>
                        <strong className="resources-weather-snapshot-value">
                          {formatTemperatureValue(
                            currentWeather.temperature ?? null,
                            unitSystem,
                          )}
                        </strong>
                      </div>
                      <div className="resources-weather-snapshot-item">
                        <span className="resources-weather-snapshot-label">
                          Pressure
                        </span>
                        <strong className="resources-weather-snapshot-value">
                          {formatPressureValue(
                            currentWeather.pressure ?? null,
                            unitSystem,
                          )}
                        </strong>
                      </div>
                      <div className="resources-weather-snapshot-item">
                        <span className="resources-weather-snapshot-label">
                          Cloud Cover
                        </span>
                        <strong className="resources-weather-snapshot-value">
                          {currentWeather.cloudCoverage != null
                            ? `${Math.round(currentWeather.cloudCoverage)}%`
                            : "--"}
                        </strong>
                      </div>
                      <div className="resources-weather-snapshot-item">
                        <span className="resources-weather-snapshot-label">
                          Precip Chance
                        </span>
                        <strong className="resources-weather-snapshot-value">
                          {currentWeather.precipitationProbability != null
                            ? `${Math.round(currentWeather.precipitationProbability)}%`
                            : "--"}
                        </strong>
                      </div>
                      <div className="resources-weather-snapshot-item">
                        <span className="resources-weather-snapshot-label">
                          Wind Speed
                        </span>
                        <strong className="resources-weather-snapshot-value">
                          {formatWindSpeedValue(
                            currentWeather.windSpeed ?? null,
                            unitSystem,
                            windSpeedDisplay,
                          )}
                        </strong>
                      </div>
                      <div className="resources-weather-snapshot-item">
                        <span className="resources-weather-snapshot-label">
                          Wind Dir
                        </span>
                        <strong className="resources-weather-snapshot-value">
                          {currentWeather.windDirection != null
                            ? getWindDirection(currentWeather.windDirection)
                            : "--"}
                        </strong>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <WeatherAiSummaryCard
                latitude={selectedLocation.latitude}
                longitude={selectedLocation.longitude}
                locationLabel={selectedLocationTitle}
              />

              <Card className="resources-card surface-card">
                <CardHeader className="pb-3">
                  <div className="resources-weather-card-header">
                    <CardTitle className="resources-section-title">
                      Forecast Trends
                    </CardTitle>
                    <div
                      className="resources-weather-range-toggle"
                      role="tablist"
                      aria-label="Forecast range"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        className={
                          forecastRange === "12h"
                            ? "resources-weather-range-button is-active"
                            : "resources-weather-range-button"
                        }
                        onClick={() => setForecastRange("12h")}
                      >
                        12h
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className={
                          forecastRange === "24h"
                            ? "resources-weather-range-button is-active"
                            : "resources-weather-range-button"
                        }
                        onClick={() => setForecastRange("24h")}
                      >
                        24h
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className={
                          forecastRange === "10d"
                            ? "resources-weather-range-button is-active"
                            : "resources-weather-range-button"
                        }
                        onClick={() => setForecastRange("10d")}
                      >
                        10 day
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="resources-weather-charts-stack">
                    {weatherForecastQuery.isLoading ? (
                      <p className="resources-weather-status-copy">
                        Loading forecast trends for this location...
                      </p>
                    ) : weatherForecastQuery.isError ||
                      forecastChartData.length === 0 ? (
                      <p className="resources-weather-status-copy">
                        Forecast trends are unavailable right now.
                      </p>
                    ) : (
                      <>
                        {forecastChartData.map((metric) => {
                          const yAxis =
                            metric.key === "temperature"
                              ? getTemperatureYAxisDomain(metric.data)
                              : metric.key === "pressure"
                                ? getPressureYAxisDomain(metric.data, unitSystem)
                                : metric.key === "cloudCoverage" ||
                                    metric.key === "precipitationProbability"
                                  ? {
                                      domain: [0, 100] as [number, number],
                                      ticks: [0, 25, 50, 75, 100],
                                    }
                                  : metric.key === "windSpeed"
                                    ? getWindYAxisDomain(
                                        metric.data,
                                      )
                                    : undefined;

                          return (
                            <WeatherMetricChart
                              key={`${metric.key}-${forecastRange}-${metric.data.length}-${metric.data[0]?.xValue ?? "start"}-${metric.data[metric.data.length - 1]?.xValue ?? "end"}`}
                              title={metric.label}
                              unit={metric.yAxisUnit}
                              color={metric.color}
                              data={metric.data}
                              formatValue={metric.formatValue}
                              yAxisTickFormatter={metric.formatAxisValue}
                              yAxisDomain={yAxis?.domain}
                              yAxisTicks={yAxis?.ticks}
                              showDirectionArrows={metric.key === "windSpeed"}
                              showHighLow={
                                metric.key === "temperature" &&
                                forecastRange === "10d"
                              }
                              rangeMarkerMode={
                                metric.key === "temperature" &&
                                forecastRange !== "10d"
                                  ? "high-low"
                                  : metric.key === "pressure"
                                    ? "high-low"
                                    : metric.key === "precipitationProbability"
                                      ? "high"
                                      : "none"
                              }
                              yAxisWidth={
                                metric.key === "pressure"
                                  ? unitSystem === "metric"
                                    ? 46
                                    : 40
                                  : 34
                              }
                              xAxisTicks={getForecastXAxisTicks(
                                metric.data,
                                forecastRange,
                              )}
                            />
                          );
                        })}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <LunarCycleCard
                latitude={selectedLocation.latitude}
                longitude={selectedLocation.longitude}
              />

              <SunArcCard
                sunrise={currentWeather?.sunrise}
                sunset={currentWeather?.sunset}
              />
            </>
          ) : null}

          {isLocationScreen ? (
            <Card className="resources-card surface-card">
              <CardHeader className="pb-3">
                <CardTitle className="resources-section-title">
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="resources-weather-search-form">
                  <div className="resources-weather-search-controls">
                    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
                      <WeatherLocationAutocomplete
                        id="weather-location-search"
                        value={searchInput}
                        onChange={(event) => {
                          setSearchInput(event.target.value);
                        }}
                        onPlaceSelect={(location) => {
                          applySelectedLocation(location, "search", {
                            manual: true,
                          });
                          setSearchInput(
                            [location.name, location.admin1]
                              .filter(Boolean)
                              .join(", "),
                          );
                          setScreen("overview");
                        }}
                        placeholder="Search city, town, or region"
                        className="field-dark"
                        autoComplete="off"
                      />
                    </APIProvider>
                    <p className="resources-weather-search-caption">
                      Powered by Google Places.
                    </p>
                  </div>
                </div>

                <div className="resources-weather-current-location-section">
                  <button
                    type="button"
                    className={
                      selectedSource === "device"
                        ? "resources-weather-location-row is-active"
                        : "resources-weather-location-row"
                    }
                    onClick={() => {
                      void handleUseMyLocation();
                    }}
                    disabled={isRequestingLocation}
                  >
                    <span className="resources-weather-location-row-icon">
                      <FaLocationArrow size={16} />
                    </span>
                    <span className="resources-weather-location-row-copy">
                      <span className="resources-weather-location-row-title">
                        {isRequestingLocation
                          ? "Finding current location..."
                          : "Use my current location"}
                      </span>
                      <span className="resources-weather-location-row-meta">
                        {locationPermissionState === "denied"
                          ? "Location access is off in this browser."
                          : "Default weather location for this device."}
                      </span>
                    </span>
                  </button>
                </div>

                <div className="resources-weather-saved-section">
                  <div className="resources-weather-saved-header">
                    <h2 className="resources-section-title">Saved Locations</h2>
                  </div>

                  <div className="resources-weather-location-list">
                    {savedLocations.length === 0 ? (
                      <div className="resources-empty-state resources-weather-saved-empty">
                        <FaBookmark size={20} />
                        <div>
                          <h2 className="resources-empty-title">
                            No saved locations yet
                          </h2>
                          <p className="resources-empty-copy">
                            Pick a place from search and it will be ready here
                            next time.
                          </p>
                        </div>
                      </div>
                    ) : (
                      savedLocations.map((location) => (
                        <div
                          key={location.id}
                          className="resources-weather-location-row-shell"
                        >
                          <button
                            type="button"
                            className={
                              areWeatherLocationsEqual(
                                selectedLocation,
                                location,
                              )
                                ? "resources-weather-location-row is-active"
                                : "resources-weather-location-row"
                            }
                            onClick={() =>
                              handleSelectLocationFromMenu(location, "saved")
                            }
                          >
                            <span className="resources-weather-location-row-icon">
                              <FaBookmark size={16} />
                            </span>
                            <span className="resources-weather-location-row-copy">
                              <span className="resources-weather-location-row-title">
                                {location.name}
                              </span>
                              <span className="resources-weather-location-row-meta">
                                {formatWeatherLocationSubtitle(location) ||
                                  formatWeatherLocationCoordinates(location)}
                              </span>
                            </span>
                          </button>

                          <Button
                            type="button"
                            variant="ghost"
                            className="resources-weather-location-row-action"
                            onClick={() => handleRemoveSavedLocation(location)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
