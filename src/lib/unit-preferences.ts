export type UnitSystem = "imperial" | "metric";
export type WindSpeedDisplay = "knots" | "system";

export const DEFAULT_UNIT_SYSTEM: UnitSystem = "imperial";
export const DEFAULT_WIND_SPEED_DISPLAY: WindSpeedDisplay = "knots";

const UNIT_PREFERENCE_KEY_PREFIX = "catchlogs:unit-system:";
const WIND_SPEED_PREFERENCE_KEY_PREFIX = "catchlogs:wind-speed-display:";
const GUEST_UNIT_PREFERENCE_KEY = `${UNIT_PREFERENCE_KEY_PREFIX}guest`;
const GUEST_WIND_SPEED_PREFERENCE_KEY = `${WIND_SPEED_PREFERENCE_KEY_PREFIX}guest`;

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isUnitSystem(value: string): value is UnitSystem {
  return value === "imperial" || value === "metric";
}

function isWindSpeedDisplay(value: string): value is WindSpeedDisplay {
  return value === "knots" || value === "system";
}

function getUnitPreferenceKey(userId: string | null | undefined) {
  return userId ? `${UNIT_PREFERENCE_KEY_PREFIX}${userId}` : GUEST_UNIT_PREFERENCE_KEY;
}

function getWindSpeedPreferenceKey(userId: string | null | undefined) {
  return userId
    ? `${WIND_SPEED_PREFERENCE_KEY_PREFIX}${userId}`
    : GUEST_WIND_SPEED_PREFERENCE_KEY;
}

export function loadUnitPreference(userId?: string | null): UnitSystem {
  const storage = getStorage();
  if (!storage) {
    return DEFAULT_UNIT_SYSTEM;
  }

  const raw = storage.getItem(getUnitPreferenceKey(userId));
  if (!raw || !isUnitSystem(raw)) {
    return DEFAULT_UNIT_SYSTEM;
  }

  return raw;
}

export function saveUnitPreference(unitSystem: UnitSystem, userId?: string | null) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(getUnitPreferenceKey(userId), unitSystem);
}

export function loadWindSpeedDisplayPreference(userId?: string | null): WindSpeedDisplay {
  const storage = getStorage();
  if (!storage) {
    return DEFAULT_WIND_SPEED_DISPLAY;
  }

  const raw = storage.getItem(getWindSpeedPreferenceKey(userId));
  if (!raw || !isWindSpeedDisplay(raw)) {
    return DEFAULT_WIND_SPEED_DISPLAY;
  }

  return raw;
}

export function saveWindSpeedDisplayPreference(
  windSpeedDisplay: WindSpeedDisplay,
  userId?: string | null,
) {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(getWindSpeedPreferenceKey(userId), windSpeedDisplay);
}

function formatNumber(value: number, maximumFractionDigits: number) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value);
}

export function formatLength(cm: number, unitSystem: UnitSystem) {
  if (unitSystem === "imperial") {
    return formatImperialLengthFromCm(cm);
  }

  return `${formatNumber(cm, 1)} cm`;
}

export function formatWeight(g: number, unitSystem: UnitSystem) {
  if (unitSystem === "imperial") {
    const ounces = g / 28.349523125;
    if (ounces >= 16) {
      const pounds = ounces / 16;
      return `${formatNumber(pounds, 1)} lb`;
    }

    return `${formatNumber(ounces, 1)} oz`;
  }

  if (g >= 1000) {
    return `${formatNumber(g / 1000, 1)} kg`;
  }

  return `${formatNumber(g, 0)} g`;
}

function formatImperialLengthFromCm(cm: number) {
  const roundedInches = Math.round(cm / 2.54);
  const feet = Math.floor(roundedInches / 12);
  const inches = roundedInches % 12;

  if (feet <= 0) {
    return `${inches}"`;
  }

  return `${feet}' ${inches}"`;
}

function formatImperialWeightFromG(g: number) {
  const ounces = g / 28.349523125;
  if (ounces >= 16) {
    return `${formatNumber(ounces / 16, 1)} lb`;
  }

  return `${formatNumber(ounces, 1)} oz`;
}

export function convertWindSpeedForDisplay(
  value: number | null,
  unitSystem: UnitSystem,
  windSpeedDisplay: WindSpeedDisplay,
) {
  if (value == null) {
    return null;
  }

  if (windSpeedDisplay === "knots") {
    return unitSystem === "metric" ? value * 0.539956803 : value * 0.868976242;
  }

  return value;
}

export function getWindSpeedUnitLabel(
  unitSystem: UnitSystem,
  windSpeedDisplay: WindSpeedDisplay,
) {
  if (windSpeedDisplay === "knots") {
    return "kt";
  }

  return unitSystem === "metric" ? "kph" : "mph";
}

function formatTemperatureForDisplay(valueCelsius: number, unitSystem: UnitSystem) {
  if (unitSystem === "metric") {
    return `${formatNumber(valueCelsius, 0)}°C`;
  }

  return `${formatNumber((valueCelsius * 9) / 5 + 32, 0)}°F`;
}

