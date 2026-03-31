/*
 * File:        src/components/journal-entry-form.tsx
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
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FaArrowLeft, FaXmark } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  findFieldGuideSpeciesByName,
  getFieldGuideSpeciesList,
  getMyFavoriteSpecies,
  resolveFieldGuideSpeciesSpecCode,
  UNIDENTIFIED_FIELD_GUIDE_SPEC_CODE,
} from "@/lib/field-guide";
import { getProfileGearDefaults } from "@/lib/profile-gear";
import { invalidateCatchData, appQueryKeys } from "@/lib/query-keys";
import { uploadCatchPhoto } from "@/lib/storage";
import { createEntry, getEntries, getPinById, replaceEntryPhoto, updateEntry } from "@/lib/supabase-data";
import { getWeatherForLocationAndTime } from "@/lib/weather";
import { JournalEntryFields } from "@/features/journal/journal-entry-fields";
import {
  journalEntrySchema,
  type JournalEntryFormValues,
} from "@/features/journal/entry-form-schema";
import { normalizeJournalEntrySubmission } from "@/features/journal/entry-form-payload";
import {
  createJournalEntryDefaultValues,
  createJournalEntryEditValues,
} from "@/features/journal/entry-form-values";
import { readFileAsDataUrl } from "@/features/journal/photo-preview";
import { buildFishTypeSuggestions } from "@/features/journal/species-suggestions";
import { useCameraCapture } from "@/features/journal/use-camera-capture";
import type { JournalEntry } from "@/types/domain";

interface JournalEntryFormProps {
  pinId?: number;
  entry?: JournalEntry;
  defaultLure?: string;
  defaultBait?: string;
  onClose: () => void;
  onComplete: () => void;
  fullScreen?: boolean;
}

type JournalEntrySubmitResult =
  | { mode: "create"; entry: JournalEntry }
  | { mode: "edit" };

function getDefaultValues(input: {
  entry?: JournalEntry;
  defaultLure?: string;
  defaultBait?: string;
}) {
  if (input.entry) {
    return createJournalEntryEditValues(input.entry);
  }

  return createJournalEntryDefaultValues({
    defaultLure: input.defaultLure,
    defaultBait: input.defaultBait,
  });
}

export default function JournalEntryForm({
  pinId,
  entry,
  defaultLure = "",
  defaultBait = "",
  onClose,
  onComplete,
  fullScreen = false,
}: JournalEntryFormProps) {
  const isEditing = Boolean(entry);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(entry?.photoUrl ?? null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [showFishTypeSuggestions, setShowFishTypeSuggestions] = useState(false);
  const [selectedFishSpeciesSpecCode, setSelectedFishSpeciesSpecCode] = useState<number | null>(
    entry?.fishSpeciesSpecCode ?? null,
  );

  const form = useForm<JournalEntryFormValues>({
    resolver: zodResolver(journalEntrySchema),
    defaultValues: getDefaultValues({
      entry,
      defaultLure,
      defaultBait,
    }),
  });

  useEffect(() => {
    form.reset(
      getDefaultValues({
        entry,
        defaultLure,
        defaultBait,
      }),
    );
    setSelectedPhoto(null);
    setPhotoPreview(entry?.photoUrl ?? null);
    setRemovePhoto(false);
    setSelectedFishSpeciesSpecCode(entry?.fishSpeciesSpecCode ?? null);
    setShowFishTypeSuggestions(false);
  }, [defaultBait, defaultLure, entry, form]);

  useEffect(() => {
    if (!user?.id || isEditing) {
      return;
    }

    let cancelled = false;

    void getProfileGearDefaults(user.id)
      .then((gearDefaults) => {
        if (cancelled) {
          return;
        }

        form.setValue("drag", gearDefaults.drag);
        form.setValue("rodLength", gearDefaults.rodLength);
        form.setValue("rodPower", gearDefaults.rodPower);
        form.setValue("rodAction", gearDefaults.rodAction);
        form.setValue("lineType", gearDefaults.lineType);
        form.setValue("lineTest", gearDefaults.lineTest);
        form.setValue("bobberFloat", gearDefaults.bobberFloat);
        form.setValue("weightOz", gearDefaults.weight);
        form.setValue("leaderMaterial", gearDefaults.leaderMaterial);
        form.setValue("leaderLength", gearDefaults.leaderLength);
      })
      .catch(() => {
        // Leave gear empty when defaults are unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [form, isEditing, user?.id]);

  const fishTypeInput = useWatch({
    control: form.control,
    name: "fishType",
  });
  const trimmedFishTypeInput = (fishTypeInput ?? "").trim();

  const { data: entries = [] } = useQuery({
    queryKey: appQueryKeys.entries(),
    queryFn: getEntries,
  });

  const { data: allFieldGuideSpecies = [] } = useQuery({
    queryKey: appQueryKeys.fieldGuideEntryFormSpeciesList("all"),
    queryFn: () => getFieldGuideSpeciesList({ limit: 1000 }),
  });

  const { data: bookmarkedSpecies = [] } = useQuery({
    queryKey: appQueryKeys.fieldGuideFavoriteSpecies(user?.id ?? null),
    queryFn: getMyFavoriteSpecies,
    enabled: Boolean(user?.id),
    staleTime: 1000 * 60 * 5,
  });

  const { data: fieldGuideSpecies = [], isFetching: isFetchingFieldGuideSpecies } = useQuery({
    queryKey: appQueryKeys.fieldGuideEntryFormSpeciesList(trimmedFishTypeInput),
    queryFn: () =>
      getFieldGuideSpeciesList({
        search: trimmedFishTypeInput,
        limit: 25,
      }),
    enabled: trimmedFishTypeInput.length > 0,
  });

  const fishTypeSuggestions = useMemo(
    () =>
      buildFishTypeSuggestions({
        query: trimmedFishTypeInput,
        bookmarkedSpecies,
        fieldGuideSpecies,
        allFieldGuideSpecies,
        entries,
      }),
    [allFieldGuideSpecies, bookmarkedSpecies, entries, fieldGuideSpecies, trimmedFishTypeInput],
  );

  const {
    showCamera,
    videoRef,
    canvasRef,
    startCamera,
    capturePhoto,
    closeCamera,
  } = useCameraCapture({
    onCapture: ({ file, previewUrl }) => {
      setSelectedPhoto(file);
      setPhotoPreview(previewUrl);
      setRemovePhoto(false);
    },
    onError: (message) => {
      toast({
        title: "Camera Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: JournalEntryFormValues): Promise<JournalEntrySubmitResult> => {
      if (!user?.id) {
        throw new Error(
          isEditing ? "You must be logged in to edit entries." : "You must be logged in to save an entry.",
        );
      }

      const normalizedEntry = normalizeJournalEntrySubmission(data);
      const resolvedFishSpeciesSpecCode =
        selectedFishSpeciesSpecCode ??
        findFieldGuideSpeciesByName(bookmarkedSpecies, normalizedEntry.fishType)?.specCode ??
        findFieldGuideSpeciesByName(fieldGuideSpecies, normalizedEntry.fishType)?.specCode ??
        findFieldGuideSpeciesByName(allFieldGuideSpecies, normalizedEntry.fishType)?.specCode ??
        (await resolveFieldGuideSpeciesSpecCode(normalizedEntry.fishType));

      if (entry) {
        let nextPhotoUrl: string | null = entry.photoUrl ?? null;

        if (selectedPhoto) {
          nextPhotoUrl = await uploadCatchPhoto(selectedPhoto, user.id);
        } else if (removePhoto) {
          nextPhotoUrl = null;
        }

        await updateEntry({
          entryId: entry.id,
          fishSpeciesSpecCode:
            resolvedFishSpeciesSpecCode || UNIDENTIFIED_FIELD_GUIDE_SPEC_CODE,
          ...normalizedEntry,
          photoUrl: nextPhotoUrl,
        });

        await replaceEntryPhoto({
          entryId: entry.id,
          nextPhotoUrl,
        });

        return { mode: "edit" };
      }

      if (!pinId) {
        throw new Error("Pin no longer exists. Please drop a new pin.");
      }

      const pin = await getPinById(pinId);
      if (!pin) {
        throw new Error("Pin no longer exists. Please drop a new pin.");
      }

      let photoUrl: string | null = null;
      if (selectedPhoto) {
        photoUrl = await uploadCatchPhoto(selectedPhoto, user.id);
      }

      const weather = await getWeatherForLocationAndTime(
        pin.latitude,
        pin.longitude,
        normalizedEntry.dateTime,
      );

      const createdEntry = await createEntry({
        pinId,
        userId: user.id,
        fishSpeciesSpecCode:
          resolvedFishSpeciesSpecCode || UNIDENTIFIED_FIELD_GUIDE_SPEC_CODE,
        ...normalizedEntry,
        photoUrl,
        temperature: weather?.temperature ?? null,
        pressure: weather?.pressure ?? null,
        precipitationProbability: weather?.precipitationProbability ?? null,
        windSpeed: weather?.windSpeed ?? null,
        windDirection: weather?.windDirection ?? null,
        cloudCoverage: weather?.cloudCoverage ?? null,
        visibility: weather?.visibility ?? null,
        weatherCondition: weather?.weatherCondition ?? null,
        weatherDescription: weather?.weatherDescription ?? null,
      });

      return {
        mode: "create",
        entry: createdEntry,
      };
    },
    onSuccess: async (result) => {
      await invalidateCatchData(queryClient);

      if (result.mode === "edit") {
        toast({
          title: "Entry updated",
          description: "Your journal entry has been updated.",
        });
      } else if (!result.entry.weatherCondition && !result.entry.temperature && !result.entry.windSpeed) {
        toast({
          title: "Saved without weather",
          description: "Could not fetch weather right now, but your catch was saved.",
        });
      }

      onComplete();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : isEditing ? "Failed to update entry" : "Failed to save entry";
      toast({
        title: isEditing ? "Update failed" : "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handlePhotoSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const previewUrl = await readFileAsDataUrl(file);
      setSelectedPhoto(file);
      setPhotoPreview(previewUrl);
      setRemovePhoto(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not preview the selected image.";
      toast({
        title: "Photo unavailable",
        description: message,
        variant: "destructive",
      });
    }
  };

  const handleRemovePhoto = () => {
    setPhotoPreview(null);
    setSelectedPhoto(null);
    setRemovePhoto(Boolean(entry?.photoUrl));
  };

  const fishTypeField = (
    <FormField
      control={form.control}
      name="fishType"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-white">Fish Type</FormLabel>
          <FormControl>
            <Input
              placeholder="Bass"
              className="field-dark"
              autoComplete="off"
              {...field}
              onChange={(event) => {
                setSelectedFishSpeciesSpecCode(null);
                field.onChange(event);
              }}
              onFocus={() => setShowFishTypeSuggestions(true)}
              onBlur={() => {
                window.setTimeout(() => {
                  setShowFishTypeSuggestions(false);
                }, 120);
              }}
            />
          </FormControl>
          {showFishTypeSuggestions && trimmedFishTypeInput.length > 0 && (
            <div className="mt-2 overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#0f0f10] shadow-[0_14px_40px_rgba(0,0,0,0.45)]">
              {isFetchingFieldGuideSpecies && fishTypeSuggestions.length === 0 && (
                <div className="px-3 py-3 text-sm text-white/70">Searching field guide...</div>
              )}
              {fishTypeSuggestions.map((suggestion) => (
                <button
                  key={`${suggestion.source}-${suggestion.value}`}
                  type="button"
                  className="block w-full border-b border-[#1f1f20] px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-[#171719]"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    form.setValue("fishType", suggestion.value, {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    });
                    setSelectedFishSpeciesSpecCode(suggestion.specCode ?? null);
                    setShowFishTypeSuggestions(false);
                  }}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-white">
                        {suggestion.value}
                      </span>
                      {suggestion.subtitle && (
                        <span className="block text-xs text-white/60">{suggestion.subtitle}</span>
                      )}
                    </span>
                    <span
                      className={
                        suggestion.source === "bookmark"
                          ? "rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-amber-100"
                          : suggestion.source === "field-guide"
                            ? "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-200"
                            : "rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-white/60"
                      }
                    >
                      {suggestion.source === "bookmark"
                        ? "Bookmark"
                        : suggestion.source === "field-guide"
                          ? "Field Guide"
                          : "History"}
                    </span>
                  </span>
                </button>
              ))}
              {!isFetchingFieldGuideSpecies && fishTypeSuggestions.length === 0 && (
                <div className="px-3 py-3 text-sm text-white/55">No species matches found.</div>
              )}
            </div>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const pageTitle = isEditing ? "Edit Entry" : "New Catch Entry";
  const closeAriaLabel = isEditing ? "Close edit entry" : "Close new catch entry";
  const submitLabel = mutation.isPending
    ? "Saving..."
    : isEditing
      ? "Save Changes"
      : "Save Catch";

  const formBody = (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => mutation.mutate(data))}
        className={fullScreen ? "entry-page-form" : "dialog-body space-y-6"}
      >
        <div>
          <label className="mb-2 block text-sm font-medium text-white">Fish Photo</label>
          <div className="text-center">
            {showCamera ? (
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-lg border border-[#333333]">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    width="100%"
                    height="300"
                    className="video-preview block h-[300px] w-full"
                  />
                </div>
                <div className="flex justify-center gap-3">
                  <Button type="button" onClick={capturePhoto} className="btn-primary">
                    Capture
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeCamera}
                    className="btn-outline-muted btn-outline-muted-accent"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : photoPreview ? (
              <div className="space-y-4">
                <img
                  src={photoPreview}
                  alt="Selected fish"
                  className="mx-auto h-32 w-32 rounded-lg object-cover"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemovePhoto}
                  className="btn-outline-muted btn-outline-muted-accent"
                >
                  Remove Photo
                </Button>
              </div>
            ) : (
              <div className="flex justify-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={startCamera}
                  className="btn-outline-muted btn-outline-muted-accent"
                >
                  Take Photo
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => uploadInputRef.current?.click()}
                  className="btn-outline-muted btn-outline-muted-accent"
                >
                  Upload
                </Button>
              </div>
            )}
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </div>

        <JournalEntryFields
          form={form}
          fishTypeField={fishTypeField}
          useCollapsibleSections
        />

        <div className="flex space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            className="touch-target btn-outline-muted flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="touch-target btn-primary flex-1"
            disabled={mutation.isPending}
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );

  if (fullScreen) {
    return (
      <div className="page-scroll">
        <div className="page-content entry-page-content">
          <div className="page-header">
            <Button variant="ghost" size="sm" className="legal-back-button" onClick={onClose}>
              <FaArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="page-title">{pageTitle}</h1>
          </div>
          {formBody}
        </div>
      </div>
    );
  }

  return (
    <div className="overlay-backdrop overlay-backdrop-dashboard overlay-backdrop-sheet">
      <div className="dialog-panel dialog-panel-sheet">
        <div className="dialog-header dialog-header-sticky dialog-header-corner">
          <h2 className="dialog-title">{pageTitle}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="btn-ghost-muted dialog-close-corner"
            aria-label={closeAriaLabel}
          >
            <FaXmark className="h-5 w-5" />
          </Button>
        </div>
        {formBody}
      </div>
    </div>
  );
}
