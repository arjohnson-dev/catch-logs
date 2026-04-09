/*
 * File:        src/components/options-modal.tsx
 * Description: <brief description of the purpose of this file>
 *
 * Author:      Andrew Johnson
 * Company:     CatchLogs LLC
 *
 * Copyright (c) 2026 CatchLogs LLC. All rights reserved.
 *
 * This source code and all associated files are the property of CatchLogs LLC.
 * Unauthorized copying, modification, distribution, or use of this file,
 * via any medium, is strictly prohibited without explicit written permission
 * from CatchLogs LLC.
 */
import { useEffect, useRef, useState } from "react";
import {
  FaArrowRightFromBracket,
  FaChevronDown,
  FaChevronUp,
  FaGear,
  FaHeadset,
  FaXmark,
} from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { useUnitPreference } from "@/hooks/use-unit-preference";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@/types/domain";
import {
  MAP_BASE_LAYERS,
  type MapBaseLayerId,
} from "@/lib/map-layers";
import {
  loadMapBaseLayerPreference,
  loadMapLabelsVisiblePreference,
  saveMapBaseLayerPreference,
  saveMapLabelsVisiblePreference,
} from "@/lib/map-preferences";
import {
  getProfileGearDefaults,
  saveProfileGearDefaults,
  type ProfileGearDefaults,
} from "@/lib/profile-gear";
import { loadTackleDefaults, saveTackleDefaults } from "@/lib/session-gear";

interface OptionsModalProps {
  user: User;
  isOpen: boolean;
  isLoggingOut: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenSupport: () => void;
  onLogout: () => void;
}

const ROD_LENGTH_OPTIONS = ["", "5'6\"", "6'0\"", "6'6\"", "7'0\"", "7'3\"", "7'6\"", "8'0\""] as const;
const ROD_POWER_OPTIONS = ["", "Ultralight", "Light", "Medium-Light", "Medium", "Medium-Heavy", "Heavy", "Extra-Heavy"] as const;
const ROD_ACTION_OPTIONS = ["", "Slow", "Moderate", "Moderate-Fast", "Fast", "Extra-Fast"] as const;
const LINE_TYPE_OPTIONS = ["", "Monofilament", "Fluorocarbon", "Braid", "Copolymer"] as const;
const LINE_TEST_OPTIONS = ["", "2 lb", "4 lb", "6 lb", "8 lb", "10 lb", "12 lb", "15 lb", "20 lb", "30 lb", "40 lb", "50 lb", "65 lb"] as const;
const BOBBER_FLOAT_OPTIONS = ["", "None", "Fixed Bobber", "Slip Bobber", "Clip Float", "Pencil Float", "Popping Cork"] as const;
const LEADER_MATERIAL_OPTIONS = ["", "None", "Fluorocarbon", "Monofilament", "Wire", "Braid"] as const;
const LEADER_LENGTH_OPTIONS = ["", "None", "6 in", "12 in", "18 in", "24 in", "36 in", "48 in", "60 in"] as const;

function loadFallbackGearDefaults(userId: string): ProfileGearDefaults {
  const local = loadTackleDefaults(userId);
  return {
    drag: 0.5,
    rodLength: local.rodLength,
    rodPower: local.rodPower,
    rodAction: local.rodAction,
    lineType: local.lineType,
    lineTest: local.lineTest,
    bobberFloat: local.bobberFloat,
    weight: local.weight,
    leaderMaterial: local.leaderMaterial,
    leaderLength: local.leaderLength,
  };
}

