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
import {
  FaArrowRightFromBracket,
  FaArrowUpRightFromSquare,
  FaGear,
  FaHeadset,
  FaXmark,
} from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useUnitPreference } from "@/hooks/use-unit-preference";
import type { User } from "@/types/domain";
import { STRIPE_REGISTRATION_URL } from "@/lib/external-links";

interface OptionsModalProps {
  user: User;
  isOpen: boolean;
  isLoggingOut: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenSupport: () => void;
  onLogout: () => void;
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
  const displayName = user.firstName.trim() || "Not set";

  if (!isOpen) return null;

  return (
    <div className="overlay-backdrop overlay-backdrop-dashboard overlay-backdrop-center">
      <div
        className="dialog-panel options-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="options-modal-title"
      >
        <div className="dialog-header dialog-header-corner">
          <h2 id="options-modal-title" className="dialog-title">Options</h2>
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
            className="btn-primary btn-primary-glow btn-full options-modal-button"
            asChild
          >
            <a href={STRIPE_REGISTRATION_URL} target="_blank" rel="noreferrer">
              <FaArrowUpRightFromSquare size={16} />
              Support CatchLogs
            </a>
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
