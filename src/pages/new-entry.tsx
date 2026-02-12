import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import JournalEntryForm from "@/components/journal-entry-form";
import { Button } from "@/components/ui/button";
import { FaArrowLeft } from "react-icons/fa6";
import { deletePin } from "@/lib/supabase-data";

function parsePinId(raw: string | null): number | null {
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

export default function NewEntryPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const pinId = parsePinId(params.get("pinId"));
  const isNewPin = params.get("newPin") === "1";
  const defaultTackle = (params.get("tackle") ?? "").trim();

  if (pinId === null) {
    return (
      <div className="page-scroll">
        <div className="page-content entry-page-content">
          <div className="dialog-panel dialog-panel-loading">
            <p className="text-white">Missing pin for new entry.</p>
            <Button className="btn-outline-muted mt-3" variant="outline" onClick={() => navigate("/")}>
              <FaArrowLeft className="mr-2 h-4 w-4" />
              Back to map
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleClose = async () => {
    if (isNewPin) {
      try {
        await deletePin(pinId);
        queryClient.invalidateQueries({ queryKey: ["pins"] });
        queryClient.invalidateQueries({ queryKey: ["entries"] });
      } catch (error) {
        console.error("Failed to delete pin:", error);
      }
    }
    navigate("/");
  };

  const handleComplete = () => {
    navigate(`/?pinId=${pinId}`);
  };

  return (
    <JournalEntryForm
      pinId={pinId}
      defaultTackle={defaultTackle}
      onClose={handleClose}
      onComplete={handleComplete}
      fullScreen
    />
  );
}

