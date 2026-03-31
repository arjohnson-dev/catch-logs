import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { addDays, format, parseISO, startOfDay } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  FaArrowLeft,
  FaBookmark,
  FaLocationArrow,
  FaMagnifyingGlass,
} from "react-icons/fa6";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeatherAiSummaryCard } from "@/components/weather-ai-summary-card";
import { WeatherLocationAutocomplete } from "@/components/weather-location-autocomplete";
import { useAuth } from "@/hooks/useAuth";
import { useUnitPreference } from "@/hooks/use-unit-preference";
import { useToast } from "@/hooks/use-toast";
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
  searchWeatherLocations,
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
};

type LunarCycleDay = {
  date: Date;
  phaseLabel: string;
  phaseIcon: string;
};

const FARGO_DEFAULT_LOCATION: WeatherLocation = {
  id: "default:fargo-nd",
  name: "Fargo, ND",
  latitude: 46.8772,
  longitude: -96.7898,
  admin1: "North Dakota",
  country: "United States",
  timezone: "America/Chicago",
};
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? "";

const SYNODIC_MONTH = 29.530588853;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0);

function getMoonPhaseData(date: Date) {
  const normalized = startOfDay(date);
  const daysSinceReference =
    (normalized.getTime() - KNOWN_NEW_MOON) / (1000 * 60 * 60 * 24);
  const lunarAge =
    ((daysSinceReference % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  const phaseAngle = (lunarAge / SYNODIC_MONTH) * 360;
  const illumination = (1 - Math.cos((phaseAngle * Math.PI) / 180)) / 2;

  if (lunarAge < 1.84566) {
    return {
      phaseLabel: "New Moon",
      phaseIcon: "🌑",
    };
  }
  if (lunarAge < 5.53699) {
    return {
      phaseLabel: "Waxing Crescent",
      phaseIcon: "🌒",
    };
  }
  if (lunarAge < 9.22831) {
    return {
      phaseLabel: "Quarter Moon",
      phaseIcon: "🌓",
    };
  }
  if (lunarAge < 12.91963) {
    return {
      phaseLabel: "Waxing Gibbous",
      phaseIcon: "🌔",
    };
  }
  if (lunarAge < 16.61096) {
    return {
      phaseLabel: "Full Moon",
      phaseIcon: "🌕",
    };
  }
  if (lunarAge < 20.30228) {
    return {
      phaseLabel: "Waning Gibbous",
      phaseIcon: "🌖",
    };
  }
  if (lunarAge < 23.99361) {
    return {
      phaseLabel: "Three-Quarter Moon",
      phaseIcon: "🌗",
    };
  }

  return {
    phaseLabel: "Waning Crescent",
    phaseIcon: "🌘",
  };
}

function buildLunarForecast(startDate = new Date(), days = 5) {
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(startOfDay(startDate), index);
    return {
      date,
      ...getMoonPhaseData(date),
    } satisfies LunarCycleDay;
  });
}

