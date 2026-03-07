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
import { useState } from "react";
import { FaArrowRightFromBracket, FaGear, FaXmark } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

interface OptionsModalProps {
  user: User;
  isOpen: boolean;
  isLoggingOut: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export default function OptionsModal({
  user,
  isOpen,
  isLoggingOut,
  onClose,
  onOpenSettings,
  onLogout,
}: OptionsModalProps) {
  const [mapBaseLayer, setMapBaseLayer] = useState<MapBaseLayerId>(() =>
    loadMapBaseLayerPreference(user.id),
  );
  const [showMapLabels, setShowMapLabels] = useState(() =>
    loadMapLabelsVisiblePreference(user.id),
  );

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
  const displayName = user.firstName.trim() || "Not set";

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
        <div className="dialog-body options-modal-actions">
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
            className="btn-outline-danger btn-full options-modal-button"
            onClick={onLogout}
            disabled={isLoggingOut}
          >
            <FaArrowRightFromBracket size={16} />
            {isLoggingOut ? "Logging out..." : "Log Out"}
          </Button>
        </div>
      </div>
    </div>
  );
}
