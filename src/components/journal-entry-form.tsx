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
import { useState, useRef, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FaArrowLeft, FaXmark } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import {
  BOBBER_FLOAT_OPTIONS,
  LEADER_LENGTH_OPTIONS,
  LEADER_MATERIAL_OPTIONS,
  LINE_TEST_OPTIONS,
  LINE_TYPE_OPTIONS,
  ROD_ACTION_OPTIONS,
  ROD_LENGTH_OPTIONS,
  ROD_POWER_OPTIONS,
  normalizeCatchGearDrag,
  normalizeCatchGearText,
} from "@/lib/catch-gear";
import {
  findFieldGuideSpeciesByName,
  getFieldGuideSpeciesList,
  resolveFieldGuideSpeciesSpecCode,
  UNIDENTIFIED_FIELD_GUIDE_SPEC_CODE,
} from "@/lib/field-guide";
import { normalizeFishingGearValue } from "@/lib/fishing-gear";
import { getProfileGearDefaults } from "@/lib/profile-gear";
import { uploadCatchPhoto } from "@/lib/storage";
import { useAuth } from "@/hooks/useAuth";
import { createEntry, getEntries, getPinById } from "@/lib/supabase-data";
import { getWeatherForLocationAndTime } from "@/lib/weather";
import type { FishSpeciesListItem } from "@/types/field-guide";

const entrySchema = z.object({
  fishType: z.string().min(1, "Fish type is required"),
  length: z.number().positive("Length must be greater than 0").optional(),
  weight: z.number().positive("Weight must be greater than 0").optional(),
  lure: z.string().optional(),
  bait: z.string().optional(),
  drag: z.number().min(0).max(1).optional(),
  rodLength: z.string().optional(),
  rodPower: z.string().optional(),
  rodAction: z.string().optional(),
  lineType: z.string().optional(),
  lineTest: z.string().optional(),
  bobberFloat: z.string().optional(),
  weightOz: z.string().optional(),
  leaderMaterial: z.string().optional(),
  leaderLength: z.string().optional(),
  notes: z.string().optional(),
  dateTime: z.string().min(1, "Date and time are required"),
});

type EntryFormData = z.infer<typeof entrySchema>;

interface JournalEntryFormProps {
  pinId: number;
  defaultLure?: string;
  defaultBait?: string;
  onClose: () => void;
  onComplete: () => void;
  fullScreen?: boolean;
}

function normalizeSpeciesSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, " ")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getLevenshteinDistance(left: string, right: string) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previousRow = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 0; leftIndex < left.length; leftIndex += 1) {
    let previousDiagonal = previousRow[0];
    previousRow[0] = leftIndex + 1;

    for (let rightIndex = 0; rightIndex < right.length; rightIndex += 1) {
      const temp = previousRow[rightIndex + 1];
      const substitutionCost = left[leftIndex] === right[rightIndex] ? 0 : 1;

      previousRow[rightIndex + 1] = Math.min(
        previousRow[rightIndex + 1] + 1,
        previousRow[rightIndex] + 1,
        previousDiagonal + substitutionCost,
      );

      previousDiagonal = temp;
    }
  }

  return previousRow[right.length];
}

function getFuzzySpeciesMatchScore(candidate: string, query: string) {
  const normalizedCandidate = normalizeSpeciesSearchText(candidate);
  const normalizedQuery = normalizeSpeciesSearchText(query);

  if (!normalizedCandidate || !normalizedQuery) {
    return 0;
  }

  const candidatePrefix = normalizedCandidate.slice(0, normalizedQuery.length);
  const prefixDistance = getLevenshteinDistance(normalizedQuery, candidatePrefix);
  if (prefixDistance <= 2) {
    return 180 - prefixDistance * 30;
  }

  const candidateWords = normalizedCandidate.split(" ").filter(Boolean);
  for (const word of candidateWords) {
    const wordPrefix = word.slice(0, normalizedQuery.length);
    const wordDistance = getLevenshteinDistance(normalizedQuery, wordPrefix);
    if (wordDistance <= 2) {
      return 150 - wordDistance * 30;
    }
  }

  return 0;
}

function getSpeciesSuggestionValue(species: FishSpeciesListItem) {
  return species.canonicalCommonName ?? species.scientificName;
}

function getSpeciesSuggestionSubtitle(species: FishSpeciesListItem) {
  if (!species.canonicalCommonName) {
    return species.family;
  }

  const subtitleParts = [species.scientificName, species.family].filter(Boolean);
  return subtitleParts.join(" • ");
}