function formatPressureForDisplay(valueHpa: number, unitSystem: UnitSystem) {
  if (unitSystem === "metric") {
    return `${formatNumber(valueHpa, 0)} hPa`;
  }

  return `${formatNumber(valueHpa * 0.0295299830714, 2)} inHg`;
}

function formatDistanceForDisplay(valueKm: number, unitSystem: UnitSystem) {
  if (unitSystem === "metric") {
    return `${formatNumber(valueKm, valueKm < 10 ? 1 : 0)} km`;
  }

  return `${formatNumber(valueKm * 0.621371, valueKm < 16 ? 1 : 0)} mi`;
}

function formatPrecipitationForDisplay(valueMm: number, unitSystem: UnitSystem) {
  if (unitSystem === "metric") {
    return `${formatNumber(valueMm, valueMm < 10 ? 1 : 0)} mm`;
  }

  return `${formatNumber(valueMm / 25.4, valueMm < 25.4 ? 2 : 1)} in`;
}

function formatWindSpeedText(
  valueMph: number,
  unitSystem: UnitSystem,
  windSpeedDisplay: WindSpeedDisplay,
) {
  const displayValue = convertWindSpeedForDisplay(
    unitSystem === "metric" ? valueMph * 1.609344 : valueMph,
    unitSystem,
    windSpeedDisplay,
  );

  if (displayValue == null) {
    return null;
  }

  const precision = windSpeedDisplay === "knots" ? 0 : 0;
  return `${formatNumber(displayValue, precision)} ${getWindSpeedUnitLabel(unitSystem, windSpeedDisplay)}`;
}

function convertTemperatureToCelsius(value: number, unit: string) {
  return unit.toLowerCase().includes("f") ? ((value - 32) * 5) / 9 : value;
}

function convertPressureToHpa(value: number, unit: string) {
  const normalizedUnit = unit.toLowerCase();
  if (normalizedUnit === "inhg") {
    return value / 0.0295299830714;
  }

  return value;
}

function convertDistanceToKm(value: number, unit: string) {
  const normalizedUnit = unit.toLowerCase();
  if (normalizedUnit === "mi" || normalizedUnit === "mile" || normalizedUnit === "miles") {
    return value / 0.621371;
  }

  return value;
}

function convertPrecipitationToMm(value: number, unit: string) {
  const normalizedUnit = unit.toLowerCase();
  if (normalizedUnit === "in" || normalizedUnit === "inch" || normalizedUnit === "inches") {
    return value * 25.4;
  }

  return value;
}

function convertWindSpeedToMph(value: number, unit: string) {
  const normalizedUnit = unit.toLowerCase();
  if (normalizedUnit === "kph" || normalizedUnit === "kmh") {
    return value / 1.609344;
  }

  if (normalizedUnit === "kt" || normalizedUnit === "kts" || normalizedUnit === "knot" || normalizedUnit === "knots") {
    return value / 0.868976242;
  }

  return value;
}

export function formatWeatherMeasurementText(
  text: string,
  unitSystem: UnitSystem,
  windSpeedDisplay: WindSpeedDisplay,
) {
  let converted = text;

  converted = converted.replace(
    /(\d+(?:\.\d+)?)\s*(°?\s?[FC])\b/gi,
    (match, value: string, unit: string) => {
      const parsed = Number.parseFloat(value);
      if (Number.isNaN(parsed)) {
        return match;
      }

      return formatTemperatureForDisplay(convertTemperatureToCelsius(parsed, unit), unitSystem);
    },
  );

  converted = converted.replace(
    /(\d+(?:\.\d+)?)\s*(?:to|-|–|—)\s*(\d+(?:\.\d+)?)\s*(°?\s?[FC])\b/gi,
    (match, startValue: string, endValue: string, unit: string) => {
      const start = Number.parseFloat(startValue);
      const end = Number.parseFloat(endValue);
      if (Number.isNaN(start) || Number.isNaN(end)) {
        return match;
      }

      return `${formatTemperatureForDisplay(convertTemperatureToCelsius(start, unit), unitSystem)} to ${formatTemperatureForDisplay(convertTemperatureToCelsius(end, unit), unitSystem)}`;
    },
  );

  converted = converted.replace(
    /(\d+(?:\.\d+)?)\s*(inhg|hpa|mb)\b/gi,
    (match, value: string, unit: string) => {
      const parsed = Number.parseFloat(value);
      if (Number.isNaN(parsed)) {
        return match;
      }

      return formatPressureForDisplay(convertPressureToHpa(parsed, unit), unitSystem);
    },
  );

  converted = converted.replace(
    /(\d+(?:\.\d+)?)\s*(mph|kph|kmh|kt|kts|knot|knots)\b/gi,
    (match, value: string, unit: string) => {
      const parsed = Number.parseFloat(value);
      if (Number.isNaN(parsed)) {
        return match;
      }

      return formatWindSpeedText(convertWindSpeedToMph(parsed, unit), unitSystem, windSpeedDisplay) ?? match;
    },
  );

  converted = converted.replace(
    /(\d+(?:\.\d+)?)\s*(mi|mile|miles|km)\b/gi,
    (match, value: string, unit: string) => {
      const parsed = Number.parseFloat(value);
      if (Number.isNaN(parsed)) {
        return match;
      }

      return formatDistanceForDisplay(convertDistanceToKm(parsed, unit), unitSystem);
    },
  );

  converted = converted.replace(
    /(\d+(?:\.\d+)?)\s*(inches|inch|in|mm)\b/gi,
    (match, value: string, unit: string) => {
      const parsed = Number.parseFloat(value);
      if (Number.isNaN(parsed)) {
        return match;
      }

      return formatPrecipitationForDisplay(convertPrecipitationToMm(parsed, unit), unitSystem);
    },
  );

  return formatMeasurementText(converted, unitSystem);
}

