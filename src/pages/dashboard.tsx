import { useState, useEffect } from "react";
import MapInterface from "@/components/map-interface";
import PinSummary from "@/components/pin-summary";
import BottomNavigation from "@/components/bottom-navigation";
import OptionsModal from "@/components/options-modal";
import { FaUser } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { useAuth, useLogout } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import catchLogsIcon from "@assets/catchlogs-icon.png";
import { moveEntryToNewCoordinates } from "@/lib/supabase-data";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const initialPinIdFromUrl = (() => {
    const pinIdParam = new URLSearchParams(window.location.search).get("pinId");
    if (!pinIdParam) return null;
    const parsed = Number.parseInt(pinIdParam, 10);
    return Number.isNaN(parsed) ? null : parsed;
  })();
  const initialMoveEntryIdFromUrl = (() => {
    const entryIdParam = new URLSearchParams(window.location.search).get("moveEntryId");
    if (!entryIdParam) return null;
    const parsed = Number.parseInt(entryIdParam, 10);
    return Number.isNaN(parsed) ? null : parsed;
  })();

  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const logout = useLogout();
  const queryClient = useQueryClient();
  const [selectedPinId, setSelectedPinId] = useState<number | null>(initialPinIdFromUrl);
  const [showPinSummary, setShowPinSummary] = useState(Boolean(initialPinIdFromUrl));
  const [moveEntryId, setMoveEntryId] = useState<number | null>(initialMoveEntryIdFromUrl);
  const [sessionTackle, setSessionTackle] = useState("");
  const [isPinDropMode, setIsPinDropMode] = useState(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  // Handle URL parameter for centering on a specific pin
  useEffect(() => {
    if (initialPinIdFromUrl !== null || initialMoveEntryIdFromUrl !== null) {
      window.history.replaceState({}, "", "/");
    }
  }, [initialPinIdFromUrl, initialMoveEntryIdFromUrl]);

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
                aria-label="Open options"
              >
                <FaUser size={20} />
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
            onSessionTackleChange={setSessionTackle}
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
    </div>
  );
}