function scoreSpeciesSuggestion(species: FishSpeciesListItem, query: string) {
  const normalizedQuery = normalizeSpeciesSearchText(query);
  if (!normalizedQuery) return 0;

  const commonName = normalizeSpeciesSearchText(species.canonicalCommonName ?? "");
  const scientificName = normalizeSpeciesSearchText(species.scientificName);
  const aliases = species.searchAliases.map(normalizeSpeciesSearchText);
  const alternateNames = species.alternateCommonNames.map(normalizeSpeciesSearchText);
  const family = normalizeSpeciesSearchText(species.family ?? "");

  if (commonName === normalizedQuery) return 520;
  if (scientificName === normalizedQuery) return 500;
  if (aliases.includes(normalizedQuery)) return 460;
  if (alternateNames.includes(normalizedQuery)) return 440;
  if (commonName.startsWith(normalizedQuery)) return 360;
  if (scientificName.startsWith(normalizedQuery)) return 340;
  if (aliases.some((value) => value.startsWith(normalizedQuery))) return 320;
  if (alternateNames.some((value) => value.startsWith(normalizedQuery))) return 300;
  if (commonName.includes(normalizedQuery)) return 260;
  if (scientificName.includes(normalizedQuery)) return 240;
  if (aliases.some((value) => value.includes(normalizedQuery))) return 220;
  if (alternateNames.some((value) => value.includes(normalizedQuery))) return 200;
  if (family.includes(normalizedQuery)) return 120;

  const fuzzyScores = [
    getFuzzySpeciesMatchScore(species.canonicalCommonName ?? "", normalizedQuery),
    getFuzzySpeciesMatchScore(species.scientificName, normalizedQuery),
    ...species.searchAliases.map((value) => getFuzzySpeciesMatchScore(value, normalizedQuery)),
    ...species.alternateCommonNames.map((value) => getFuzzySpeciesMatchScore(value, normalizedQuery)),
  ];

  return Math.max(0, ...fuzzyScores);
}

type FishTypeSuggestion = {
  value: string;
  subtitle: string | null;
  source: "field-guide" | "history";
  score: number;
  matchType?: "common" | "alternate-common" | "alias" | "scientific";
  specCode?: number;
};

