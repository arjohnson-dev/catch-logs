import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  FaArrowsUpDownLeftRight,
  FaCalendarDays,
  FaChevronDown,
  FaChevronUp,
  FaClock,
  FaCloud,
  FaCloudRain,
  FaEye,
  FaFilter,
  FaFish,
  FaRuler,
  FaMapLocationDot,
  FaPenToSquare,
  FaSnowflake,
  FaSun,
  FaTemperatureHalf,
  FaTrashCan,
  FaWeightScale,
  FaWind,
  FaArrowLeft,
  FaXmark,
} from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { type JournalEntry } from "@/types/domain";
import { deleteEntryWithPhoto, getEntries } from "@/lib/supabase-data";
import JournalEntryEditor from "@/components/journal-entry-editor";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Helper function to get appropriate weather icon
function getWeatherIcon(condition: string) {
  const lowerCondition = condition.toLowerCase();
  if (lowerCondition.includes("rain")) return FaCloudRain;
  if (lowerCondition.includes("drizzle")) return FaCloudRain;
  if (lowerCondition.includes("snow")) return FaSnowflake;
  if (lowerCondition.includes("cloud")) return FaCloud;
  if (lowerCondition.includes("clear")) return FaSun;
  return FaCloud; // default
}

// Helper function to convert wind direction degrees to compass direction
function getWindDirection(degrees: number | null): string {
  if (degrees === null || degrees === undefined) return "";
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

// Helper function to format visibility
function formatVisibility(meters: number | null): string {
  if (meters === null || meters === undefined) return "";
  if (meters >= 10000) return "10+ km";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters} m`;
}

interface JournalListProps {
  onClose?: () => void;
  onMoveEntryRequest?: (entryId: number) => void;
  onTakeMeThere?: (pinId: number) => void;
  fullScreen?: boolean;
}

export default function JournalList({
  onClose,
  onMoveEntryRequest,
  onTakeMeThere,
  fullScreen = false,
}: JournalListProps) {
  const [, navigate] = useLocation();
  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    navigate("/");
  };
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: entries = [], isLoading } = useQuery<JournalEntry[]>({
    queryKey: ["entries"],
    queryFn: getEntries,
  });
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);

  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: async (entryId: number) => {
      await deleteEntryWithPhoto(entryId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      queryClient.invalidateQueries({ queryKey: ["pins"] });
      toast({
        title: "Entry deleted successfully",
        description: "This cannot be undone.",
      });
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error ? error.message : "Failed to delete entry";
      toast({
        title: "Delete failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  const filteredAndSortedEntries = useMemo(() => {
    let filtered = [...entries];

    // Apply date range filter
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((entry) => new Date(entry.dateTime) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((entry) => new Date(entry.dateTime) <= end);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.dateTime).getTime();
      const dateB = new Date(b.dateTime).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [entries, sortOrder, startDate, endDate]);

  if (isLoading) {
    if (fullScreen) {
      return (
        <div className="page-scroll">
          <div className="page-content journal-page-content">
            <div className="dialog-panel dialog-panel-loading">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-white">Loading journal entries...</p>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="overlay-backdrop overlay-backdrop-dashboard overlay-backdrop-center">
        <div className="dialog-panel dialog-panel-loading">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-white">Loading journal entries...</p>
        </div>
      </div>
    );
  }

  const content = (
    <>
      <div
        className={`dialog-panel ${fullScreen ? "journal-list-page-panel journal-list-page-panel-plain" : "journal-list-panel"}`}
      >
        {/* Header */}
        {!fullScreen && (
          <div className="dialog-header dialog-header-corner">
            <h2 className="text-xl font-medium text-white">
              All Journal Entries
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="btn-ghost-muted dialog-close-corner"
              aria-label="Close all journal entries"
            >
              <FaXmark className="h-5 w-5" />
            </Button>
          </div>
        )}

        {/* Filters */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="border-b border-[#333333] bg-black">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between p-4 text-white hover:bg-[#222222] rounded-none"
              >
                <div className="flex items-center space-x-2">
                  <FaFilter className="h-4 w-4" />
                  <span>Filters</span>
                  {(sortOrder !== "newest" || startDate || endDate) && (
                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                {filtersOpen ? (
                  <FaChevronUp className="h-4 w-4" />
                ) : (
                  <FaChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="p-4 pt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Sort Order */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Sort Order
                    </label>
                    <Select
                      value={sortOrder}
                      onValueChange={(value: "newest" | "oldest") =>
                        setSortOrder(value)
                      }
                    >
                      <SelectTrigger className="field-dark">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="field-dark z-[10000]">
                        <SelectItem
                          value="newest"
                          className="text-white hover:bg-[#333333]"
                        >
                          Newest First
                        </SelectItem>
                        <SelectItem
                          value="oldest"
                          className="text-white hover:bg-[#333333]"
                        >
                          Oldest First
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      From Date
                    </label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="field-dark"
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      To Date
                    </label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="field-dark"
                    />
                  </div>
                </div>

                {/* Clear Filters */}
                {(startDate || endDate || sortOrder !== "newest") && (
                  <div className="mt-4 flex gap-2">
                    {(startDate || endDate) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStartDate("");
                          setEndDate("");
                        }}
                        className="btn-outline-muted"
                      >
                        Clear Date Filter
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSortOrder("newest");
                        setStartDate("");
                        setEndDate("");
                      }}
                      className="btn-outline-muted"
                    >
                      Reset All Filters
                    </Button>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-black">
          {filteredAndSortedEntries.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <FaFish className="h-16 w-16 text-[#666666] mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                {entries.length === 0
                  ? "No journal entries yet"
                  : "No entries match your filters"}
              </h3>
              <p className="text-[#999999]">
                {entries.length === 0
                  ? "Start by dropping a pin on the map and adding your first catch!"
                  : "Try adjusting your date range or clearing filters to see more entries."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAndSortedEntries.map((entry: JournalEntry) => (
                <div
                  key={entry.id}
                  className="surface-card surface-card-hover p-4"
                >
                  <div className="flex items-start space-x-3">
                    {/* Fish Photo */}
                    {entry.photoUrl ? (
                      <img
                        src={entry.photoUrl}
                        alt={`Caught ${entry.fishType}`}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-[#222222] flex items-center justify-center flex-shrink-0">
                        <FaFish className="h-8 w-8 text-[#666666]" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-white">
                          {entry.fishType}
                        </h3>
                        <span className="text-xs text-[#999999]">
                          {format(new Date(entry.dateTime), "MMM dd")}
                        </span>
                      </div>

                      <div className="text-sm text-[#cccccc] mt-1">
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

                      {/* Enhanced Weather Information */}
                      {entry.temperature ||
                      entry.windSpeed ||
                      entry.weatherCondition ||
                      entry.cloudCoverage ||
                      entry.visibility ? (
                        <div className="mt-2">
                          {/* Primary weather row */}
                          <div className="flex items-center space-x-3 text-xs text-[#999999]">
                            {entry.temperature && (
                              <div className="flex items-center space-x-1">
                                <FaTemperatureHalf className="h-3 w-3 text-orange-400" />
                                <span>{entry.temperature}°F</span>
                              </div>
                            )}
                            {entry.windSpeed && (
                              <div className="flex items-center space-x-1">
                                <FaWind className="h-3 w-3 text-blue-400" />
                                <span>{entry.windSpeed} mph</span>
                                {entry.windDirection && (
                                  <span className="text-[#777777]">
                                    ({getWindDirection(entry.windDirection)})
                                  </span>
                                )}
                              </div>
                            )}
                            {entry.weatherCondition && (
                              <div className="flex items-center space-x-1">
                                {(() => {
                                  const WeatherIcon = getWeatherIcon(
                                    entry.weatherCondition,
                                  );
                                  return (
                                    <WeatherIcon className="h-3 w-3 text-gray-400" />
                                  );
                                })()}
                                <span className="capitalize">
                                  {entry.weatherDescription ||
                                    entry.weatherCondition}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Secondary weather details */}
                          {(entry.cloudCoverage !== null ||
                            entry.visibility !== null) && (
                            <div className="flex items-center space-x-3 mt-1 text-xs text-[#777777]">
                              {entry.cloudCoverage !== null && (
                                <div className="flex items-center space-x-1">
                                  <FaCloud className="h-3 w-3" />
                                  <span>{entry.cloudCoverage}% clouds</span>
                                </div>
                              )}
                              {entry.visibility !== null &&
                                entry.visibility < 10000 && (
                                  <div className="flex items-center space-x-1">
                                    <FaEye className="h-3 w-3" />
                                    <span>
                                      {formatVisibility(entry.visibility)} vis
                                    </span>
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-[#777777]">
                          Weather data unavailable
                        </div>
                      )}

                      <div className="flex items-center space-x-2 mt-2">
                        <div className="flex items-center space-x-1">
                          <FaClock className="h-3 w-3 text-[#666666]" />
                          <span className="text-xs text-[#999999]">
                            {format(new Date(entry.dateTime), "h:mm a")}
                          </span>
                        </div>
                        {entry.tackle && (
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-[#999999]">
                              Tackle: {entry.tackle}
                            </span>
                          </div>
                        )}
                      </div>

                      {entry.notes && (
                        <p className="text-sm text-[#cccccc] mt-2 line-clamp-2">
                          {entry.notes}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="btn-outline-info"
                          onClick={() => {
                            handleClose();
                            if (onTakeMeThere) {
                              onTakeMeThere(entry.pinId);
                            } else {
                              navigate(`/?pinId=${entry.pinId}`);
                            }
                          }}
                        >
                          <FaMapLocationDot className="h-3 w-3 mr-1" />
                          Take me there
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="btn-outline-muted"
                          onClick={() => setEditingEntry(entry)}
                        >
                          <FaPenToSquare className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="btn-outline-muted"
                          onClick={() => {
                            handleClose();
                            if (onMoveEntryRequest) {
                              onMoveEntryRequest(entry.id);
                            } else {
                              navigate(`/?moveEntryId=${entry.id}`);
                            }
                          }}
                        >
                          <FaArrowsUpDownLeftRight className="h-3 w-3 mr-1" />
                          Move on map
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const accepted = window.confirm(
                              "Delete this entry and its image permanently?",
                            );
                            if (accepted) {
                              deleteMutation.mutate(entry.id);
                            }
                          }}
                          disabled={deleteMutation.isPending}
                        >
                          <FaTrashCan className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="p-4 border-t border-[#333333] bg-black">
          <div className="flex items-center justify-between text-sm text-[#999999]">
            <span>
              Showing {filteredAndSortedEntries.length} of {entries.length}{" "}
              entries
            </span>
            {(startDate || endDate) && (
              <div className="flex items-center space-x-1">
                <FaCalendarDays className="h-3 w-3" />
                <span>
                  {startDate && endDate
                    ? `${startDate} to ${endDate}`
                    : startDate
                      ? `From ${startDate}`
                      : endDate
                        ? `Until ${endDate}`
                        : ""}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      {editingEntry && (
        <JournalEntryEditor
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onComplete={() => setEditingEntry(null)}
        />
      )}
    </>
  );

  if (fullScreen) {
    return (
      <div className="page-scroll">
        <div className="page-content journal-page-content">
          <div className="page-header">
            <Button
              variant="ghost"
              size="sm"
              className="legal-back-button"
              onClick={handleClose}
            >
              <FaArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="page-title">All Journal Entries</h1>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="overlay-backdrop overlay-backdrop-dashboard">{content}</div>
  );
}
