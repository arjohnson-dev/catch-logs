/*
 * File:        src/components/journal-list.tsx
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
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { Calendar } from "react-date-range";
import {
  FaArrowLeft,
  FaArrowsUpDownLeftRight,
  FaCalendarDays,
  FaChevronDown,
  FaFilter,
  FaFish,
  FaMapLocationDot,
  FaPenToSquare,
  FaTrashCan,
  FaXmark,
} from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import JournalEntryCard from "@/components/journal-entry-card";
import { type JournalEntry } from "@/types/domain";
import { deleteEntryWithPhoto, getEntries } from "@/lib/supabase-data";
import JournalEntryEditor from "@/components/journal-entry-editor";
import { useUnitPreference } from "@/hooks/use-unit-preference";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { appQueryKeys, invalidateCatchData } from "@/lib/query-keys";
import {
  buildFloatFilterValue,
  buildLeaderFilterValue,
  buildLineFilterValue,
  buildRodFilterValue,
  filterJournalEntries,
  type JournalSortOrder,
} from "@/features/journal/filter-journal-entries";

function haveSameSelections(left: string[], right: string[]) {
  if (left.length !== right.length) {
    return false;
  }

  const leftSorted = [...left].sort();
  const rightSorted = [...right].sort();
  return leftSorted.every((value, index) => value === rightSorted[index]);
}

function toggleMultiSelectValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function getMultiSelectSummary(
  values: string[],
  emptyLabel: string,
  singularLabel: string,
) {
  if (values.length === 0) {
    return emptyLabel;
  }

  if (values.length === 1) {
    return values[0];
  }

  return `${values.length} ${singularLabel} selected`;
}

function formatDateRangeSummary(startDate: string, endDate: string) {
  if (!startDate && !endDate) {
    return "Any date";
  }

  if (startDate && endDate) {
    return `${format(parseISO(startDate), "MMM d, yyyy")} - ${format(parseISO(endDate), "MMM d, yyyy")}`;
  }

  if (startDate) {
    return `From ${format(parseISO(startDate), "MMM d, yyyy")}`;
  }

  return `Until ${format(parseISO(endDate), "MMM d, yyyy")}`;
}

function parseFilterNumber(value: string, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatSliderValue(value: number, decimals: number) {
  return Number(value.toFixed(decimals)).toString();
}

function MultiSelectFilter({
  label,
  values,
  options,
  emptyLabel,
  selectionLabel,
  onToggle,
}: {
  label: string;
  values: string[];
  options: string[];
  emptyLabel: string;
  selectionLabel: string;
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-white mb-2">
        {label}
      </label>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="field-dark w-full justify-between font-normal text-sm text-white hover:bg-[#2a2a2a]"
          >
            <span className="truncate">
              {getMultiSelectSummary(values, emptyLabel, selectionLabel)}
            </span>
            <FaChevronDown className="h-4 w-4 shrink-0" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="field-dark z-[10000] w-[var(--radix-dropdown-menu-trigger-width)] min-w-[220px]"
        >
          {options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option}
              checked={values.includes(option)}
              className="text-white hover:bg-[#333333] focus:bg-[#333333]"
              onCheckedChange={() => onToggle(option)}
              onSelect={(event) => event.preventDefault()}
            >
              {option}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function DateRangeCalendar({
  startDate,
  endDate,
  onChange,
}: {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}) {
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const selectedStart = startDate ? parseISO(startDate) : undefined;
  const selectedEnd = endDate ? parseISO(endDate) : undefined;

  const handleStartChange = (nextStartIso: string) => {
    const normalizedEnd =
      endDate && endDate < nextStartIso ? nextStartIso : endDate;
    onChange(nextStartIso, normalizedEnd);
  };

  const handleEndChange = (nextEndIso: string) => {
    const normalizedStart =
      startDate && startDate > nextEndIso ? nextEndIso : startDate;
    onChange(normalizedStart, nextEndIso);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <label className="block text-sm font-medium text-white mb-2">
            Date Range
          </label>
          <p className="text-sm text-[#999999]">
            {formatDateRangeSummary(startDate, endDate)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="btn-outline-muted"
            onClick={() => onChange("", "")}
            disabled={!startDate && !endDate}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="journal-date-range border border-[#333333] bg-[#111111] p-3">
        <div className="journal-date-fields-grid mb-3">
          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1">
              From
            </label>
            <Input
              type="date"
              value={startDate}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) {
                  onChange("", endDate);
                  return;
                }
                handleStartChange(value);
              }}
              className="field-dark"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#9ca3af] mb-1">
              To
            </label>
            <Input
              type="date"
              value={endDate}
              onChange={(event) => {
                const value = event.target.value;
                if (!value) {
                  onChange(startDate, "");
                  return;
                }
                handleEndChange(value);
              }}
              className="field-dark"
            />
          </div>
        </div>

        <div className="journal-date-calendars-grid">
          <div className="journal-date-single-calendar">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-white">From</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="btn-outline-muted"
                  onClick={() => handleStartChange(todayIso)}
                  disabled={startDate === todayIso}
                >
                  Today
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="btn-outline-muted"
                  onClick={() => onChange("", endDate)}
                  disabled={!startDate}
                >
                  Clear
                </Button>
              </div>
            </div>
            <Calendar
              date={selectedStart}
              shownDate={selectedStart ?? new Date()}
              onChange={(nextStartDate) =>
                handleStartChange(format(nextStartDate, "yyyy-MM-dd"))
              }
              color="#2563eb"
              months={1}
              direction="vertical"
              showDateDisplay={false}
              showPreview={false}
              dragSelectionEnabled={false}
            />
          </div>

          <div className="journal-date-single-calendar">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-white">To</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="btn-outline-muted"
                  onClick={() => handleEndChange(todayIso)}
                  disabled={endDate === todayIso}
                >
                  Today
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="btn-outline-muted"
                  onClick={() => onChange(startDate, "")}
                  disabled={!endDate}
                >
                  Clear
                </Button>
              </div>
            </div>
            <Calendar
              date={selectedEnd}
              shownDate={selectedEnd ?? selectedStart ?? new Date()}
              onChange={(nextEndDate) =>
                handleEndChange(format(nextEndDate, "yyyy-MM-dd"))
              }
              color="#2563eb"
              months={1}
              direction="vertical"
              showDateDisplay={false}
              showPreview={false}
              dragSelectionEnabled={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
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
  const [location, navigate] = useLocation();
  const entryRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const clearHighlightTimeoutRef = useRef<number | null>(null);
  const goToPin = (pinId: number) => {
    window.location.assign(`/map?pinId=${pinId}`);
  };
  const goToMoveEntry = (entryId: number) => {
    window.location.assign(`/map?moveEntryId=${entryId}`);
  };
  const handleClose = () => {
    if (onClose) {
      onClose();
      return;
    }
    navigate("/map");
  };
  const queryClient = useQueryClient();
  const { unitSystem } = useUnitPreference();
  const { toast } = useToast();
  const { data: entries = [], isLoading } = useQuery<JournalEntry[]>({
    queryKey: appQueryKeys.entries(),
    queryFn: getEntries,
  });
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [highlightedEntryId, setHighlightedEntryId] = useState<number | null>(
    null,
  );

  const [sortOrder, setSortOrder] = useState<JournalSortOrder>("newest");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fishTypeFilter, setFishTypeFilter] = useState<string[]>([]);
  const [lureFilter, setLureFilter] = useState<string[]>([]);
  const [baitFilter, setBaitFilter] = useState<string[]>([]);
  const [rodFilter, setRodFilter] = useState<string[]>([]);
  const [lineFilter, setLineFilter] = useState<string[]>([]);
  const [floatFilter, setFloatFilter] = useState<string[]>([]);
  const [leaderFilter, setLeaderFilter] = useState<string[]>([]);
  const [minLength, setMinLength] = useState("");
  const [maxLength, setMaxLength] = useState("");
  const [minWeight, setMinWeight] = useState("");
  const [maxWeight, setMaxWeight] = useState("");
  const [pendingStartDate, setPendingStartDate] = useState("");
  const [pendingEndDate, setPendingEndDate] = useState("");
  const [pendingFishTypeFilter, setPendingFishTypeFilter] = useState<string[]>(
    [],
  );
  const [pendingLureFilter, setPendingLureFilter] = useState<string[]>([]);
  const [pendingBaitFilter, setPendingBaitFilter] = useState<string[]>([]);
  const [pendingRodFilter, setPendingRodFilter] = useState<string[]>([]);
  const [pendingLineFilter, setPendingLineFilter] = useState<string[]>([]);
  const [pendingFloatFilter, setPendingFloatFilter] = useState<string[]>([]);
  const [pendingLeaderFilter, setPendingLeaderFilter] = useState<string[]>([]);
  const [pendingMinLength, setPendingMinLength] = useState("");
  const [pendingMaxLength, setPendingMaxLength] = useState("");
  const [pendingMinWeight, setPendingMinWeight] = useState("");
  const [pendingMaxWeight, setPendingMaxWeight] = useState("");
  const normalizedPath =
    location.split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  const isFiltersView = normalizedPath === "/journal/filters";
  const focusedEntryId = useMemo(() => {
    const queryStart = location.indexOf("?");
    const search =
      queryStart >= 0 ? location.slice(queryStart) : window.location.search;
    const entryIdParam = new URLSearchParams(search).get("entryId");
    if (!entryIdParam) return null;
    const parsed = Number.parseInt(entryIdParam, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, [location]);

  const fishTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(
          entries
            .map((entry) => entry.fishType?.trim() ?? "")
            .filter((value) => value.length > 0),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [entries],
  );

  const lureOptions = useMemo(
    () =>
      Array.from(
        new Set(
          entries
            .map((entry) => entry.lure?.trim() ?? "")
            .filter((value) => value.length > 0),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [entries],
  );

  const baitOptions = useMemo(
    () =>
      Array.from(
        new Set(
          entries
            .map((entry) => entry.bait?.trim() ?? "")
            .filter((value) => value.length > 0),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [entries],
  );

  const rodOptions = useMemo(
    () =>
      Array.from(
        new Set(
          entries
            .map((entry) => buildRodFilterValue(entry))
            .filter((value) => value.length > 0),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [entries],
  );

  const lineOptions = useMemo(
    () =>
      Array.from(
        new Set(
          entries
            .map((entry) => buildLineFilterValue(entry))
            .filter((value) => value.length > 0),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [entries],
  );

  const floatOptions = useMemo(
    () =>
      Array.from(
        new Set(
          entries
            .map((entry) => buildFloatFilterValue(entry))
            .filter((value) => value.length > 0),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [entries],
  );

  const leaderOptions = useMemo(
    () =>
      Array.from(
        new Set(
          entries
            .map((entry) => buildLeaderFilterValue(entry))
            .filter((value) => value.length > 0),
        ),
      ).sort((left, right) => left.localeCompare(right)),
    [entries],
  );

  const maxLengthBound = useMemo(() => {
    const maxLengthValue = entries.reduce((currentMax, entry) => {
      if (entry.length === null || entry.length === undefined) {
        return currentMax;
      }

      return Math.max(currentMax, entry.length);
    }, 0);

    return Math.max(30, Math.ceil(maxLengthValue));
  }, [entries]);

  const maxWeightBound = useMemo(() => {
    const maxWeightValue = entries.reduce((currentMax, entry) => {
      if (entry.weight === null || entry.weight === undefined) {
        return currentMax;
      }

      return Math.max(currentMax, entry.weight);
    }, 0);

    return Math.max(20, Math.ceil(maxWeightValue * 100) / 100);
  }, [entries]);

  const lengthScale = unitSystem === "metric" ? 2.54 : 1;
  const weightScale = unitSystem === "metric" ? 0.45359237 : 1;
  const lengthUnitLabel = unitSystem === "metric" ? "cm" : "in";
  const weightUnitLabel = unitSystem === "metric" ? "kg" : "lbs";
  const lengthStep = unitSystem === "metric" ? 0.1 : 0.1;
  const weightStep = unitSystem === "metric" ? 0.01 : 0.01;
  const maxLengthDisplayBound = maxLengthBound * lengthScale;
  const maxWeightDisplayBound = maxWeightBound * weightScale;

  const deleteMutation = useMutation({
    mutationFn: async (entryId: number) => {
      await deleteEntryWithPhoto(entryId);
    },
    onSuccess: async () => {
      await invalidateCatchData(queryClient);
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
    return filterJournalEntries(entries, {
      sortOrder,
      startDate,
      endDate,
      fishType: fishTypeFilter,
      lure: lureFilter,
      bait: baitFilter,
      rod: rodFilter,
      line: lineFilter,
      float: floatFilter,
      leader: leaderFilter,
      minLength,
      maxLength,
      minWeight,
      maxWeight,
    });
  }, [
    entries,
    sortOrder,
    startDate,
    endDate,
    fishTypeFilter,
    lureFilter,
    baitFilter,
    rodFilter,
    lineFilter,
    floatFilter,
    leaderFilter,
    minLength,
    maxLength,
    minWeight,
    maxWeight,
  ]);

  const hasActiveFilters =
    startDate !== "" ||
    endDate !== "" ||
    fishTypeFilter.length > 0 ||
    lureFilter.length > 0 ||
    baitFilter.length > 0 ||
    rodFilter.length > 0 ||
    lineFilter.length > 0 ||
    floatFilter.length > 0 ||
    leaderFilter.length > 0 ||
    minLength !== "" ||
    maxLength !== "" ||
    minWeight !== "" ||
    maxWeight !== "";

  const hasPendingChanges =
    pendingStartDate !== startDate ||
    pendingEndDate !== endDate ||
    !haveSameSelections(pendingFishTypeFilter, fishTypeFilter) ||
    !haveSameSelections(pendingLureFilter, lureFilter) ||
    !haveSameSelections(pendingBaitFilter, baitFilter) ||
    !haveSameSelections(pendingRodFilter, rodFilter) ||
    !haveSameSelections(pendingLineFilter, lineFilter) ||
    !haveSameSelections(pendingFloatFilter, floatFilter) ||
    !haveSameSelections(pendingLeaderFilter, leaderFilter) ||
    pendingMinLength !== minLength ||
    pendingMaxLength !== maxLength ||
    pendingMinWeight !== minWeight ||
    pendingMaxWeight !== maxWeight;

  const applyPendingFilters = () => {
    setStartDate(pendingStartDate);
    setEndDate(pendingEndDate);
    setFishTypeFilter([...pendingFishTypeFilter]);
    setLureFilter([...pendingLureFilter]);
    setBaitFilter([...pendingBaitFilter]);
    setRodFilter([...pendingRodFilter]);
    setLineFilter([...pendingLineFilter]);
    setFloatFilter([...pendingFloatFilter]);
    setLeaderFilter([...pendingLeaderFilter]);
    setMinLength(pendingMinLength);
    setMaxLength(pendingMaxLength);
    setMinWeight(pendingMinWeight);
    setMaxWeight(pendingMaxWeight);
    navigate("/journal");
  };

  const clearAllFilters = () => {
    setStartDate("");
    setEndDate("");
    setFishTypeFilter([]);
    setLureFilter([]);
    setBaitFilter([]);
    setRodFilter([]);
    setLineFilter([]);
    setFloatFilter([]);
    setLeaderFilter([]);
    setMinLength("");
    setMaxLength("");
    setMinWeight("");
    setMaxWeight("");
    setPendingStartDate("");
    setPendingEndDate("");
    setPendingFishTypeFilter([]);
    setPendingLureFilter([]);
    setPendingBaitFilter([]);
    setPendingRodFilter([]);
    setPendingLineFilter([]);
    setPendingFloatFilter([]);
    setPendingLeaderFilter([]);
    setPendingMinLength("");
    setPendingMaxLength("");
    setPendingMinWeight("");
    setPendingMaxWeight("");
  };

  useEffect(() => {
    if (clearHighlightTimeoutRef.current !== null) {
      window.clearTimeout(clearHighlightTimeoutRef.current);
      clearHighlightTimeoutRef.current = null;
    }

    if (!focusedEntryId) {
      clearHighlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightedEntryId(null);
        clearHighlightTimeoutRef.current = null;
      }, 0);
      return;
    }

    const targetEntryExists = filteredAndSortedEntries.some(
      (entry) => entry.id === focusedEntryId,
    );

    if (!targetEntryExists) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const target = entryRefs.current[focusedEntryId];
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedEntryId(focusedEntryId);
    }, 80);

    return () => {
      window.clearTimeout(timeoutId);
      if (clearHighlightTimeoutRef.current !== null) {
        window.clearTimeout(clearHighlightTimeoutRef.current);
        clearHighlightTimeoutRef.current = null;
      }
    };
  }, [focusedEntryId, filteredAndSortedEntries]);

  useEffect(() => {
    if (highlightedEntryId === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHighlightedEntryId((current) =>
        current === highlightedEntryId ? null : current,
      );
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [highlightedEntryId]);

  if (isLoading) {
    if (fullScreen) {
      return (
        <div className="page-scroll">
          <div className="page-content journal-page-content">
            <div className="dialog-panel dialog-panel-loading">
              <div className="loading-spinner animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-white">Loading journal entries...</p>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="overlay-backdrop overlay-backdrop-dashboard overlay-backdrop-center">
        <div className="dialog-panel dialog-panel-loading">
          <div className="loading-spinner animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-white">Loading journal entries...</p>
        </div>
      </div>
    );
  }

  const content = (
    <>
      <div
        className={
          fullScreen
            ? "journal-list-page-panel journal-list-page-panel-plain"
            : "dialog-panel journal-list-panel"
        }
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

        {isFiltersView ? (
          <div
            className={`flex-1 flex flex-col ${fullScreen ? "bg-transparent" : "bg-black"}`}
          >
            <div
              className={`border-b ${fullScreen ? "border-border/60 bg-transparent" : "border-[#333333] bg-black"}`}
            >
              <div className="p-4 flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  className="btn-ghost-muted"
                  onClick={() => navigate("/journal")}
                >
                  <FaArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <h2 className="text-base font-medium text-white flex-1">
                  Filters
                </h2>
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
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-white mb-3">
                    Catch Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <MultiSelectFilter
                      label="Species"
                      values={pendingFishTypeFilter}
                      options={fishTypeOptions}
                      emptyLabel="Any species"
                      selectionLabel="species"
                      onToggle={(value) =>
                        setPendingFishTypeFilter((current) =>
                          toggleMultiSelectValue(current, value),
                        )
                      }
                    />
                    <MultiSelectFilter
                      label="Lure"
                      values={pendingLureFilter}
                      options={lureOptions}
                      emptyLabel="Any lure"
                      selectionLabel="lures"
                      onToggle={(value) =>
                        setPendingLureFilter((current) =>
                          toggleMultiSelectValue(current, value),
                        )
                      }
                    />
                    <MultiSelectFilter
                      label="Bait"
                      values={pendingBaitFilter}
                      options={baitOptions}
                      emptyLabel="Any bait"
                      selectionLabel="baits"
                      onToggle={(value) =>
                        setPendingBaitFilter((current) =>
                          toggleMultiSelectValue(current, value),
                        )
                      }
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <MultiSelectFilter
                      label="Rod"
                      values={pendingRodFilter}
                      options={rodOptions}
                      emptyLabel="Any rod"
                      selectionLabel="rods"
                      onToggle={(value) =>
                        setPendingRodFilter((current) =>
                          toggleMultiSelectValue(current, value),
                        )
                      }
                    />
                    <MultiSelectFilter
                      label="Line"
                      values={pendingLineFilter}
                      options={lineOptions}
                      emptyLabel="Any line"
                      selectionLabel="lines"
                      onToggle={(value) =>
                        setPendingLineFilter((current) =>
                          toggleMultiSelectValue(current, value),
                        )
                      }
                    />
                    <MultiSelectFilter
                      label="Float"
                      values={pendingFloatFilter}
                      options={floatOptions}
                      emptyLabel="Any float"
                      selectionLabel="floats"
                      onToggle={(value) =>
                        setPendingFloatFilter((current) =>
                          toggleMultiSelectValue(current, value),
                        )
                      }
                    />
                    <MultiSelectFilter
                      label="Leader"
                      values={pendingLeaderFilter}
                      options={leaderOptions}
                      emptyLabel="Any leader"
                      selectionLabel="leaders"
                      onToggle={(value) =>
                        setPendingLeaderFilter((current) =>
                          toggleMultiSelectValue(current, value),
                        )
                      }
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-white mb-3">Size</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Length Range ({lengthUnitLabel})
                      </label>
                      <div className="space-y-3 rounded-md border border-[#2a2a2a] bg-[#141414] p-3">
                        <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                          <span>
                            Min{" "}
                            {(
                              parseFilterNumber(pendingMinLength, 0) *
                              lengthScale
                            ).toFixed(1)}{" "}
                            {lengthUnitLabel}
                          </span>
                          <span>
                            Max{" "}
                            {(
                              parseFilterNumber(
                                pendingMaxLength,
                                maxLengthBound,
                              ) * lengthScale
                            ).toFixed(1)}{" "}
                            {lengthUnitLabel}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={maxLengthDisplayBound}
                            step={lengthStep}
                            placeholder="Min"
                            value={
                              pendingMinLength === ""
                                ? ""
                                : formatSliderValue(
                                    parseFilterNumber(pendingMinLength, 0) *
                                      lengthScale,
                                    1,
                                  )
                            }
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              if (nextValue === "") {
                                setPendingMinLength("");
                                return;
                              }

                              const parsed = Number(nextValue);
                              if (!Number.isFinite(parsed)) {
                                return;
                              }

                              const currentMax =
                                parseFilterNumber(
                                  pendingMaxLength,
                                  maxLengthBound,
                                ) * lengthScale;
                              const normalized = Math.min(
                                Math.max(parsed, 0),
                                currentMax,
                              );
                              setPendingMinLength(
                                formatSliderValue(normalized / lengthScale, 2),
                              );
                            }}
                            className="field-dark"
                          />
                          <Input
                            type="number"
                            min={0}
                            max={maxLengthDisplayBound}
                            step={lengthStep}
                            placeholder="Max"
                            value={
                              pendingMaxLength === ""
                                ? ""
                                : formatSliderValue(
                                    parseFilterNumber(
                                      pendingMaxLength,
                                      maxLengthBound,
                                    ) * lengthScale,
                                    1,
                                  )
                            }
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              if (nextValue === "") {
                                setPendingMaxLength("");
                                return;
                              }

                              const parsed = Number(nextValue);
                              if (!Number.isFinite(parsed)) {
                                return;
                              }

                              const currentMin =
                                parseFilterNumber(pendingMinLength, 0) *
                                lengthScale;
                              const normalized = Math.max(
                                Math.min(parsed, maxLengthDisplayBound),
                                currentMin,
                              );
                              setPendingMaxLength(
                                formatSliderValue(normalized / lengthScale, 2),
                              );
                            }}
                            className="field-dark"
                          />
                        </div>
                        <Slider
                          min={0}
                          max={maxLengthDisplayBound}
                          step={lengthStep}
                          value={[
                            parseFilterNumber(pendingMinLength, 0) *
                              lengthScale,
                            parseFilterNumber(
                              pendingMaxLength,
                              maxLengthBound,
                            ) * lengthScale,
                          ]}
                          onValueChange={(value) => {
                            const [nextMin, nextMax] = value;
                            setPendingMinLength(
                              formatSliderValue(nextMin / lengthScale, 2),
                            );
                            setPendingMaxLength(
                              formatSliderValue(nextMax / lengthScale, 2),
                            );
                          }}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Weight Range ({weightUnitLabel})
                      </label>
                      <div className="space-y-3 rounded-md border border-[#2a2a2a] bg-[#141414] p-3">
                        <div className="flex items-center justify-between text-xs text-[#9ca3af]">
                          <span>
                            Min{" "}
                            {(
                              parseFilterNumber(pendingMinWeight, 0) *
                              weightScale
                            ).toFixed(2)}{" "}
                            {weightUnitLabel}
                          </span>
                          <span>
                            Max{" "}
                            {(
                              parseFilterNumber(
                                pendingMaxWeight,
                                maxWeightBound,
                              ) * weightScale
                            ).toFixed(2)}{" "}
                            {weightUnitLabel}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            min={0}
                            max={maxWeightDisplayBound}
                            step={weightStep}
                            placeholder="Min"
                            value={
                              pendingMinWeight === ""
                                ? ""
                                : formatSliderValue(
                                    parseFilterNumber(pendingMinWeight, 0) *
                                      weightScale,
                                    2,
                                  )
                            }
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              if (nextValue === "") {
                                setPendingMinWeight("");
                                return;
                              }

                              const parsed = Number(nextValue);
                              if (!Number.isFinite(parsed)) {
                                return;
                              }

                              const currentMax =
                                parseFilterNumber(
                                  pendingMaxWeight,
                                  maxWeightBound,
                                ) * weightScale;
                              const normalized = Math.min(
                                Math.max(parsed, 0),
                                currentMax,
                              );
                              setPendingMinWeight(
                                formatSliderValue(normalized / weightScale, 3),
                              );
                            }}
                            className="field-dark"
                          />
                          <Input
                            type="number"
                            min={0}
                            max={maxWeightDisplayBound}
                            step={weightStep}
                            placeholder="Max"
                            value={
                              pendingMaxWeight === ""
                                ? ""
                                : formatSliderValue(
                                    parseFilterNumber(
                                      pendingMaxWeight,
                                      maxWeightBound,
                                    ) * weightScale,
                                    2,
                                  )
                            }
                            onChange={(event) => {
                              const nextValue = event.target.value;
                              if (nextValue === "") {
                                setPendingMaxWeight("");
                                return;
                              }

                              const parsed = Number(nextValue);
                              if (!Number.isFinite(parsed)) {
                                return;
                              }

                              const currentMin =
                                parseFilterNumber(pendingMinWeight, 0) *
                                weightScale;
                              const normalized = Math.max(
                                Math.min(parsed, maxWeightDisplayBound),
                                currentMin,
                              );
                              setPendingMaxWeight(
                                formatSliderValue(normalized / weightScale, 3),
                              );
                            }}
                            className="field-dark"
                          />
                        </div>
                        <Slider
                          min={0}
                          max={maxWeightDisplayBound}
                          step={weightStep}
                          value={[
                            parseFilterNumber(pendingMinWeight, 0) *
                              weightScale,
                            parseFilterNumber(
                              pendingMaxWeight,
                              maxWeightBound,
                            ) * weightScale,
                          ]}
                          onValueChange={(value) => {
                            const [nextMin, nextMax] = value;
                            setPendingMinWeight(
                              formatSliderValue(nextMin / weightScale, 3),
                            );
                            setPendingMaxWeight(
                              formatSliderValue(nextMax / weightScale, 3),
                            );
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <DateRangeCalendar
                    startDate={pendingStartDate}
                    endDate={pendingEndDate}
                    onChange={(start, end) => {
                      setPendingStartDate(start);
                      setPendingEndDate(end);
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`border-b ${fullScreen ? "border-border/60 bg-transparent" : "border-[#333333] bg-black"}`}
          >
            <div className="p-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="w-full md:max-w-[260px]">
                <label className="block text-sm font-medium text-white mb-2">
                  Sort Order
                </label>
                <Select
                  value={sortOrder}
                  onValueChange={(value: JournalSortOrder) =>
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
                    <SelectItem
                      value="length-asc"
                      className="text-white hover:bg-[#333333]"
                    >
                      Length: Shortest First
                    </SelectItem>
                    <SelectItem
                      value="length-desc"
                      className="text-white hover:bg-[#333333]"
                    >
                      Length: Longest First
                    </SelectItem>
                    <SelectItem
                      value="weight-asc"
                      className="text-white hover:bg-[#333333]"
                    >
                      Weight: Lightest First
                    </SelectItem>
                    <SelectItem
                      value="weight-desc"
                      className="text-white hover:bg-[#333333]"
                    >
                      Weight: Heaviest First
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                className="btn-outline-muted journal-filters-button"
                onClick={() => navigate("/journal/filters")}
              >
                <FaFilter className="h-4 w-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <span className="journal-filters-badge">Active</span>
                )}
              </Button>
            </div>
          </div>
        )}

        {!isFiltersView && (
          <>
            {/* Content */}
            <div
              className={`flex-1 overflow-y-auto p-4 ${fullScreen ? "bg-transparent" : "bg-black"}`}
            >
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
                <div className="grid grid-cols-1 gap-4">
                  {filteredAndSortedEntries.map((entry: JournalEntry) => (
                    <div
                      key={entry.id}
                      ref={(node) => {
                        entryRefs.current[entry.id] = node;
                      }}
                      id={`journal-entry-${entry.id}`}
                      className={cn(
                        highlightedEntryId === entry.id &&
                          "journal-entry-focus",
                      )}
                    >
                      <JournalEntryCard
                        entry={entry}
                        onViewFieldGuide={(path) => navigate(path)}
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
                                goToPin(entry.pinId);
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
                                goToMoveEntry(entry.id);
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
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Results Summary */}
            <div
              className={`p-4 border-t ${fullScreen ? "border-border/60 bg-transparent" : "border-[#333333] bg-black"}`}
            >
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
          </>
        )}
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
            <h1 className="page-title">Journal</h1>
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
