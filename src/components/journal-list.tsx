import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  FaArrowsUpDownLeftRight,
  FaCalendarDays,
  FaChevronDown,
  FaChevronUp,
  FaFilter,
  FaFish,
  FaMapLocationDot,
  FaPenToSquare,
  FaTrashCan,
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
import JournalEntryCard from "@/components/journal-entry-card";
import { type JournalEntry } from "@/types/domain";
import { deleteEntryWithPhoto, getEntries } from "@/lib/supabase-data";
import JournalEntryEditor from "@/components/journal-entry-editor";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

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
  const [fishTypeFilter, setFishTypeFilter] = useState("");
  const [tackleFilter, setTackleFilter] = useState("");
  const [weatherFilter, setWeatherFilter] = useState("");
  const [minLength, setMinLength] = useState("");
  const [maxLength, setMaxLength] = useState("");
  const [minWeight, setMinWeight] = useState("");
  const [maxWeight, setMaxWeight] = useState("");
  const [pendingSortOrder, setPendingSortOrder] = useState<"newest" | "oldest">("newest");
  const [pendingStartDate, setPendingStartDate] = useState("");
  const [pendingEndDate, setPendingEndDate] = useState("");
  const [pendingFishTypeFilter, setPendingFishTypeFilter] = useState("");
  const [pendingTackleFilter, setPendingTackleFilter] = useState("");
  const [pendingWeatherFilter, setPendingWeatherFilter] = useState("");
  const [pendingMinLength, setPendingMinLength] = useState("");
  const [pendingMaxLength, setPendingMaxLength] = useState("");
  const [pendingMinWeight, setPendingMinWeight] = useState("");
  const [pendingMaxWeight, setPendingMaxWeight] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [timeSortOpen, setTimeSortOpen] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [sizeOpen, setSizeOpen] = useState(false);

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

    const typeTerm = fishTypeFilter.trim().toLowerCase();
    if (typeTerm) {
      filtered = filtered.filter((entry) =>
        entry.fishType.toLowerCase().includes(typeTerm),
      );
    }

    const tackleTerm = tackleFilter.trim().toLowerCase();
    if (tackleTerm) {
      filtered = filtered.filter((entry) =>
        (entry.tackle ?? "").toLowerCase().includes(tackleTerm),
      );
    }

    const weatherTerm = weatherFilter.trim().toLowerCase();
    if (weatherTerm) {
      filtered = filtered.filter((entry) =>
        (
          entry.weatherDescription ??
          entry.weatherCondition ??
          ""
        )
          .toLowerCase()
          .includes(weatherTerm),
      );
    }

    const minLengthValue = minLength.trim() === "" ? null : Number(minLength);
    if (minLengthValue !== null && !Number.isNaN(minLengthValue)) {
      filtered = filtered.filter(
        (entry) =>
          entry.length !== null &&
          entry.length !== undefined &&
          entry.length >= minLengthValue,
      );
    }

    const maxLengthValue = maxLength.trim() === "" ? null : Number(maxLength);
    if (maxLengthValue !== null && !Number.isNaN(maxLengthValue)) {
      filtered = filtered.filter(
        (entry) =>
          entry.length !== null &&
          entry.length !== undefined &&
          entry.length <= maxLengthValue,
      );
    }

    const minWeightValue = minWeight.trim() === "" ? null : Number(minWeight);
    if (minWeightValue !== null && !Number.isNaN(minWeightValue)) {
      filtered = filtered.filter(
        (entry) =>
          entry.weight !== null &&
          entry.weight !== undefined &&
          entry.weight >= minWeightValue,
      );
    }

    const maxWeightValue = maxWeight.trim() === "" ? null : Number(maxWeight);
    if (maxWeightValue !== null && !Number.isNaN(maxWeightValue)) {
      filtered = filtered.filter(
        (entry) =>
          entry.weight !== null &&
          entry.weight !== undefined &&
          entry.weight <= maxWeightValue,
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const dateA = new Date(a.dateTime).getTime();
      const dateB = new Date(b.dateTime).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [
    entries,
    sortOrder,
    startDate,
    endDate,
    fishTypeFilter,
    tackleFilter,
    weatherFilter,
    minLength,
    maxLength,
    minWeight,
    maxWeight,
  ]);

  const hasActiveFilters =
    sortOrder !== "newest" ||
    startDate !== "" ||
    endDate !== "" ||
    fishTypeFilter !== "" ||
    tackleFilter !== "" ||
    weatherFilter !== "" ||
    minLength !== "" ||
    maxLength !== "" ||
    minWeight !== "" ||
    maxWeight !== "";

  const hasPendingChanges =
    pendingSortOrder !== sortOrder ||
    pendingStartDate !== startDate ||
    pendingEndDate !== endDate ||
    pendingFishTypeFilter !== fishTypeFilter ||
    pendingTackleFilter !== tackleFilter ||
    pendingWeatherFilter !== weatherFilter ||
    pendingMinLength !== minLength ||
    pendingMaxLength !== maxLength ||
    pendingMinWeight !== minWeight ||
    pendingMaxWeight !== maxWeight;

  const applyPendingFilters = () => {
    setSortOrder(pendingSortOrder);
    setStartDate(pendingStartDate);
    setEndDate(pendingEndDate);
    setFishTypeFilter(pendingFishTypeFilter);
    setTackleFilter(pendingTackleFilter);
    setWeatherFilter(pendingWeatherFilter);
    setMinLength(pendingMinLength);
    setMaxLength(pendingMaxLength);
    setMinWeight(pendingMinWeight);
    setMaxWeight(pendingMaxWeight);
  };

  const clearAllFilters = () => {
    setSortOrder("newest");
    setStartDate("");
    setEndDate("");
    setFishTypeFilter("");
    setTackleFilter("");
    setWeatherFilter("");
    setMinLength("");
    setMaxLength("");
    setMinWeight("");
    setMaxWeight("");
    setPendingSortOrder("newest");
    setPendingStartDate("");
    setPendingEndDate("");
    setPendingFishTypeFilter("");
    setPendingTackleFilter("");
    setPendingWeatherFilter("");
    setPendingMinLength("");
    setPendingMaxLength("");
    setPendingMinWeight("");
    setPendingMaxWeight("");
  };

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
                  {hasActiveFilters && (
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
                <div className="mb-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="btn-outline-muted"
                    onClick={clearAllFilters}
                  >
                    Clear
                  </Button>
                  <Button
                    size="sm"
                    className="btn-primary"
                    onClick={applyPendingFilters}
                    disabled={!hasPendingChanges}
                  >
                    Apply
                  </Button>
                </div>

                <div className="space-y-3">
                  <Collapsible open={timeSortOpen} onOpenChange={setTimeSortOpen}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full flex items-center justify-between px-3 py-2 text-white hover:bg-[#222222]"
                      >
                        <span className="text-sm">Time & Sort</span>
                        {timeSortOpen ? (
                          <FaChevronUp className="h-4 w-4" />
                        ) : (
                          <FaChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Sort Order
                          </label>
                          <Select
                            value={pendingSortOrder}
                            onValueChange={(value: "newest" | "oldest") =>
                              setPendingSortOrder(value)
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
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            From Date
                          </label>
                          <Input
                            type="date"
                            value={pendingStartDate}
                            onChange={(e) => setPendingStartDate(e.target.value)}
                            className="field-dark"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            To Date
                          </label>
                          <Input
                            type="date"
                            value={pendingEndDate}
                            onChange={(e) => setPendingEndDate(e.target.value)}
                            className="field-dark"
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full flex items-center justify-between px-3 py-2 text-white hover:bg-[#222222]"
                      >
                        <span className="text-sm">Catch Details</span>
                        {detailsOpen ? (
                          <FaChevronUp className="h-4 w-4" />
                        ) : (
                          <FaChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Fish Type
                          </label>
                          <Input
                            placeholder="e.g. Bass"
                            value={pendingFishTypeFilter}
                            onChange={(e) => setPendingFishTypeFilter(e.target.value)}
                            className="field-dark"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Tackle
                          </label>
                          <Input
                            placeholder="e.g. Jig"
                            value={pendingTackleFilter}
                            onChange={(e) => setPendingTackleFilter(e.target.value)}
                            className="field-dark"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Weather Condition
                          </label>
                          <Input
                            placeholder="e.g. Clear, rain, overcast"
                            value={pendingWeatherFilter}
                            onChange={(e) => setPendingWeatherFilter(e.target.value)}
                            className="field-dark"
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>

                  <Collapsible open={sizeOpen} onOpenChange={setSizeOpen}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full flex items-center justify-between px-3 py-2 text-white hover:bg-[#222222]"
                      >
                        <span className="text-sm">Size</span>
                        {sizeOpen ? (
                          <FaChevronUp className="h-4 w-4" />
                        ) : (
                          <FaChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Length Range (in)
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Min"
                              value={pendingMinLength}
                              onChange={(e) => setPendingMinLength(e.target.value)}
                              className="field-dark"
                            />
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Max"
                              value={pendingMaxLength}
                              onChange={(e) => setPendingMaxLength(e.target.value)}
                              className="field-dark"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">
                            Weight Range (lbs)
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Min"
                              value={pendingMinWeight}
                              onChange={(e) => setPendingMinWeight(e.target.value)}
                              className="field-dark"
                            />
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Max"
                              value={pendingMaxWeight}
                              onChange={(e) => setPendingMaxWeight(e.target.value)}
                              className="field-dark"
                            />
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
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
                <JournalEntryCard
                  key={entry.id}
                  entry={entry}
                  actions={[
                    {
                      id: "take-me-there",
                      label: "Take me there",
                      icon: FaMapLocationDot,
                      onClick: () => {
                        handleClose();
                        if (onTakeMeThere) {
                          onTakeMeThere(entry.pinId);
                        } else {
                          navigate(`/?pinId=${entry.pinId}`);
                        }
                      },
                    },
                    {
                      id: "edit",
                      label: "Edit",
                      icon: FaPenToSquare,
                      onClick: () => setEditingEntry(entry),
                    },
                    {
                      id: "move-on-map",
                      label: "Move on map",
                      icon: FaArrowsUpDownLeftRight,
                      onClick: () => {
                        handleClose();
                        if (onMoveEntryRequest) {
                          onMoveEntryRequest(entry.id);
                        } else {
                          navigate(`/?moveEntryId=${entry.id}`);
                        }
                      },
                    },
                    {
                      id: "delete",
                      label: "Delete",
                      icon: FaTrashCan,
                      tone: "danger",
                      disabled: deleteMutation.isPending,
                      onClick: () => {
                        const accepted = window.confirm(
                          "Delete this entry and its image permanently?",
                        );
                        if (accepted) {
                          deleteMutation.mutate(entry.id);
                        }
                      },
                    },
                  ]}
                />
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