export function formatMeasurementText(text: string, unitSystem: UnitSystem) {
  if (unitSystem === "metric") {
    return text;
  }

  let converted = text;

  converted = converted.replace(
    /(\d+(?:\.\d+)?)\s*(\u2013|\u2014|-| to )\s*(\d+(?:\.\d+)?)\s*cm\b/gi,
    (_match, startValue: string, separator: string, endValue: string) => {
      const start = Number.parseFloat(startValue);
      const end = Number.parseFloat(endValue);
      if (Number.isNaN(start) || Number.isNaN(end)) {
        return _match;
      }

      return `${formatImperialLengthFromCm(start)}${separator}${formatImperialLengthFromCm(end)}`;
    },
  );

  converted = converted.replace(
    /(\d+(?:\.\d+)?)\s*(\u2013|\u2014|-| to )\s*(\d+(?:\.\d+)?)\s*mm\b/gi,
    (_match, startValue: string, separator: string, endValue: string) => {
      const start = Number.parseFloat(startValue);
      const end = Number.parseFloat(endValue);
      if (Number.isNaN(start) || Number.isNaN(end)) {
        return _match;
      }

      return `${formatImperialLengthFromCm(start / 10)}${separator}${formatImperialLengthFromCm(end / 10)}`;
    },
  );

  converted = converted.replace(
    /(\d+(?:\.\d+)?)\s*(\u2013|\u2014|-| to )\s*(\d+(?:\.\d+)?)\s*m\b/gi,
    (_match, startValue: string, separator: string, endValue: string) => {
      const start = Number.parseFloat(startValue);
      const end = Number.parseFloat(endValue);
      if (Number.isNaN(start) || Number.isNaN(end)) {
        return _match;
      }

      return `${formatImperialLengthFromCm(start * 100)}${separator}${formatImperialLengthFromCm(end * 100)}`;
    },
  );

  converted = converted.replace(
    /(\d+(?:\.\d+)?)\s*(\u2013|\u2014|-| to )\s*(\d+(?:\.\d+)?)\s*kg\b/gi,
    (_match, startValue: string, separator: string, endValue: string) => {
      const start = Number.parseFloat(startValue);
      const end = Number.parseFloat(endValue);
      if (Number.isNaN(start) || Number.isNaN(end)) {
        return _match;
      }

      return `${formatImperialWeightFromG(start * 1000)}${separator}${formatImperialWeightFromG(end * 1000)}`;
    },
  );

  converted = converted.replace(
    /(\d+(?:\.\d+)?)\s*(\u2013|\u2014|-| to )\s*(\d+(?:\.\d+)?)\s*g\b/gi,
    (_match, startValue: string, separator: string, endValue: string) => {
      const start = Number.parseFloat(startValue);
      const end = Number.parseFloat(endValue);
      if (Number.isNaN(start) || Number.isNaN(end)) {
        return _match;
      }

      return `${formatImperialWeightFromG(start)}${separator}${formatImperialWeightFromG(end)}`;
    },
  );

  converted = converted.replace(/(\d+(?:\.\d+)?)\s*cm\b/gi, (_match, value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? _match : formatImperialLengthFromCm(parsed);
  });

  converted = converted.replace(/(\d+(?:\.\d+)?)\s*mm\b/gi, (_match, value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? _match : formatImperialLengthFromCm(parsed / 10);
  });

  converted = converted.replace(/(\d+(?:\.\d+)?)\s*m\b/gi, (_match, value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? _match : formatImperialLengthFromCm(parsed * 100);
  });

  converted = converted.replace(/(\d+(?:\.\d+)?)\s*kg\b/gi, (_match, value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? _match : formatImperialWeightFromG(parsed * 1000);
  });

  converted = converted.replace(/(\d+(?:\.\d+)?)\s*g\b/gi, (_match, value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? _match : formatImperialWeightFromG(parsed);
  });

  return converted;
}
