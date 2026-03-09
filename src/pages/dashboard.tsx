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
import { useQueryClient } from "@tanstack/react-query";
import catchLogsIcon from "@assets/catchlogs-icon.png";
import { moveEntryToNewCoordinates } from "@/lib/supabase-data";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  loadSessionTackle,
  saveSessionTackle,
} from "@/lib/session-tackle";
import JournalPage from "@/pages/journal";
import NewEntryPage from "@/pages/new-entry";
import Settings from "@/pages/settings";
import Stats from "@/pages/stats";
import Support from "@/pages/support";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import NotFound from "@/pages/not-found";

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
  const [sessionTackleByUser, setSessionTackleByUser] = useState<Record<string, string>>({});
  const [isPinDropMode, setIsPinDropMode] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const userId = user?.id ?? null;
  const sessionTackle = userId
    ? (sessionTackleByUser[userId] ?? loadSessionTackle(userId))
    : "";
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

  const handleSessionTackleChange = (value: string) => {
    if (!userId) return;
    setSessionTackleByUser((prev) => ({
      ...prev,
      [userId]: value,
    }));
    saveSessionTackle(userId, value);
  };

  const handlePinSelect = (pinId: number, isNew = false) => {
    setSelectedPinId(pinId);
    if (isNew) {
      const params = new URLSearchParams({
        pinId: String(pinId),
        newPin: "1",
      });
      if (sessionTackle.trim()) {
        params.set("tackle", sessionTackle.trim());
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
    if (sessionTackle.trim()) {
      params.set("tackle", sessionTackle.trim());
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

  const renderOverlayView = () => {
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
            sessionTackle={sessionTackle}
            onSessionTackleChange={handleSessionTackleChange}
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
