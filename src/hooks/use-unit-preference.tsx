import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  DEFAULT_UNIT_SYSTEM,
  loadUnitPreference,
  saveUnitPreference,
  type UnitSystem,
} from "@/lib/unit-preferences";

type UnitPreferenceContextValue = {
  unitSystem: UnitSystem;
  setUnitSystem: (nextUnitSystem: UnitSystem) => void;
};

const UnitPreferenceContext = createContext<UnitPreferenceContextValue | null>(null);

export function UnitPreferenceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(DEFAULT_UNIT_SYSTEM);

  useEffect(() => {
    setUnitSystemState(loadUnitPreference(userId));
  }, [userId]);

  const setUnitSystem = (nextUnitSystem: UnitSystem) => {
    setUnitSystemState(nextUnitSystem);
    saveUnitPreference(nextUnitSystem, userId);
  };

  return (
    <UnitPreferenceContext.Provider value={{ unitSystem, setUnitSystem }}>
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
