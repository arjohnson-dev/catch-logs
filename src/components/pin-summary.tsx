/*
 * File:        src/components/pin-summary.tsx
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  FaBookOpen,
  FaFloppyDisk,
  FaPenToSquare,
  FaPlus,
  FaTrashCan,
  FaXmark,
} from "react-icons/fa6";
import { useLocation } from "wouter";
import JournalEntryCard from "@/components/journal-entry-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type PinWithEntries } from "@/types/domain";
import { deletePinWithEntries, getPinsWithEntries, updatePinName } from "@/lib/supabase-data";
import { appQueryKeys, invalidateCatchData } from "@/lib/query-keys";
import { useToast } from "@/hooks/use-toast";

interface PinSummaryProps {
  pinId: number;
  onClose: () => void;
  onAddEntry: () => void;
}

export default function PinSummary({ pinId, onClose, onAddEntry }: PinSummaryProps) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: pins, isLoading } = useQuery<PinWithEntries[]>({
    queryKey: appQueryKeys.pins(),
    queryFn: getPinsWithEntries,
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const pin = pins?.find(p => p.id === pinId);

  useEffect(() => {
    if (!pin) return;
    setNameDraft(pin.name);
  }, [pin]);

  const renamePinMutation = useMutation({
    mutationFn: async () =>
      updatePinName({
        pinId,
        name: nameDraft,
      }),
    onSuccess: async () => {
      await invalidateCatchData(queryClient);
      setIsEditingName(false);
      toast({
        title: "Pin renamed",
        description: "The location name was updated.",
        variant: "success",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Rename failed",
        description: error instanceof Error ? error.message : "Could not rename this pin.",
        variant: "destructive",
      });
    },
  });

  const deletePinMutation = useMutation({
    mutationFn: async () => deletePinWithEntries(pinId),
    onSuccess: async () => {
      await invalidateCatchData(queryClient);
      toast({
        title: "Pin deleted",
        description: "The location and all catches saved under it were removed.",
        variant: "success",
      });
      onClose();
    },
    onError: (error: unknown) => {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Could not delete this pin.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="overlay-backdrop overlay-backdrop-dashboard overlay-backdrop-center">
        <div className="dialog-panel dialog-panel-loading">
          <div className="loading-spinner animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-white">Loading...</p>
        </div>
      </div>
    );
  }

  if (!pin) {
    return null;
  }

  const sortedEntries = (pin.entries && Array.isArray(pin.entries) ? pin.entries : [])
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
    .slice(0, 3); // Show only the 3 most recent entries

  const handleRenameSubmit = () => {
    if (!nameDraft.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a location name.",
        variant: "destructive",
      });
      return;
    }
    renamePinMutation.mutate();
  };

  const handleDeletePin = () => {
    const confirmed = window.confirm(
      "Delete this pin and all catches saved under it? This cannot be undone.",
    );
    if (!confirmed) return;
    deletePinMutation.mutate();
  };

  return (
    <div className="summary-panel">
      <div className="dialog-header dialog-header-corner dialog-header-sticky">
        <div className="summary-header-main">
          {isEditingName ? (
            <div className="summary-rename-row">
              <Input
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                className="field-dark summary-rename-input"
                placeholder="Location name"
                disabled={renamePinMutation.isPending}
              />
              <Button
                variant="outline"
                size="sm"
                className="btn-outline-muted"
                onClick={handleRenameSubmit}
                disabled={renamePinMutation.isPending}
              >
                <FaFloppyDisk className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="btn-ghost-muted"
                onClick={() => {
                  setNameDraft(pin.name);
                  setIsEditingName(false);
                }}
                disabled={renamePinMutation.isPending}
              >
                <FaXmark className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="summary-title-row">
              <h3 className="font-medium text-white">{pin.name}</h3>
              <div className="summary-title-actions">
                <Button
                  variant="ghost"
                  size="sm"
                  className="btn-ghost-muted"
                  onClick={() => setIsEditingName(true)}
                  title="Rename location"
                  aria-label="Rename location"
                >
                  <FaPenToSquare className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="btn-ghost-muted summary-delete-button"
                  onClick={handleDeletePin}
                  title="Delete location and all catches"
                  aria-label="Delete location and all catches"
                  disabled={deletePinMutation.isPending}
                >
                  <FaTrashCan className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="btn-ghost-muted dialog-close-corner"
          aria-label="Close pin summary"
        >
          <FaXmark className="h-4 w-4" />
        </Button>
      </div>
      <div className="dialog-body summary-body">
        <div className="summary-scroll-content">
          {/* Recent Entries */}
          {sortedEntries.length > 0 && (
            <div className="mb-4">
              {sortedEntries.map((entry) => (
                <JournalEntryCard
                  key={entry.id}
                  entry={entry}
                  className="summary-entry"
                  actions={[
                    {
                      id: "open-in-journal",
                      label: "Open in journal",
                      icon: FaBookOpen,
                      onClick: () => {
                        onClose();
                        navigate(`/journal?entryId=${entry.id}`);
                      },
                    },
                  ]}
                />
              ))}
              {(pin.entries && Array.isArray(pin.entries) ? pin.entries : []).length > 3 && (
                <p className="summary-more">
                  And {(pin.entries && Array.isArray(pin.entries) ? pin.entries : []).length - 3} more...
                </p>
              )}
            </div>
          )}
          {sortedEntries.length === 0 && (
            <p className="summary-more">No catches saved at this location yet.</p>
          )}
        </div>

        <div className="summary-footer">
          <Button 
            onClick={onAddEntry}
            className="btn-full btn-primary"
          >
            <FaPlus className="h-4 w-4 mr-2" />
            Add New Catch
          </Button>
        </div>
      </div>
    </div>
  );
}
