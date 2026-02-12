import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  FaClock,
  FaFish,
  FaPlus,
  FaRuler,
  FaTemperatureHalf,
  FaWeightScale,
  FaXmark,
} from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { type PinWithEntries, type JournalEntry } from "@/types/domain";
import { getPinsWithEntries } from "@/lib/supabase-data";

interface PinSummaryProps {
  pinId: number;
  onClose: () => void;
  onAddEntry: () => void;
}

function JournalEntryCard({ entry }: { entry: JournalEntry }) {
  return (
    <div className="summary-entry">
      <div className="flex items-start space-x-3">
        {/* Fish Photo */}
        {entry.photoUrl ? (
          <img
            src={entry.photoUrl}
            alt={`Caught ${entry.fishType}`}
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-[#333333] flex items-center justify-center flex-shrink-0">
            <FaFish className="h-6 w-6 text-[#666666]" />
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-white text-sm">{entry.fishType}</h4>
            <span className="text-xs text-[#999999]">
              {format(new Date(entry.dateTime), 'MMM d')}
            </span>
          </div>
          
          <div className="flex items-center space-x-3 mt-1 text-xs text-[#cccccc]">
            {entry.length && (
              <div className="flex items-center space-x-1">
                <FaRuler className="h-3 w-3" />
                <span>{entry.length}"</span>
              </div>
            )}
            {entry.weight && (
              <div className="flex items-center space-x-1">
                <FaWeightScale className="h-3 w-3" />
                <span>{entry.weight} lbs</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3 mt-1 text-xs text-[#999999]">
            <div className="flex items-center space-x-1">
              <FaClock className="h-3 w-3" />
              <span>{format(new Date(entry.dateTime), 'h:mm a')}</span>
            </div>
            {entry.tackle && (
              <span>Tackle: {entry.tackle}</span>
            )}
          </div>
          
          {entry.temperature ? (
            <div className="flex items-center space-x-1 mt-1 text-xs text-[#999999]">
              <FaTemperatureHalf className="h-3 w-3" />
              <span>{entry.temperature}°F</span>
              {entry.weatherCondition && (
                <span>• {entry.weatherCondition}</span>
              )}
            </div>
          ) : (
            <div className="mt-1 text-xs text-[#777777]">Weather data unavailable</div>
          )}
        </div>
      </div>
    </div>
  );
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
              <JournalEntryCard key={entry.id} entry={entry} />
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