export default function OptionsModal({
  user,
  isOpen,
  isLoggingOut,
  onClose,
  onOpenSettings,
  onOpenSupport,
  onLogout,
}: OptionsModalProps) {
  const currentYear = new Date().getFullYear();
  const {
    unitSystem,
    setUnitSystem,
    windSpeedDisplay,
    setWindSpeedDisplay,
  } = useUnitPreference();
  const { toast } = useToast();
  const [mapBaseLayer, setMapBaseLayer] = useState<MapBaseLayerId>(() =>
    loadMapBaseLayerPreference(user.id),
  );
  const [showMapLabels, setShowMapLabels] = useState(() =>
    loadMapLabelsVisiblePreference(user.id),
  );
  const [gearDefaults, setGearDefaults] = useState<ProfileGearDefaults>({
    drag: 0.5,
    rodLength: "",
    rodPower: "",
    rodAction: "",
    lineType: "",
    lineTest: "",
    bobberFloat: "",
    weight: "",
    leaderMaterial: "",
    leaderLength: "",
  });
  const [hasLoadedGearDefaults, setHasLoadedGearDefaults] = useState(false);
  const [usesLocalGearFallback, setUsesLocalGearFallback] = useState(false);
  const [isGearOpen, setIsGearOpen] = useState(false);
  const hasShownSaveErrorRef = useRef(false);

  const handleMapBaseLayerChange = (value: string) => {
    const selectedLayer = MAP_BASE_LAYERS.find((layer) => layer.id === value);
    if (!selectedLayer) return;
    setMapBaseLayer(selectedLayer.id);
    saveMapBaseLayerPreference(user.id, selectedLayer.id);
  };

  const handleMapLabelsChange = (checked: boolean) => {
    setShowMapLabels(checked);
    saveMapLabelsVisiblePreference(user.id, checked);
  };

  const handleGearDefaultsChange = (
    field: keyof ProfileGearDefaults,
    value: string | number,
  ) => {
    const nextValue = {
      ...gearDefaults,
      [field]: value,
    };
    setGearDefaults(nextValue);
  };
  const displayName = user.firstName.trim() || "Not set";

  useEffect(() => {
    let cancelled = false;

    const resetTimeoutId = window.setTimeout(() => {
      setHasLoadedGearDefaults(false);
      setUsesLocalGearFallback(false);
      hasShownSaveErrorRef.current = false;
    }, 0);

    void getProfileGearDefaults(user.id)
      .then((data) => {
        if (cancelled) return;
        setGearDefaults(data);
        setHasLoadedGearDefaults(true);
      })
      .catch(() => {
        if (cancelled) return;
        setGearDefaults(loadFallbackGearDefaults(user.id));
        setHasLoadedGearDefaults(true);
        setUsesLocalGearFallback(true);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(resetTimeoutId);
    };
  }, [user.id]);

  useEffect(() => {
    if (!hasLoadedGearDefaults) return;

    const timeoutId = window.setTimeout(() => {
      if (usesLocalGearFallback) {
        saveTackleDefaults(user.id, {
          rodLength: gearDefaults.rodLength,
          rodPower: gearDefaults.rodPower,
          rodAction: gearDefaults.rodAction,
          lineType: gearDefaults.lineType,
          lineTest: gearDefaults.lineTest,
          bobberFloat: gearDefaults.bobberFloat,
          weight: gearDefaults.weight,
          leaderMaterial: gearDefaults.leaderMaterial,
          leaderLength: gearDefaults.leaderLength,
        });
        return;
      }

      void saveProfileGearDefaults(user.id, gearDefaults).catch(() => {
        saveTackleDefaults(user.id, {
          rodLength: gearDefaults.rodLength,
          rodPower: gearDefaults.rodPower,
          rodAction: gearDefaults.rodAction,
          lineType: gearDefaults.lineType,
          lineTest: gearDefaults.lineTest,
          bobberFloat: gearDefaults.bobberFloat,
          weight: gearDefaults.weight,
          leaderMaterial: gearDefaults.leaderMaterial,
          leaderLength: gearDefaults.leaderLength,
        });
        setUsesLocalGearFallback(true);
        if (hasShownSaveErrorRef.current) return;
        hasShownSaveErrorRef.current = true;
        toast({
          title: "Using local gear defaults",
          description: "Backend gear sync is unavailable, so changes are saving on this device for now.",
          variant: "destructive",
        });
      });
    }, 350);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [gearDefaults, hasLoadedGearDefaults, toast, user.id, usesLocalGearFallback]);

  if (!isOpen) return null;

  return (
    <div className="overlay-backdrop overlay-backdrop-dashboard overlay-backdrop-center">
      <div className="dialog-panel options-modal-panel">
        <div className="dialog-header dialog-header-corner">
          <h2 className="dialog-title">Options</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="btn-ghost-muted dialog-close-corner"
            aria-label="Close options"
          >
            <FaXmark className="h-5 w-5" />
          </Button>
        </div>
        <div className="dialog-body options-modal-actions options-modal-scroll">
          <div className="options-modal-profile-section">
            <p className="options-modal-profile-title">Profile</p>
            <div className="options-modal-profile-row">
              <p className="options-modal-profile-line">
                <span className="options-modal-profile-label">Name:</span>{" "}
                <span className="options-modal-profile-value">{displayName}</span>
              </p>
            </div>
            <div className="options-modal-profile-row">
              <p className="options-modal-profile-line">
                <span className="options-modal-profile-label">Email:</span>{" "}
                <span className="options-modal-profile-value">{user.email}</span>
              </p>
            </div>
          </div>
          <div className="options-modal-map-section">
            <p className="options-modal-map-title">Map Layers</p>
            <div
              role="radiogroup"
              aria-label="Map base layer"
              className="options-modal-map-list"
            >
              {MAP_BASE_LAYERS.map((layer) => (
                <label key={layer.id} className="options-modal-map-option">
                  <input
                    type="radio"
                    name="options-map-base-layer"
                    value={layer.id}
                    checked={mapBaseLayer === layer.id}
                    onChange={(e) => handleMapBaseLayerChange(e.target.value)}
                    className="h-4 w-4 accent-blue-500"
                  />
                  <span className="settings-meta !m-0 leading-none">
                    {layer.label}
                  </span>
                </label>
              ))}
            </div>
            <label className="options-modal-map-option">
              <Checkbox
                id="options-map-labels-visible"
                checked={showMapLabels}
                onCheckedChange={(checked) =>
                  handleMapLabelsChange(checked === true)
                }
              />
              <span className="settings-meta !m-0 leading-none">
                Show Labels
              </span>
            </label>
          </div>
          <div className="options-modal-map-section">
            <p className="options-modal-map-title">Units</p>
            <div className="unit-toggle" role="tablist" aria-label="Measurement units">
              <button
                type="button"
                role="tab"
                aria-selected={unitSystem === "imperial"}
                className={unitSystem === "imperial" ? "unit-toggle-button unit-toggle-button-active" : "unit-toggle-button"}
                onClick={() => setUnitSystem("imperial")}
              >
                Imperial
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={unitSystem === "metric"}
                className={unitSystem === "metric" ? "unit-toggle-button unit-toggle-button-active" : "unit-toggle-button"}
                onClick={() => setUnitSystem("metric")}
              >
                Metric
              </button>
            </div>
            <label className="options-modal-map-option">
              <Checkbox
                id="options-wind-speed-knots"
                checked={windSpeedDisplay === "knots"}
                onCheckedChange={(checked) =>
                  setWindSpeedDisplay(checked === true ? "knots" : "system")
                }
              />
              <span className="settings-meta !m-0 leading-none">
                Show wind speed in knots
              </span>
            </label>
          </div>
          <div className="options-modal-map-section">
            <Collapsible open={isGearOpen} onOpenChange={setIsGearOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="options-modal-section-toggle"
                >
                  <span className="options-modal-section-toggle-copy">
                    <span className="options-modal-map-title">Gear</span>
                    <span className="options-modal-section-toggle-note">
                      Save your default rod, line, and terminal setup.
                    </span>
                  </span>
                  {isGearOpen ? (
                    <FaChevronUp className="h-4 w-4" />
                  ) : (
                    <FaChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="options-modal-collapsible-content">
                <div className="options-modal-field-grid">
                  <div className="options-modal-field-grid options-modal-field-grid-split">
                    <div className="options-modal-field">
                      <label className="options-modal-field-label" htmlFor="options-tackle-rod-length">
                        Rod Length
                      </label>
                      <select
                        id="options-tackle-rod-length"
                        value={gearDefaults.rodLength}
                        onChange={(e) => handleGearDefaultsChange("rodLength", e.target.value)}
                        className="field-dark options-modal-select"
                      >
                        <option value="">Select length</option>
                        {ROD_LENGTH_OPTIONS.filter(Boolean).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="options-modal-field">
                      <label className="options-modal-field-label" htmlFor="options-tackle-rod-power">
                        Rod Power
                      </label>
                      <select
                        id="options-tackle-rod-power"
                        value={gearDefaults.rodPower}
                        onChange={(e) => handleGearDefaultsChange("rodPower", e.target.value)}
                        className="field-dark options-modal-select"
                      >
                        <option value="">Select power</option>
                        {ROD_POWER_OPTIONS.filter(Boolean).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="options-modal-field">
                    <label className="options-modal-field-label" htmlFor="options-tackle-rod-action">
                      Rod Action
                    </label>
                    <select
                      id="options-tackle-rod-action"
                      value={gearDefaults.rodAction}
                      onChange={(e) => handleGearDefaultsChange("rodAction", e.target.value)}
                      className="field-dark options-modal-select"
                    >
                      <option value="">Select action</option>
                      {ROD_ACTION_OPTIONS.filter(Boolean).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="options-modal-field">
                    <div className="options-modal-slider-header">
                      <label className="options-modal-field-label" htmlFor="options-tackle-drag">
                        Drag
                      </label>
                      <span className="options-modal-slider-value">{gearDefaults.drag.toFixed(2)}</span>
                    </div>
                    <input
                      id="options-tackle-drag"
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={gearDefaults.drag}
                      onChange={(e) =>
                        handleGearDefaultsChange("drag", Number.parseFloat(e.target.value) || 0)
                      }
                      className="options-modal-slider"
                    />
                    <div className="options-modal-slider-scale">
                      <span>Loose</span>
                      <span>Tight</span>
                    </div>
                  </div>
                  <div className="options-modal-field-grid options-modal-field-grid-split">
                    <div className="options-modal-field">
                      <label className="options-modal-field-label" htmlFor="options-tackle-line-type">
                        Line Type
                      </label>
                      <select
                        id="options-tackle-line-type"
                        value={gearDefaults.lineType}
                        onChange={(e) => handleGearDefaultsChange("lineType", e.target.value)}
                        className="field-dark options-modal-select"
                      >
                        <option value="">Select line type</option>
                        {LINE_TYPE_OPTIONS.filter(Boolean).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="options-modal-field">
                      <label className="options-modal-field-label" htmlFor="options-tackle-line-test">
                        Test Weight
                      </label>
                      <select
                        id="options-tackle-line-test"
                        value={gearDefaults.lineTest}
                        onChange={(e) => handleGearDefaultsChange("lineTest", e.target.value)}
                        className="field-dark options-modal-select"
                      >
                        <option value="">Select test</option>
                        {LINE_TEST_OPTIONS.filter(Boolean).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="options-modal-field">
                    <label className="options-modal-field-label" htmlFor="options-tackle-bobber-float">
                      Bobber/Float
                    </label>
                    <select
                      id="options-tackle-bobber-float"
                      value={gearDefaults.bobberFloat}
                      onChange={(e) => handleGearDefaultsChange("bobberFloat", e.target.value)}
                      className="field-dark options-modal-select"
                    >
                      <option value="">Select bobber/float</option>
                      {BOBBER_FLOAT_OPTIONS.filter(Boolean).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="options-modal-field">
                    <label className="options-modal-field-label" htmlFor="options-tackle-weight">
                      Weight (oz)
                    </label>
                    <Input
                      id="options-tackle-weight"
                      type="number"
                      min="0"
                      step="0.01"
                      value={gearDefaults.weight}
                      onChange={(e) => handleGearDefaultsChange("weight", e.target.value)}
                      className="field-dark"
                      placeholder="0.125"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="options-modal-field-grid options-modal-field-grid-split">
                    <div className="options-modal-field">
                      <label className="options-modal-field-label" htmlFor="options-tackle-leader-material">
                        Leader Material
                      </label>
                      <select
                        id="options-tackle-leader-material"
                        value={gearDefaults.leaderMaterial}
                        onChange={(e) => handleGearDefaultsChange("leaderMaterial", e.target.value)}
                        className="field-dark options-modal-select"
                      >
                        <option value="">Select material</option>
                        {LEADER_MATERIAL_OPTIONS.filter(Boolean).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="options-modal-field">
                      <label className="options-modal-field-label" htmlFor="options-tackle-leader-length">
                        Leader Length
                      </label>
                      <select
                        id="options-tackle-leader-length"
                        value={gearDefaults.leaderLength}
                        onChange={(e) => handleGearDefaultsChange("leaderLength", e.target.value)}
                        className="field-dark options-modal-select"
                      >
                        <option value="">Select length</option>
                        {LEADER_LENGTH_OPTIONS.filter(Boolean).map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
          <Button
            variant="outline"
            className="btn-outline-muted btn-full options-modal-button"
            onClick={onOpenSettings}
          >
            <FaGear size={16} />
            Profile Settings
          </Button>
          <Button
            variant="outline"
            className="btn-outline-muted btn-full options-modal-button"
            onClick={onOpenSupport}
          >
            <FaHeadset size={16} />
            Contact Support
          </Button>
          <Button
            variant="outline"
            className="btn-outline-danger btn-full options-modal-button"
            onClick={onLogout}
            disabled={isLoggingOut}
          >
            <FaArrowRightFromBracket size={16} />
            {isLoggingOut ? "Logging out..." : "Log Out"}
          </Button>
          <p className="options-modal-copyright">
            Copyright &copy; {currentYear} CatchLogs LLC. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
