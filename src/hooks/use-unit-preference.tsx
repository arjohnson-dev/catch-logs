import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  DEFAULT_WIND_SPEED_DISPLAY,
  DEFAULT_UNIT_SYSTEM,
  loadWindSpeedDisplayPreference,
  loadUnitPreference,
  saveWindSpeedDisplayPreference,
  saveUnitPreference,
  type WindSpeedDisplay,
  type UnitSystem,
} from "@/lib/unit-preferences";

type UnitPreferenceContextValue = {
  unitSystem: UnitSystem;
  setUnitSystem: (nextUnitSystem: UnitSystem) => void;
  windSpeedDisplay: WindSpeedDisplay;
  setWindSpeedDisplay: (nextWindSpeedDisplay: WindSpeedDisplay) => void;
};

const UnitPreferenceContext = createContext<UnitPreferenceContextValue | null>(null);

export function UnitPreferenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(DEFAULT_UNIT_SYSTEM);
  const [windSpeedDisplay, setWindSpeedDisplayState] = useState<WindSpeedDisplay>(
    DEFAULT_WIND_SPEED_DISPLAY,
  );

  useEffect(() => {
    setUnitSystemState(loadUnitPreference(userId));
    setWindSpeedDisplayState(loadWindSpeedDisplayPreference(userId));
  }, [userId]);

  const setUnitSystem = (nextUnitSystem: UnitSystem) => {
    setUnitSystemState(nextUnitSystem);
    saveUnitPreference(nextUnitSystem, userId);
  };

  const setWindSpeedDisplay = (nextWindSpeedDisplay: WindSpeedDisplay) => {
    setWindSpeedDisplayState(nextWindSpeedDisplay);
    saveWindSpeedDisplayPreference(nextWindSpeedDisplay, userId);
  };

  return (
    <UnitPreferenceContext.Provider
      value={{ unitSystem, setUnitSystem, windSpeedDisplay, setWindSpeedDisplay }}
    >
      {children}
    </UnitPreferenceContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUnitPreference() {
  const context = useContext(UnitPreferenceContext);
  if (!context) {
    throw new Error("useUnitPreference must be used within a UnitPreferenceProvider");
  }

  return context;
}
