/*
 * File:        src/pages/dashboard.tsx
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
import { useState, useEffect } from "react";
import MapInterface from "@/components/map-interface";
import PinSummary from "@/components/pin-summary";
import BottomNavigation from "@/components/bottom-navigation";
import OptionsModal from "@/components/options-modal";
import { FaGear } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { useAuth, useLogout } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import catchLogsIcon from "@assets/catchlogs-icon.png";
import { moveEntryToNewCoordinates, moveEntryToPin } from "@/lib/supabase-data";
import { getMyFavoriteSpecCodes } from "@/lib/field-guide";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  loadSessionBait,
  loadSessionLure,
  saveSessionBait,
  saveSessionLure,
} from "@/lib/session-gear";
import JournalPage from "@/pages/journal";
import NewEntryPage from "@/pages/new-entry";
import Settings from "@/pages/settings";
import Stats from "@/pages/stats";
import Support from "@/pages/support";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import NotFound from "@/pages/not-found";
import ResourcesHub from "@/pages/resources";
import FieldGuide from "@/pages/field-guide";
import ResourcesPlaceholder from "@/pages/resources-placeholder";
import TrustedSourcesPage from "@/pages/trusted-sources";

export default function Dashboard() {
  const currentPath = window.location.pathname;
  const initialPinIdFromUrl = (() => {
    if (currentPath !== "/") return null;
    const pinIdParam = new URLSearchParams(window.location.search).get("pinId");
    if (!pinIdParam) return null;
    const parsed = Number.parseInt(pinIdParam, 10);
    return Number.isNaN(parsed) ? null : parsed;
  })();
  const initialMoveEntryIdFromUrl = (() => {
    if (currentPath !== "/") return null;
    const entryIdParam = new URLSearchParams(window.location.search).get("moveEntryId");
    if (!entryIdParam) return null;
    const parsed = Number.parseInt(entryIdParam, 10);
    return Number.isNaN(parsed) ? null : parsed;
  })();
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const logout = useLogout();
  const queryClient = useQueryClient();
  const [selectedPinId, setSelectedPinId] = useState<number | null>(initialPinIdFromUrl);
  const [showPinSummary, setShowPinSummary] = useState(Boolean(initialPinIdFromUrl));
  const [moveEntryId, setMoveEntryId] = useState<number | null>(initialMoveEntryIdFromUrl);
  const [sessionLureByUser, setSessionLureByUser] = useState<Record<string, string>>({});
  const [sessionBaitByUser, setSessionBaitByUser] = useState<Record<string, string>>({});
  const [isPinDropMode, setIsPinDropMode] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const userId = user?.id ?? null;
  const sessionLure = userId
    ? (sessionLureByUser[userId] ?? loadSessionLure(userId))
    : "";
  const sessionBait = userId
    ? (sessionBaitByUser[userId] ?? loadSessionBait(userId))
    : "";
  useQuery({
    queryKey: ["field-guide", "favorite-spec-codes", userId],
    queryFn: getMyFavoriteSpecCodes,
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5,
  });
  const normalizedPath = (() => {
    const pathOnly = location.split("?")[0].split("#")[0];
    if (pathOnly === "/auth") return "/";
    const withoutTrailingSlash = pathOnly.replace(/\/+$/, "");
    return withoutTrailingSlash.length > 0 ? withoutTrailingSlash : "/";
  })();
  const isOverlayOpen = normalizedPath !== "/";

  // Handle URL parameter for centering on a specific pin
  useEffect(() => {
    if (initialPinIdFromUrl !== null || initialMoveEntryIdFromUrl !== null) {
      window.history.replaceState({}, "", "/");
    }
  }, [initialPinIdFromUrl, initialMoveEntryIdFromUrl]);

  const handleSessionLureChange = (value: string) => {
    if (!userId) return;
    setSessionLureByUser((prev) => ({
      ...prev,
      [userId]: value,
    }));
    saveSessionLure(userId, value);
  };

  const handleSessionBaitChange = (value: string) => {
    if (!userId) return;
    setSessionBaitByUser((prev) => ({
      ...prev,
      [userId]: value,
    }));
    saveSessionBait(userId, value);
  };

  const handlePinSelect = (pinId: number, isNew = false) => {
    if (moveEntryId !== null) {
      handleMoveEntryToExistingPin(moveEntryId, pinId);
      return;
    }

    setSelectedPinId(pinId);
    if (isNew) {
      const params = new URLSearchParams({
        pinId: String(pinId),
        newPin: "1",
      });
      if (sessionLure.trim()) {
        params.set("lure", sessionLure.trim());
      }
      if (sessionBait.trim()) {
        params.set("bait", sessionBait.trim());
      }
      navigate(`/entries/new?${params.toString()}`);
    } else {
      setShowPinSummary(true);
    }
  };

  const handleAddEntry = () => {
    if (!selectedPinId) return;
    setShowPinSummary(false);
    const params = new URLSearchParams({
      pinId: String(selectedPinId),
    });
    if (sessionLure.trim()) {
      params.set("lure", sessionLure.trim());
    }
    if (sessionBait.trim()) {
      params.set("bait", sessionBait.trim());
    }
    navigate(`/entries/new?${params.toString()}`);
  };

  const handleLogout = () => {
    setShowOptionsModal(false);
    logout.mutate();
  };

  const handleJournalClick = () => {
    navigate("/journal");
  };

  const handleEntryMove = async (entryId: number, lat: number, lng: number) => {
    if (!user?.id) {
      toast({
        title: "Not authenticated",
        description: "Please sign in again.",
        variant: "destructive",
      });
      return;
    }
    try {
      await moveEntryToNewCoordinates({
        entryId,
        userId: user.id,
        latitude: lat,
        longitude: lng,
      });
      queryClient.invalidateQueries({ queryKey: ["pins"] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      setMoveEntryId(null);
      toast({
        title: "Entry moved",
        description: "The entry location was updated.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not move entry";
      toast({
        title: "Move failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleMoveEntryToExistingPin = async (entryId: number, targetPinId: number) => {
    try {
      await moveEntryToPin({
        entryId,
        targetPinId,
      });
      queryClient.invalidateQueries({ queryKey: ["pins"] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      setMoveEntryId(null);
      setSelectedPinId(targetPinId);
      setShowPinSummary(true);
      toast({
        title: "Entry moved",
        description: "The entry was moved to the selected pin.",
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not move entry";
      toast({
        title: "Move failed",
        description: message,
        variant: "destructive",
      });
    }
  };

  const renderOverlayView = () => {
    if (normalizedPath === "/resources") {
      return <ResourcesHub />;
    }

    if (normalizedPath === "/resources/field-guide" || normalizedPath.startsWith("/resources/field-guide/")) {
      return <FieldGuide />;
    }

    if (normalizedPath === "/resources/trusted-sources") {
      return <TrustedSourcesPage />;
    }

    if (normalizedPath === "/resources/fishing-reports") {
      return (
        <ResourcesPlaceholder
          title="Fishing Reports"
          description="Check current local fishing activity and conditions."
        />
      );
    }

    if (normalizedPath === "/resources/weather") {
      return (
        <ResourcesPlaceholder
          title="Weather & Conditions"
          description="View weather-related context relevant to fishing."
        />
      );
    }

    if (normalizedPath === "/resources/regulations") {
      return (
        <ResourcesPlaceholder
          title="Regulations"
          description="Access fishing rules and regulatory information."
        />
      );
    }

    switch (normalizedPath) {
      case "/":
        return null;
      case "/journal":
        return <JournalPage />;
      case "/entries/new":
        return <NewEntryPage />;
      case "/settings":
        return <Settings />;
      case "/stats":
        return <Stats />;
      case "/support":
        return <Support />;
      case "/terms":
        return <Terms />;
      case "/privacy":
        return <Privacy />;
      default:
        return <NotFound />;
    }
  };

  const overlayView = renderOverlayView();

  return (
    <div className="dashboard-shell">
      {/* Top Navigation */}
      <nav className="dashboard-nav">
        <div className="dashboard-nav-inner">
          <div className="dashboard-brand">
            <div className="dashboard-brand-icon">
              <img src={catchLogsIcon} alt="CatchLogs" width={32} height={32} />
            </div>
            <div>
              <h1 className="dashboard-brand-title">CatchLogs</h1>
              {user && user.firstName && <p className="dashboard-brand-subtitle">Welcome, {user.firstName}</p>}
            </div>
          </div>
          <div>
            {user && (
              <Button
                variant="ghost"
                className="touch-target dashboard-user-trigger"
                onClick={() => setShowOptionsModal(true)}
                aria-label="Open settings"
                title="Settings"
              >
                <FaGear size={20} />
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="dashboard-main">
        {/* Map Section */}
        <div className="map-shell">
          <MapInterface
            selectedPinId={selectedPinId}
            onPinSelect={handlePinSelect}
            isPinDropMode={isPinDropMode}
            onPinDropModeChange={setIsPinDropMode}
            moveEntryId={moveEntryId}
            onEntryMove={handleEntryMove}
            sessionLure={sessionLure}
            sessionBait={sessionBait}
            onSessionLureChange={handleSessionLureChange}
            onSessionBaitChange={handleSessionBaitChange}
          />
        </div>
      </div>

      {/* Bottom Navigation (Mobile) */}
      <BottomNavigation
        onJournalClick={handleJournalClick}
      />

      {/* Pin Summary */}
      {showPinSummary && selectedPinId && (
        <PinSummary
          pinId={selectedPinId}
          onClose={() => {
            setShowPinSummary(false);
            setSelectedPinId(null);
          }}
          onAddEntry={handleAddEntry}
        />
      )}

      {showOptionsModal && user && (
        <OptionsModal
          user={user}
          isOpen={showOptionsModal}
          isLoggingOut={logout.isPending}
          onClose={() => setShowOptionsModal(false)}
          onOpenSettings={() => {
            setShowOptionsModal(false);
            navigate("/settings");
          }}
          onLogout={handleLogout}
        />
      )}

      {isOverlayOpen && overlayView && (
        <div className="app-overlay-layer" role="dialog" aria-modal="true">
          <div className="app-overlay-panel">
            {overlayView}
          </div>
        </div>
      )}
    </div>
  );
}