function getStoredLocationState(userId?: string | null) {
  const savedLocations = loadSavedWeatherLocations(userId);
  const activeLocation = loadActiveWeatherLocation(userId);
  const selectedSource = activeLocation
    ? savedLocations.some((location) => areWeatherLocationsEqual(location, activeLocation))
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

function convertPressureForDisplay(value: number | null, unitSystem: UnitSystem) {
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

function formatWindSpeedValue(
  value: number | null,
  unitSystem: UnitSystem,
  windSpeedDisplay: "knots" | "system",
) {
  const converted = convertWindSpeedForDisplay(value, unitSystem, windSpeedDisplay);
  if (converted == null) {
    return "--";
  }

  return `${Math.round(converted)} ${getWindSpeedUnitLabel(unitSystem, windSpeedDisplay)}`;
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
      color: "var(--chart-2)",
      formatValue: (value) => formatPressureValue(value, unitSystem),
      yAxisUnit: unitSystem === "metric" ? "hPa" : "inHg",
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
      formatValue: (value) => formatWindSpeedValue(value, unitSystem, windSpeedDisplay),
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
    xLabel: format(parseISO(point.time), "ha"),
    tooltipLabel: format(parseISO(point.time), "EEE h a"),
    value:
      metric === "pressure"
        ? convertPressureForDisplay(point.pressure, unitSystem)
        : metric === "windSpeed"
          ? convertWindSpeedForDisplay(point.windSpeed, unitSystem, windSpeedDisplay)
        : point[metric],
    secondaryValue:
      metric === "temperature"
        ? point.temperatureLow
        : null,
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
    xLabel: format(parseISO(point.date), "EEE"),
    tooltipLabel: format(parseISO(point.date), "EEEE, MMM d"),
    value:
      metric === "temperature"
        ? point.temperatureHigh
        : metric === "pressure"
          ? convertPressureForDisplay(point.pressure, unitSystem)
          : metric === "windSpeed"
            ? convertWindSpeedForDisplay(point.windSpeed, unitSystem, windSpeedDisplay)
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
        d="M0 -10 L6 3 L0 0 L-6 3 Z"
        fill={stroke ?? "currentColor"}
        stroke="rgba(15, 15, 18, 0.85)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </g>
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
  yAxisWidth = 40,
  xAxisInterval = 0,
  xAxisTicks,
}: {
  title: string;
  unit: string;
  color: string;
  data: ForecastChartPoint[];
  formatValue: (value: number | null) => string;
  showDirectionArrows?: boolean;
  showHighLow?: boolean;
  yAxisWidth?: number;
  xAxisInterval?: number | "preserveStartEnd";
  xAxisTicks?: string[];
}) {
  return (
    <Card className="resources-card surface-card">
      <CardHeader className="pb-2">
        <div className="resources-weather-chart-header">
          <CardTitle className="resources-section-title">{title}</CardTitle>
          <span className="resources-weather-chart-unit">{unit}</span>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="resources-weather-chart-wrap">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255, 255, 255, 0.06)" vertical={false} />
              <XAxis
                dataKey="xLabel"
                ticks={xAxisTicks}
                tick={{ fill: "#8a8f98", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={xAxisInterval}
                minTickGap={16}
              />
              <YAxis
                tick={{ fill: "#8a8f98", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={yAxisWidth}
                tickFormatter={(value) => `${Math.round(value)}`}
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
                dot={showDirectionArrows ? <WeatherDirectionDot stroke={color} /> : false}
                activeDot={{ r: 4, fill: color, strokeWidth: 0 }}
                connectNulls
                name={showHighLow ? "High" : title}
              />
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
                />
              ) : null}
            </LineChart>
          </ResponsiveContainer>
        </div>
        {showHighLow ? (
          <div className="resources-weather-chart-legend" aria-hidden="true">
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

function LunarCycleCard() {
  const currentPhase = getMoonPhaseData(new Date());
  const lunarForecast = useMemo(() => buildLunarForecast(), []);

  return (
    <Card className="resources-card surface-card">
      <CardHeader className="pb-3">
        <CardTitle className="resources-section-title">Lunar Calendar</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="resources-weather-lunar-current">
          <span className="resources-weather-lunar-current-icon" aria-hidden="true">
            {currentPhase?.phaseIcon}
          </span>
          <div>
            <p className="resources-weather-lunar-current-label">Current Phase</p>
            <p className="resources-weather-lunar-current-value">
              {currentPhase?.phaseLabel ?? "--"}
            </p>
          </div>
        </div>

        <div className="resources-weather-lunar-forecast" aria-label="Upcoming lunar forecast">
          <p className="resources-weather-lunar-forecast-label">Lunar Forecast</p>
          <div className="resources-weather-lunar-forecast-row">
            {lunarForecast.map((day) => (
              <div
                key={day.date.toISOString()}
                className="resources-weather-lunar-forecast-day"
              >
                <span className="resources-weather-lunar-forecast-icon" aria-hidden="true">
                  {day.phaseIcon}
                </span>
                <span className="resources-weather-lunar-forecast-date">
                  {format(day.date, "MMM d")}
                </span>
                <span className="resources-weather-lunar-forecast-phase">
                  {day.phaseLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
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

  if ([observed, rise, set].some((value) => Number.isNaN(value)) || set <= rise) {
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
        <CardTitle className="resources-section-title">Sunrise & Sunset</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {hasSunData ? (
        <div className="resources-weather-sun-card">
          <div className="resources-weather-sun-graphic" aria-hidden="true">
            <svg viewBox="0 0 240 108" className="resources-weather-sun-svg">
              <path
                d="M38 92 A82 82 0 0 1 202 92"
                className="resources-weather-sun-arc"
              />
              <path
                d="M38 92 A82 82 0 0 1 202 92"
                pathLength={100}
                strokeDasharray={progress == null ? 0 : `${progress * 100} 100`}
                className="resources-weather-sun-arc-fill"
              />
              <circle cx="38" cy="92" r="3" className="resources-weather-sun-horizon-dot" />
              <circle cx="202" cy="92" r="3" className="resources-weather-sun-horizon-dot" />
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
              <span className="resources-weather-sun-time-label">Sunrise</span>
              <strong className="resources-weather-sun-time-value">{formatSunTime(sunrise)}</strong>
            </div>
            <div className="resources-weather-sun-time resources-weather-sun-time-end">
              <span className="resources-weather-sun-time-label">Sunset</span>
              <strong className="resources-weather-sun-time-value">{formatSunTime(sunset)}</strong>
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

function buildXAxisTicks(data: ForecastChartPoint[], forecastRange: ForecastRange) {
  if (forecastRange !== "24h") {
    return undefined;
  }

  const ticks = data
    .filter((_, index) => index % 4 === 0)
    .map((point) => point.xLabel);
  const lastTick = data.at(-1)?.xLabel;

  if (lastTick && !ticks.includes(lastTick)) {
    ticks.push(lastTick);
  }

  return ticks;
}

export default function WeatherPage() {
  const { user } = useAuth();
  const { unitSystem, windSpeedDisplay } = useUnitPreference();
  const { toast } = useToast();
  const userId = user?.id ?? null;
  const storedLocationState = useMemo(() => getStoredLocationState(userId), [userId]);
  const [savedLocations, setSavedLocations] = useState<WeatherLocation[]>(
    storedLocationState.savedLocations,
  );
  const [selectedLocation, setSelectedLocation] = useState<WeatherLocation | null>(
    storedLocationState.activeLocation,
  );
  const [selectedSource, setSelectedSource] = useState<SelectedLocationSource | null>(
    storedLocationState.selectedSource,
  );
  const [searchInput, setSearchInput] = useState("");
  const [googleSelectedLocation, setGoogleSelectedLocation] = useState<WeatherLocation | null>(null);
  const deferredSearchInput = useDeferredValue(searchInput.trim());
  const [locationPermissionState, setLocationPermissionState] = useState<
    PermissionState | "unsupported" | "unknown"
  >("unknown");
  const [locationStatusMessage, setLocationStatusMessage] = useState<string | null>(null);
  const [isRequestingLocation, setIsRequestingLocation] = useState(false);
  const [screen, setScreen] = useState<WeatherScreen>("overview");
  const [forecastRange, setForecastRange] = useState<ForecastRange>("12h");
  const manualSelectionRef = useRef(false);

  useEffect(() => {
    const nextState = getStoredLocationState(userId);
    setSavedLocations(nextState.savedLocations);
    setSelectedLocation(nextState.activeLocation);
    setSelectedSource(nextState.selectedSource);
    setScreen("overview");
    manualSelectionRef.current = false;
  }, [userId]);

  useEffect(() => {
    saveSavedWeatherLocations(savedLocations, userId);
  }, [savedLocations, userId]);

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
        setLocationStatusMessage("Location services are not supported in this browser.");
        return false;
      }

      setIsRequestingLocation(true);
      setLocationStatusMessage(null);

      return await new Promise<boolean>((resolve) => {
        const applyPosition = (position: GeolocationPosition) => {
          setIsRequestingLocation(false);
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
          setIsRequestingLocation(false);

          if (error.code === error.PERMISSION_DENIED) {
            setLocationPermissionState("denied");
            setLocationStatusMessage(
              "Location access is turned off. Showing Fargo, ND until you choose another location.",
            );
            if (!selectedLocation) {
              applySelectedLocation(FARGO_DEFAULT_LOCATION, "search");
            }
          } else {
            setLocationStatusMessage(
              "Unable to get your current location right now. You can search for a place instead.",
            );
          }

          resolve(false);
        };

        const highAccuracyOptions: PositionOptions = {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        };

        const fallbackOptions: PositionOptions = {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000,
        };

        navigator.geolocation.getCurrentPosition(
          applyPosition,
          () => {
            navigator.geolocation.getCurrentPosition(
              applyPosition,
              handleFailure,
              fallbackOptions,
            );
          },
          highAccuracyOptions,
        );
      });
    },
    [applySelectedLocation, selectedLocation],
  );

  useEffect(() => {
    let isCancelled = false;
    let permissionStatus: PermissionStatus | null = null;

    const detectPermissionAndLocation = async () => {
      if (!("geolocation" in navigator)) {
        setLocationPermissionState("unsupported");
        setLocationStatusMessage("Location services are not supported in this browser.");
        return;
      }

      if (!("permissions" in navigator) || !navigator.permissions?.query) {
        await requestDeviceLocation();
        return;
      }

      try {
        permissionStatus = await navigator.permissions.query({ name: "geolocation" });
        if (isCancelled) {
          return;
        }

        setLocationPermissionState(permissionStatus.state);

        if (permissionStatus.state === "denied") {
          setLocationStatusMessage(
            "Location access is turned off. Showing Fargo, ND until you choose another location.",
          );
          if (!selectedLocation) {
            applySelectedLocation(FARGO_DEFAULT_LOCATION, "search");
          }
          return;
        }

        await requestDeviceLocation();

        permissionStatus.onchange = () => {
          setLocationPermissionState(permissionStatus?.state ?? "unknown");

          if (permissionStatus?.state === "granted") {
            void requestDeviceLocation();
          }

          if (permissionStatus?.state === "denied") {
            setLocationStatusMessage(
              "Location access is turned off. Showing Fargo, ND until you choose another location.",
            );
            if (!selectedLocation) {
              applySelectedLocation(FARGO_DEFAULT_LOCATION, "search");
            }
          }
        };
      } catch {
        if (!isCancelled) {
          await requestDeviceLocation();
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
  }, [applySelectedLocation, requestDeviceLocation, selectedLocation]);

  const searchQuery = useQuery({
    queryKey: ["weather", "location-search", deferredSearchInput],
    queryFn: () => searchWeatherLocations(deferredSearchInput),
    enabled: deferredSearchInput.length >= 2,
    staleTime: 1000 * 60 * 30,
    retry: false,
  });
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
      getCurrentWeatherForLocation(selectedLocation!.latitude, selectedLocation!.longitude, unitSystem),
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
      reverseGeocodeWeatherLocation(selectedLocation!.latitude, selectedLocation!.longitude),
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
    queryFn: () => getWeatherForecastForLocation(selectedLocation!.latitude, selectedLocation!.longitude, unitSystem),
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
      currentLocations.filter((location) => !areWeatherLocationsEqual(location, locationToRemove)),
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
    setGoogleSelectedLocation(null);
    setScreen("overview");
  };

  const handleUseMyLocation = async () => {
    const didResolveLocation = await requestDeviceLocation({ manual: true });
    if (didResolveLocation) {
      setSearchInput("");
      setGoogleSelectedLocation(null);
      setScreen("overview");
    }
  };

  const locationResults = useMemo(() => {
    const fallbackResults = searchQuery.data ?? [];
    if (!googleSelectedLocation) {
      return fallbackResults;
    }

    return [
      googleSelectedLocation,
      ...fallbackResults.filter((location) => location.id !== googleSelectedLocation.id),
    ];
  }, [googleSelectedLocation, searchQuery.data]);
  const currentWeather = currentWeatherQuery.data;
  const currentWeatherVisual = getWeatherVisual(
    currentWeather?.weatherCondition ?? currentWeather?.weatherDescription ?? null,
  );
  const CurrentWeatherIcon = currentWeatherVisual.Icon;
  const selectedLocationTitle =
    selectedSource === "device"
      ? currentLocationNameQuery.data
        ? `Current Location | ${currentLocationNameQuery.data}`
        : "Current Location"
      : selectedLocation?.name ?? "Choose Location";
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
          return buildDailyChartData(forecast.daily, metric.key, unitSystem, windSpeedDisplay);
        }

        const hourlyPoints = forecastRange === "24h" ? forecast.hourly : forecast.hourly.slice(0, 12);
        return buildHourlyChartData(hourlyPoints, metric.key, unitSystem, windSpeedDisplay);
      })(),
    }));
  }, [forecastMetrics, forecastRange, unitSystem, weatherForecastQuery.data, windSpeedDisplay]);

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
          ) : (
            <Link to="/">
              <Button variant="ghost" size="sm" className="legal-back-button">
                <FaArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          )}
          <h1 className="page-title">
            {isLocationScreen ? "Change Location" : "Weather & Conditions"}
          </h1>
        </div>

        <div className="resources-stack">
          {!isLocationScreen ? (
            <Card className="resources-card surface-card">
              <CardHeader className="pb-3">
                <div className="resources-weather-card-header">
                  <div className="resources-weather-card-header-copy">
                    <CardTitle className="resources-section-title resources-weather-current-title">
                      <FaLocationArrow size={12} />
                      <span>{selectedLocation ? selectedLocationTitle : "Choose Location"}</span>
                    </CardTitle>
                  </div>
                  <div className="resources-weather-location-card-actions">
                    {savableSelectedLocation ? (
                      <Button
                        type="button"
                        variant="outline"
                        className={isSelectedLocationSaved ? "btn-outline-muted" : "btn-outline-info"}
                        onClick={() => {
                          if (isSelectedLocationSaved) {
                            handleRemoveSavedLocation(savableSelectedLocation);
                            return;
                          }

                          handleSaveLocation(savableSelectedLocation);
                        }}
                      >
                        {isSelectedLocationSaved ? "Unsave Location" : "Save Location"}
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
                      <h2 className="resources-empty-title">No location selected</h2>
                      <p className="resources-empty-copy">
                        Use your current location, search for a place, or choose a saved location
                        to get started.
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
                        <CurrentWeatherIcon className={currentWeatherVisual.colorClass} size={20} />
                      </div>
                      <div>
                        <CardTitle className="resources-section-title">Current Weather</CardTitle>
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
                        <span className="resources-weather-snapshot-label">Temp</span>
                        <strong className="resources-weather-snapshot-value">
                          {formatTemperatureValue(currentWeather.temperature ?? null, unitSystem)}
                        </strong>
                      </div>
                      <div className="resources-weather-snapshot-item">
                        <span className="resources-weather-snapshot-label">Pressure</span>
                        <strong className="resources-weather-snapshot-value">
                          {formatPressureValue(currentWeather.pressure ?? null, unitSystem)}
                        </strong>
                      </div>
                      <div className="resources-weather-snapshot-item">
                        <span className="resources-weather-snapshot-label">Cloud Cover</span>
                        <strong className="resources-weather-snapshot-value">
                          {currentWeather.cloudCoverage != null
                            ? `${Math.round(currentWeather.cloudCoverage)}%`
                            : "--"}
                        </strong>
                      </div>
                      <div className="resources-weather-snapshot-item">
                        <span className="resources-weather-snapshot-label">Precip Chance</span>
                        <strong className="resources-weather-snapshot-value">
                          {currentWeather.precipitationProbability != null
                            ? `${Math.round(currentWeather.precipitationProbability)}%`
                            : "--"}
                        </strong>
                      </div>
                      <div className="resources-weather-snapshot-item">
                        <span className="resources-weather-snapshot-label">Wind Speed</span>
                        <strong className="resources-weather-snapshot-value">
                          {formatWindSpeedValue(
                            currentWeather.windSpeed ?? null,
                            unitSystem,
                            windSpeedDisplay,
                          )}
                        </strong>
                      </div>
                      <div className="resources-weather-snapshot-item">
                        <span className="resources-weather-snapshot-label">Wind Dir</span>
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
                    <CardTitle className="resources-section-title">Forecast Trends</CardTitle>
                    <div className="resources-weather-range-toggle" role="tablist" aria-label="Forecast range">
                      <Button
                        type="button"
                        variant="ghost"
                        className={forecastRange === "12h" ? "resources-weather-range-button is-active" : "resources-weather-range-button"}
                        onClick={() => setForecastRange("12h")}
                      >
                        12h
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className={forecastRange === "24h" ? "resources-weather-range-button is-active" : "resources-weather-range-button"}
                        onClick={() => setForecastRange("24h")}
                      >
                        24h
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className={forecastRange === "10d" ? "resources-weather-range-button is-active" : "resources-weather-range-button"}
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
                    ) : weatherForecastQuery.isError || forecastChartData.length === 0 ? (
                      <p className="resources-weather-status-copy">
                        Forecast trends are unavailable right now.
                      </p>
                    ) : (
                      <>
                        {forecastChartData.map((metric) => (
                          <WeatherMetricChart
                            key={metric.key}
                            title={metric.label}
                            unit={metric.yAxisUnit}
                            color={metric.color}
                            data={metric.data}
                            formatValue={metric.formatValue}
                            showDirectionArrows={metric.key === "windSpeed"}
                            showHighLow={metric.key === "temperature" && forecastRange === "10d"}
                            yAxisWidth={metric.key === "pressure" ? (unitSystem === "metric" ? 52 : 46) : 40}
                            xAxisInterval={forecastRange === "24h" ? "preserveStartEnd" : 0}
                            xAxisTicks={buildXAxisTicks(metric.data, forecastRange)}
                          />
                        ))}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              <SunArcCard
                sunrise={currentWeather?.sunrise}
                sunset={currentWeather?.sunset}
              />

              <LunarCycleCard />
            </>
          ) : null}

          {isLocationScreen ? (
            <Card className="resources-card surface-card">
              <CardHeader className="pb-3">
                <CardTitle className="resources-section-title">Location Menu</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="resources-detail-list">
                  <p>
                    Weather should start from your current location when permission is already
                    granted. You can also search for a place and save it for future sessions.
                  </p>
                </div>

                <div className="resources-weather-search-form">
                  <label className="resources-search-label" htmlFor="weather-location-search">
                    Search for a city or area
                  </label>
                  <div className="resources-weather-search-row">
                    <WeatherLocationAutocomplete
                      apiKey={GOOGLE_MAPS_API_KEY}
                      id="weather-location-search"
                      value={searchInput}
                      onChange={(event) => {
                        setSearchInput(event.target.value);
                        setGoogleSelectedLocation(null);
                      }}
                      onPlaceSelect={(location) => {
                        setGoogleSelectedLocation(location);
                        setSearchInput(
                          [location.name, location.admin1].filter(Boolean).join(", "),
                        );
                      }}
                      placeholder="Fargo, ND"
                      className="field-dark"
                      autoComplete="off"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="btn-outline-muted"
                      onClick={() => {
                        void handleUseMyLocation();
                      }}
                      disabled={isRequestingLocation}
                    >
                      <FaLocationArrow className="h-4 w-4" />
                      {isRequestingLocation ? "Locating..." : "Use My Location"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {isLocationScreen && (deferredSearchInput.length >= 2 || Boolean(googleSelectedLocation)) ? (
            <Card className="resources-card surface-card">
              <CardHeader className="pb-3">
                <CardTitle className="resources-section-title">Search Results</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {searchQuery.isError ? (
                  <div className="resources-empty-state">
                    <FaMagnifyingGlass size={20} />
                    <div>
                      <h2 className="resources-empty-title">Search unavailable</h2>
                      <p className="resources-empty-copy">
                        {searchQuery.error instanceof Error
                          ? searchQuery.error.message
                          : "We could not search for locations right now."}
                      </p>
                    </div>
                  </div>
                ) : locationResults.length === 0 && !searchQuery.isFetching ? (
                  <div className="resources-empty-state">
                    <FaMagnifyingGlass size={20} />
                    <div>
                      <h2 className="resources-empty-title">No matches found</h2>
                      <p className="resources-empty-copy">
                        Try a broader city name, state abbreviation, or nearby town.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="resources-weather-location-list">
                    {locationResults.map((location) => (
                      <div key={location.id} className="resources-trusted-source">
                        <div className="resources-trusted-source-heading">
                          <div className="resources-trusted-source-icon">
                            <FaLocationArrow size={18} />
                          </div>
                          <div className="resources-trusted-source-copy">
                            <h3 className="resources-trusted-source-title">{location.name}</h3>
                            <p className="resources-trusted-source-meta">
                              {formatWeatherLocationSubtitle(location) ||
                                formatWeatherLocationCoordinates(location)}
                            </p>
                            {formatWeatherLocationSubtitle(location) && (
                              <p className="resources-trusted-source-description">
                                {formatWeatherLocationCoordinates(location)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="resources-weather-location-actions">
                          <Button
                            type="button"
                            variant="outline"
                            className="btn-outline-info"
                            onClick={() => handleSelectLocationFromMenu(location, "search")}
                          >
                            Select
                          </Button>
                          {!savedLocationIds.has(location.id) && (
                            <Button
                              type="button"
                              variant="outline"
                              className="btn-outline-muted"
                              onClick={() => handleSaveLocation(location)}
                            >
                              Save
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {isLocationScreen ? (
            <Card className="resources-card surface-card">
              <CardHeader className="pb-3">
                <CardTitle className="resources-section-title">Saved Locations</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {savedLocations.length === 0 ? (
                  <div className="resources-empty-state">
                    <FaBookmark size={20} />
                    <div>
                      <h2 className="resources-empty-title">No saved locations yet</h2>
                      <p className="resources-empty-copy">
                        Save a searched location here so you can jump back to it next session.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="resources-weather-location-list">
                    {savedLocations.map((location) => (
                      <div key={location.id} className="resources-trusted-source">
                        <div className="resources-trusted-source-heading">
                          <div className="resources-trusted-source-icon">
                            <FaBookmark size={18} />
                          </div>
                          <div className="resources-trusted-source-copy">
                            <h3 className="resources-trusted-source-title">{location.name}</h3>
                            <p className="resources-trusted-source-meta">
                              {formatWeatherLocationSubtitle(location) ||
                                formatWeatherLocationCoordinates(location)}
                            </p>
                            {formatWeatherLocationSubtitle(location) && (
                              <p className="resources-trusted-source-description">
                                {formatWeatherLocationCoordinates(location)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="resources-weather-location-actions">
                          <Button
                            type="button"
                            variant="outline"
                            className="btn-outline-info"
                            onClick={() => handleSelectLocationFromMenu(location, "saved")}
                          >
                            Select
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="btn-outline-muted"
                            onClick={() => handleRemoveSavedLocation(location)}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
