import { useQuery } from "@tanstack/react-query";
import {
  FaPlus,
  FaXmark,
} from "react-icons/fa6";
import JournalEntryCard from "@/components/journal-entry-card";
import { Button } from "@/components/ui/button";
import { type PinWithEntries } from "@/types/domain";
import { getPinsWithEntries } from "@/lib/supabase-data";

interface PinSummaryProps {
  pinId: number;
  onClose: () => void;
  onAddEntry: () => void;
}

export default function PinSummary({ pinId, onClose, onAddEntry }: PinSummaryProps) {
  const { data: pins, isLoading } = useQuery<PinWithEntries[]>({
    queryKey: ["pins"],
    queryFn: getPinsWithEntries,
  });

  const pin = pins?.find(p => p.id === pinId);

  if (isLoading) {
    return (
      <div className="overlay-backdrop overlay-backdrop-dashboard overlay-backdrop-center">
        <div className="dialog-panel dialog-panel-loading">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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

  return (
    <div className="summary-panel">
      <div className="dialog-header dialog-header-corner">
        <h3 className="font-medium text-white">{pin.name}</h3>
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
      <div className="dialog-body">
        {/* Recent Entries */}
        {sortedEntries.length > 0 && (
          <div className="mb-4">
            {sortedEntries.map((entry) => (
              <JournalEntryCard
                key={entry.id}
                entry={entry}
                className="summary-entry"
              />
            ))}
            {(pin.entries && Array.isArray(pin.entries) ? pin.entries : []).length > 3 && (
              <p className="summary-more">
                And {(pin.entries && Array.isArray(pin.entries) ? pin.entries : []).length - 3} more...
              </p>
            )}
          </div>
        )}

        <Button 
          onClick={onAddEntry}
          className="btn-full btn-primary"
        >
          <FaPlus className="h-4 w-4 mr-2" />
          Add New Catch
        </Button>
      </div>
    </div>
  );
}