export default function JournalEntryForm({
  pinId,
  defaultLure = "",
  defaultBait = "",
  onClose,
  onComplete,
  fullScreen = false,
}: JournalEntryFormProps) {
  const { user } = useAuth();
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showFishTypeSuggestions, setShowFishTypeSuggestions] = useState(false);
  const [selectedFishSpeciesSpecCode, setSelectedFishSpeciesSpecCode] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: entries = [] } = useQuery({
    queryKey: ["entries"],
    queryFn: getEntries,
  });

  const form = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      fishType: "",
      length: undefined,
      weight: undefined,
      lure: defaultLure,
      bait: defaultBait,
      drag: undefined,
      rodLength: "",
      rodPower: "",
      rodAction: "",
      lineType: "",
      lineTest: "",
      bobberFloat: "",
      weightOz: "",
      leaderMaterial: "",
      leaderLength: "",
      notes: "",
      dateTime: (() => {
        const now = new Date();
        // Adjust for timezone offset to get local time
        const localTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
        return localTime.toISOString().slice(0, 16);
      })(),
    },
  });

  useEffect(() => {
    form.setValue("lure", defaultLure);
    form.setValue("bait", defaultBait);
  }, [defaultBait, defaultLure, form]);

  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;
    void getProfileGearDefaults(user.id)
      .then((gearDefaults) => {
        if (cancelled) return;
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
  }, [form, user?.id]);

  const fishTypeInput = useWatch({
    control: form.control,
    name: "fishType",
  });
  const trimmedFishTypeInput = (fishTypeInput ?? "").trim();
  const { data: allFieldGuideSpecies = [] } = useQuery({
    queryKey: ["field-guide", "species-list", "entry-form", "all"],
    queryFn: () => getFieldGuideSpeciesList({ limit: 1000 }),
  });
  const { data: fieldGuideSpecies = [], isFetching: isFetchingFieldGuideSpecies } = useQuery({
    queryKey: ["field-guide", "species-list", "entry-form", trimmedFishTypeInput],
    queryFn: () =>
      getFieldGuideSpeciesList({
        search: trimmedFishTypeInput,
        limit: 25,
      }),
    enabled: trimmedFishTypeInput.length > 0,
  });
  const fishTypeSuggestions = useMemo(() => {
    const normalizedInput = trimmedFishTypeInput;
    if (!normalizedInput) {
      return [];
    }

    const seen = new Set<string>();
    const speciesPool = Array.from(
      new Map(
        [...fieldGuideSpecies, ...allFieldGuideSpecies].map((species) => [species.specCode, species]),
      ).values(),
    );

    const speciesMatches = speciesPool
      .map((species) => ({
        species,
        score: scoreSpeciesSuggestion(species, normalizedInput),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return getSpeciesSuggestionValue(left.species).localeCompare(
          getSpeciesSuggestionValue(right.species),
        );
      })
      .flatMap(({ species, score }) => {
        const subtitle = getSpeciesSuggestionSubtitle(species);
        const candidates = [
          { value: species.canonicalCommonName, matchType: "common" as const, boost: 220 },
          ...species.alternateCommonNames.map((value) => ({
            value,
            matchType: "alternate-common" as const,
            boost: 140,
          })),
          ...species.searchAliases.map((value) => ({
            value,
            matchType: "alias" as const,
            boost: 60,
          })),
          { value: species.scientificName, matchType: "scientific" as const, boost: 20 },
        ].filter(
          (candidate): candidate is { value: string; matchType: "common" | "alternate-common" | "alias" | "scientific"; boost: number } =>
            Boolean(candidate.value && candidate.value.trim().length > 0),
        );

        return candidates.map<FishTypeSuggestion>(({ value, matchType, boost }) => {
          const normalizedValue = normalizeSpeciesSearchText(value);
          const exactBoost = normalizedValue === normalizeSpeciesSearchText(normalizedInput) ? 80 : 0;
          const startsWithBoost = normalizedValue.startsWith(normalizeSpeciesSearchText(normalizedInput)) ? 35 : 0;

          return {
            value,
            subtitle,
            source: "field-guide",
            matchType,
            specCode: species.specCode,
            score: score + boost + exactBoost + startsWithBoost,
          };
        });
      })
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        if ((left.matchType ?? "") !== (right.matchType ?? "")) {
          const matchTypeOrder = {
            common: 0,
            "alternate-common": 1,
            alias: 2,
            scientific: 3,
          } as const;

          return (matchTypeOrder[left.matchType ?? "scientific"] ?? 99) - (matchTypeOrder[right.matchType ?? "scientific"] ?? 99);
        }

        return left.value.localeCompare(right.value);
      })
      .filter((suggestion) => {
        const key = suggestion.value.toLowerCase();
        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      })
      .slice(0, 8);

    const historicalMatches =
      speciesMatches.length === 0
        ? Array.from(
            new Set(
              entries
                .map((entry) => entry.fishType?.trim())
                .filter((fishType): fishType is string => Boolean(fishType && fishType.length > 0)),
            ),
          )
            .filter((fishType) =>
              fishType.toLowerCase().includes(normalizedInput.toLowerCase()) &&
              !seen.has(fishType.toLowerCase()),
            )
            .slice(0, 8)
            .map<FishTypeSuggestion>((fishType) => ({
              value: fishType,
              subtitle: "Recent entry",
              source: "history",
              score: 0,
            }))
        : [];

    return [...speciesMatches, ...historicalMatches];
  }, [allFieldGuideSpecies, entries, fieldGuideSpecies, trimmedFishTypeInput]);

  const createEntryMutation = useMutation({
    mutationFn: async (data: EntryFormData) => {
      if (!user?.id) {
        throw new Error("You must be logged in to save an entry.");
      }

      const resolvedFishSpeciesSpecCode =
        selectedFishSpeciesSpecCode ??
        findFieldGuideSpeciesByName(fieldGuideSpecies, data.fishType)?.specCode ??
        findFieldGuideSpeciesByName(allFieldGuideSpecies, data.fishType)?.specCode ??
        (await resolveFieldGuideSpeciesSpecCode(data.fishType));

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
        data.dateTime,
      );

      return createEntry({
        pinId,
        userId: user.id,
        fishType: data.fishType,
        fishSpeciesSpecCode: resolvedFishSpeciesSpecCode || UNIDENTIFIED_FIELD_GUIDE_SPEC_CODE,
        length: data.length,
        weight: data.weight,
        lure: normalizeFishingGearValue(data.lure),
        bait: normalizeFishingGearValue(data.bait),
        drag: normalizeCatchGearDrag(data.drag),
        rodLength: normalizeCatchGearText(data.rodLength),
        rodPower: normalizeCatchGearText(data.rodPower),
        rodAction: normalizeCatchGearText(data.rodAction),
        lineType: normalizeCatchGearText(data.lineType),
        lineTest: normalizeCatchGearText(data.lineTest),
        bobberFloat: normalizeCatchGearText(data.bobberFloat),
        weightOz: normalizeCatchGearText(data.weightOz),
        leaderMaterial: normalizeCatchGearText(data.leaderMaterial),
        leaderLength: normalizeCatchGearText(data.leaderLength),
        notes: data.notes,
        photoUrl,
        dateTime: data.dateTime,
        temperature: weather?.temperature ?? null,
        windSpeed: weather?.windSpeed ?? null,
        windDirection: weather?.windDirection ?? null,
        cloudCoverage: weather?.cloudCoverage ?? null,
        visibility: weather?.visibility ?? null,
        weatherCondition: weather?.weatherCondition ?? null,
        weatherDescription: weather?.weatherDescription ?? null,
      });
    },
    onSuccess: (entry) => {
      queryClient.invalidateQueries({ queryKey: ["pins"] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      if (
        !entry.weatherCondition &&
        !entry.temperature &&
        !entry.windSpeed
      ) {
        toast({
          title: "Saved without weather",
          description: "Could not fetch weather right now, but your catch was saved.",
        });
      }
      onComplete();
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Failed to save entry";
      toast({
        title: "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleCameraClick = async () => {
    try {
      console.log('Requesting camera access...');
      
      const constraints = {
        video: {
          facingMode: 'environment',
          width: 640,
          height: 480
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('Camera stream obtained:', stream.getVideoTracks()[0].getSettings());
      
      streamRef.current = stream;
      setShowCamera(true);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown camera error";
      console.error('Camera error:', error);
      toast({
        title: "Camera Error",
        description: `Unable to access camera: ${message}`,
        variant: "destructive",
      });
    }
  };

  // Handle video setup when camera state changes
  useEffect(() => {
    if (showCamera && streamRef.current && videoRef.current) {
      console.log('Setting up video element...');
      const video = videoRef.current;
      
      video.srcObject = streamRef.current;
      video.setAttribute('playsinline', 'true');
      video.setAttribute('autoplay', 'true');
      video.setAttribute('muted', 'true');
      
      const playVideo = async () => {
        try {
          await video.play();
          console.log('Video started playing');
        } catch (error) {
          console.error('Play failed:', error);
        }
      };

      if (video.readyState >= 2) {
        playVideo();
      } else {
        video.addEventListener('loadeddata', playVideo, { once: true });
      }
    }
  }, [showCamera]);

  const handleUploadClick = () => {
    uploadInputRef.current?.click();
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current && streamRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      console.log('Capturing photo, video dimensions:', video.videoWidth, video.videoHeight);
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      if (context && video.videoWidth > 0) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-photo.jpg', { type: 'image/jpeg' });
            setSelectedPhoto(file);
            setPhotoPreview(canvas.toDataURL('image/jpeg', 0.7));
            closeCamera();
            console.log('Photo captured successfully');
          }
        }, 'image/jpeg', 0.7);
      } else {
        console.error('Cannot capture: video not ready');
        toast({
          title: "Capture Error",
          description: "Camera not ready. Please wait for video to load.",
          variant: "destructive",
        });
      }
    }
  };

  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };



  const onSubmit = (data: EntryFormData) => {
    createEntryMutation.mutate(data);
  };

  const formBody = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={fullScreen ? "entry-page-form" : "dialog-body space-y-6"}>
            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Fish Photo</label>
              <div className="text-center">
                {showCamera ? (
                  <div className="space-y-4">
                    <div className="relative rounded-lg overflow-hidden border border-[#333333]">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        width="100%"
                        height="300"
                        className="block w-full h-[300px] video-preview"
                        onLoadedData={() => console.log('Video data loaded')}
                        onPlaying={() => console.log('Video is playing')}
                        onError={(e) => console.error('Video error:', e)}
                      />
                    </div>
                    <div className="flex gap-3 justify-center">
                      <Button
                        type="button"
                        onClick={capturePhoto}
                        className="btn-primary"
                      >
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
                      className="w-32 h-32 object-cover rounded-lg mx-auto"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setPhotoPreview(null);
                        setSelectedPhoto(null);
                      }}
                      className="btn-outline-muted btn-outline-muted-accent"
                    >
                      Remove Photo
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-3 justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCameraClick}
                      className="btn-outline-muted btn-outline-muted-accent"
                    >
                      Take Photo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleUploadClick}
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

            {/* Fish Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                <span className="block text-sm font-medium text-white">{suggestion.value}</span>
                                {suggestion.subtitle && (
                                  <span className="block text-xs text-white/60">{suggestion.subtitle}</span>
                                )}
                              </span>
                              <span
                                className={
                                  suggestion.source === "field-guide"
                                    ? "rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-200"
                                    : "rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.08em] text-white/60"
                                }
                              >
                                {suggestion.source === "field-guide" ? "Field Guide" : "History"}
                              </span>
                            </span>
                          </button>
                        ))}
                        {!isFetchingFieldGuideSpecies && fishTypeSuggestions.length === 0 && (
                          <div className="px-3 py-3 text-sm text-white/55">
                            No species matches found.
                          </div>
                        )}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rodLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Rod Length</FormLabel>
                      <FormControl>
                        <select
                          className="field-dark h-10 rounded-md px-3 text-sm"
                          {...field}
                        >
                          <option value="">Select length</option>
                          {ROD_LENGTH_OPTIONS.filter(Boolean).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="rodPower"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Rod Power</FormLabel>
                      <FormControl>
                        <select className="field-dark h-10 rounded-md px-3 text-sm" {...field}>
                          <option value="">Select power</option>
                          {ROD_POWER_OPTIONS.filter(Boolean).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rodAction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Rod Action</FormLabel>
                      <FormControl>
                        <select className="field-dark h-10 rounded-md px-3 text-sm" {...field}>
                          <option value="">Select action</option>
                          {ROD_ACTION_OPTIONS.filter(Boolean).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="drag"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">
                        Drag {typeof field.value === "number" ? `(${field.value.toFixed(2)})` : ""}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          className="field-dark h-10 px-0"
                          value={field.value ?? 0.5}
                          onChange={(e) => field.onChange(Number.parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="lineType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Line Type</FormLabel>
                      <FormControl>
                        <select className="field-dark h-10 rounded-md px-3 text-sm" {...field}>
                          <option value="">Select line type</option>
                          {LINE_TYPE_OPTIONS.filter(Boolean).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lineTest"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Line Test</FormLabel>
                      <FormControl>
                        <select className="field-dark h-10 rounded-md px-3 text-sm" {...field}>
                          <option value="">Select test</option>
                          {LINE_TEST_OPTIONS.filter(Boolean).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="bobberFloat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Bobber/Float</FormLabel>
                      <FormControl>
                        <select className="field-dark h-10 rounded-md px-3 text-sm" {...field}>
                          <option value="">Select bobber/float</option>
                          {BOBBER_FLOAT_OPTIONS.filter(Boolean).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weightOz"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Weight (oz)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="field-dark"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="leaderMaterial"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Leader Material</FormLabel>
                      <FormControl>
                        <select className="field-dark h-10 rounded-md px-3 text-sm" {...field}>
                          <option value="">Select material</option>
                          {LEADER_MATERIAL_OPTIONS.filter(Boolean).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="leaderLength"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Leader Length</FormLabel>
                      <FormControl>
                        <select className="field-dark h-10 rounded-md px-3 text-sm" {...field}>
                          <option value="">Select length</option>
                          {LEADER_LENGTH_OPTIONS.filter(Boolean).map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Lure</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Spinnerbait, jerkbait, jig..."
                        className="field-dark"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bait"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Bait</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Minnow, worm, craw..."
                        className="field-dark"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="length"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Length (inches)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="18.5"
                        className="field-dark"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white">Weight (lbs)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="2.3"
                        className="field-dark"
                        {...field}
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date and Time */}
            <FormField
              control={form.control}
              name="dateTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Date and Time</FormLabel>
                  <FormControl>
                    <Input 
                      type="datetime-local" 
                      className="field-dark"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Describe the catch, location details, fighting behavior..."
                      className="resize-none field-dark"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 touch-target btn-outline-muted"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 touch-target btn-primary"
                disabled={createEntryMutation.isPending}
              >
                {createEntryMutation.isPending ? "Saving..." : "Save Catch"}
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
            <h1 className="page-title">New Catch Entry</h1>
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
          <h2 className="dialog-title">New Catch Entry</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="btn-ghost-muted dialog-close-corner"
            aria-label="Close new catch entry"
          >
            <FaXmark className="h-5 w-5" />
          </Button>
        </div>
        {formBody}
      </div>
    </div>
  );
}
