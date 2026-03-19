export type UnitSystem = "imperial" | "metric";

export const DEFAULT_UNIT_SYSTEM: UnitSystem = "imperial";

const UNIT_PREFERENCE_KEY_PREFIX = "catchlogs:unit-system:";
const GUEST_UNIT_PREFERENCE_KEY = `${UNIT_PREFERENCE_KEY_PREFIX}guest`;

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

function getUnitPreferenceKey(userId: string | null | undefined) {
  return userId ? `${UNIT_PREFERENCE_KEY_PREFIX}${userId}` : GUEST_UNIT_PREFERENCE_KEY;
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
