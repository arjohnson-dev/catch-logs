/*
 * File:        src/lib/supabase-data.ts
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
import { getFieldGuideSpeciesPhotoUrlMap, UNIDENTIFIED_FIELD_GUIDE_SPEC_CODE } from "@/lib/field-guide";
import { supabase } from "@/lib/supabase";
import { deleteCatchPhoto, getCatchPhotoStoragePath, resolveCatchPhotoUrl } from "@/lib/storage";
import type { JournalEntry, Pin, PinWithEntries } from "@/types/domain";

type PinRow = {
  id: number;
  user_id: string;
  name: string;
  latitude: number;
  longitude: number;
  created_at: string;
};

type EntryRow = {
  id: number;
  pin_id: number;
  user_id: string;
  fish_type: string;
  fish_species_spec_code: number | null;
  length: number | null;
  weight: number | null;
  lure: string | null;
  bait: string | null;
  tackle_drag: number | null;
  tackle_rod_length: string | null;
  tackle_rod_power: string | null;
  tackle_rod_action: string | null;
  tackle_line_type: string | null;
  tackle_line_test: string | null;
  tackle_bobber_float: string | null;
  tackle_weight_oz: string | null;
  tackle_leader_material: string | null;
  tackle_leader_length: string | null;
  notes: string | null;
  photo_url: string | null;
  date_time: string;
  temperature: number | null;
  wind_speed: number | null;
  wind_direction: number | null;
  cloud_coverage: number | null;
  visibility: number | null;
  weather_condition: string | null;
  weather_description: string | null;
  created_at: string;
};

function mapPin(row: PinRow): Pin {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at,
  };
}

async function mapEntry(row: EntryRow): Promise<JournalEntry> {
  return {
    id: row.id,
    pinId: row.pin_id,
    userId: row.user_id,
    fishType: row.fish_type,
    fishSpeciesSpecCode: row.fish_species_spec_code ?? 1,
    length: row.length,
    weight: row.weight,
    lure: row.lure,
    bait: row.bait,
    drag: row.tackle_drag,
    rodLength: row.tackle_rod_length,
    rodPower: row.tackle_rod_power,
    rodAction: row.tackle_rod_action,
    lineType: row.tackle_line_type,
    lineTest: row.tackle_line_test,
    bobberFloat: row.tackle_bobber_float,
    weightOz: row.tackle_weight_oz,
    leaderMaterial: row.tackle_leader_material,
    leaderLength: row.tackle_leader_length,
    notes: row.notes,
    photoUrl: await resolveCatchPhotoUrl(row.photo_url),
    speciesPhotoUrl: null,
    dateTime: row.date_time,
    temperature: row.temperature,
    windSpeed: row.wind_speed,
    windDirection: row.wind_direction,
    cloudCoverage: row.cloud_coverage,
    visibility: row.visibility,
    weatherCondition: row.weather_condition,
    weatherDescription: row.weather_description,
    createdAt: row.created_at,
  };
}

async function attachSpeciesPhotoFallbacks(entries: JournalEntry[]): Promise<JournalEntry[]> {
  const specCodesNeedingFallback = Array.from(
    new Set(
      entries
        .filter(
          (entry) =>
            !entry.photoUrl &&
            entry.fishSpeciesSpecCode !== UNIDENTIFIED_FIELD_GUIDE_SPEC_CODE,
        )
        .map((entry) => entry.fishSpeciesSpecCode),
    ),
  );

  if (specCodesNeedingFallback.length === 0) {
    return entries;
  }

  const speciesPhotoUrlMap = await getFieldGuideSpeciesPhotoUrlMap(specCodesNeedingFallback);

  return entries.map((entry) => ({
    ...entry,
    speciesPhotoUrl:
      entry.photoUrl || entry.fishSpeciesSpecCode === UNIDENTIFIED_FIELD_GUIDE_SPEC_CODE
        ? null
        : speciesPhotoUrlMap.get(entry.fishSpeciesSpecCode) ?? null,
  }));
}

export async function getPinsWithEntries(): Promise<PinWithEntries[]> {
  const [pinsRes, entriesRes] = await Promise.all([
    supabase
      .from("fishing_pins")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("journal_entries")
      .select("*")
      .order("date_time", { ascending: false }),
  ]);

  if (pinsRes.error) {
    throw pinsRes.error;
  }
  if (entriesRes.error) {
    throw entriesRes.error;
  }

  const pins = (pinsRes.data as PinRow[]).map(mapPin);
  const entries = await attachSpeciesPhotoFallbacks(
    await Promise.all((entriesRes.data as EntryRow[]).map(mapEntry)),
  );

  const entriesByPin = new Map<number, JournalEntry[]>();
  for (const entry of entries) {
    const pinEntries = entriesByPin.get(entry.pinId) ?? [];
    pinEntries.push(entry);
    entriesByPin.set(entry.pinId, pinEntries);
  }

  return pins.map((pin) => ({
    ...pin,
    entries: entriesByPin.get(pin.id) ?? [],
  }));
}

export async function getEntries(): Promise<JournalEntry[]> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .order("date_time", { ascending: false });

  if (error) {
    throw error;
  }

  return attachSpeciesPhotoFallbacks(
    await Promise.all((data as EntryRow[]).map(mapEntry)),
  );
}

export async function createPin(input: {
  userId: string;
  name: string;
  latitude: number;
  longitude: number;
}): Promise<Pin> {
  const { data, error } = await supabase
    .from("fishing_pins")
    .insert({
      user_id: input.userId,
      name: input.name,
      latitude: input.latitude,
      longitude: input.longitude,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return mapPin(data as PinRow);
}

export async function getPinById(pinId: number): Promise<Pin | null> {
  const { data, error } = await supabase
    .from("fishing_pins")
    .select("*")
    .eq("id", pinId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapPin(data as PinRow);
}

export async function deletePin(pinId: number): Promise<void> {
  const { error } = await supabase.from("fishing_pins").delete().eq("id", pinId);
  if (error) {
    throw error;
  }
}

export async function deletePinIfEmpty(pinId: number): Promise<boolean> {
  const { count, error: countError } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("pin_id", pinId);

  if (countError) {
    throw countError;
  }

  if ((count ?? 0) > 0) {
    return false;
  }

  const { error: pinDeleteError } = await supabase
    .from("fishing_pins")
    .delete()
    .eq("id", pinId);

  if (pinDeleteError) {
    throw pinDeleteError;
  }

  return true;
}

export async function createEntry(input: {
  pinId: number;
  userId: string;
  fishType: string;
  fishSpeciesSpecCode: number;
  length?: number | null;
  weight?: number | null;
  lure?: string | null;
  bait?: string | null;
  drag?: number | null;
  rodLength?: string | null;
  rodPower?: string | null;
  rodAction?: string | null;
  lineType?: string | null;
  lineTest?: string | null;
  bobberFloat?: string | null;
  weightOz?: string | null;
  leaderMaterial?: string | null;
  leaderLength?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  dateTime: string;
  temperature?: number | null;
  windSpeed?: number | null;
  windDirection?: number | null;
  cloudCoverage?: number | null;
  visibility?: number | null;
  weatherCondition?: string | null;
  weatherDescription?: string | null;
}): Promise<JournalEntry> {
  const payload = {
    pin_id: input.pinId,
    user_id: input.userId,
    fish_type: input.fishType,
    fish_species_spec_code: input.fishSpeciesSpecCode,
    length: input.length ?? null,
    weight: input.weight ?? null,
    lure: input.lure ?? null,
    bait: input.bait ?? null,
    tackle_drag: input.drag ?? null,
    tackle_rod_length: input.rodLength ?? null,
    tackle_rod_power: input.rodPower ?? null,
    tackle_rod_action: input.rodAction ?? null,
    tackle_line_type: input.lineType ?? null,
    tackle_line_test: input.lineTest ?? null,
    tackle_bobber_float: input.bobberFloat ?? null,
    tackle_weight_oz: input.weightOz ?? null,
    tackle_leader_material: input.leaderMaterial ?? null,
    tackle_leader_length: input.leaderLength ?? null,
    notes: input.notes ?? null,
    photo_url: input.photoUrl ?? null,
    date_time: new Date(input.dateTime).toISOString(),
    temperature: input.temperature ?? null,
    wind_speed: input.windSpeed ?? null,
    wind_direction: input.windDirection ?? null,
    cloud_coverage: input.cloudCoverage ?? null,
    visibility: input.visibility ?? null,
    weather_condition: input.weatherCondition ?? null,
    weather_description: input.weatherDescription ?? null,
  };

  const { data, error } = await supabase
    .from("journal_entries")
    .insert(payload)
    .select()
    .single();

  if (error) {
    const detailParts = [error.message, error.details, error.hint, error.code]
      .filter(Boolean)
      .join(" | ");
    throw new Error(detailParts || "Failed to create journal entry");
  }

  return (await attachSpeciesPhotoFallbacks([await mapEntry(data as EntryRow)]))[0] ?? null;
}

export async function getEntryById(entryId: number): Promise<JournalEntry | null> {
  const { data, error } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("id", entryId)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data) {
    return null;
  }
  return (await attachSpeciesPhotoFallbacks([await mapEntry(data as EntryRow)]))[0];
}

export async function updateEntry(input: {
  entryId: number;
  fishType: string;
  fishSpeciesSpecCode: number;
  length?: number | null;
  weight?: number | null;
  lure?: string | null;
  bait?: string | null;
  drag?: number | null;
  rodLength?: string | null;
  rodPower?: string | null;
  rodAction?: string | null;
  lineType?: string | null;
  lineTest?: string | null;
  bobberFloat?: string | null;
  weightOz?: string | null;
  leaderMaterial?: string | null;
  leaderLength?: string | null;
  notes?: string | null;
  photoUrl?: string | null;
  dateTime: string;
}): Promise<JournalEntry> {
  const payload = {
    fish_type: input.fishType,
    fish_species_spec_code: input.fishSpeciesSpecCode,
    length: input.length ?? null,
    weight: input.weight ?? null,
    lure: input.lure ?? null,
    bait: input.bait ?? null,
    tackle_drag: input.drag ?? null,
    tackle_rod_length: input.rodLength ?? null,
    tackle_rod_power: input.rodPower ?? null,
    tackle_rod_action: input.rodAction ?? null,
    tackle_line_type: input.lineType ?? null,
    tackle_line_test: input.lineTest ?? null,
    tackle_bobber_float: input.bobberFloat ?? null,
    tackle_weight_oz: input.weightOz ?? null,
    tackle_leader_material: input.leaderMaterial ?? null,
    tackle_leader_length: input.leaderLength ?? null,
    notes: input.notes ?? null,
    photo_url: input.photoUrl ?? null,
    date_time: new Date(input.dateTime).toISOString(),
  };

  const { data, error } = await supabase
    .from("journal_entries")
    .update(payload)
    .eq("id", input.entryId)
    .select()
    .single();

  if (error) {
    throw error;
  }
  return (await attachSpeciesPhotoFallbacks([await mapEntry(data as EntryRow)]))[0];
}

export async function deleteEntryWithPhoto(entryId: number): Promise<void> {
  const { data: entryRow, error: fetchError } = await supabase
    .from("journal_entries")
    .select("photo_url,pin_id")
    .eq("id", entryId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  const typedEntryRow = entryRow as { photo_url?: string | null; pin_id?: number | null } | null;
  const photoUrl = typedEntryRow?.photo_url ?? null;
  const pinId = typedEntryRow?.pin_id ?? null;
  if (photoUrl) {
    await deleteCatchPhoto(photoUrl);
  }

  const { error: deleteError } = await supabase
    .from("journal_entries")
    .delete()
    .eq("id", entryId);

  if (deleteError) {
    throw deleteError;
  }

  if (pinId !== null) {
    await deletePinIfEmpty(pinId);
  }
}

export async function moveEntryToNewCoordinates(input: {
  entryId: number;
  userId: string;
  latitude: number;
  longitude: number;
}): Promise<JournalEntry> {
  const { data: currentEntry, error: currentError } = await supabase
    .from("journal_entries")
    .select("pin_id")
    .eq("id", input.entryId)
    .single();

  if (currentError) {
    throw currentError;
  }

  const oldPinId = (currentEntry as { pin_id: number }).pin_id;

  const newPin = await createPin({
    userId: input.userId,
    latitude: input.latitude,
    longitude: input.longitude,
    name: `Location ${new Date().toLocaleDateString()}`,
  });

  const { data, error } = await supabase
    .from("journal_entries")
    .update({ pin_id: newPin.id })
    .eq("id", input.entryId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await deletePinIfEmpty(oldPinId);

  return await mapEntry(data as EntryRow);
}

export async function moveEntryToPin(input: {
  entryId: number;
  targetPinId: number;
}): Promise<JournalEntry> {
  const { data: currentEntry, error: currentError } = await supabase
    .from("journal_entries")
    .select("pin_id")
    .eq("id", input.entryId)
    .single();

  if (currentError) {
    throw currentError;
  }

  const oldPinId = (currentEntry as { pin_id: number }).pin_id;

  const { data, error } = await supabase
    .from("journal_entries")
    .update({ pin_id: input.targetPinId })
    .eq("id", input.entryId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  if (oldPinId !== input.targetPinId) {
    await deletePinIfEmpty(oldPinId);
  }

  return await mapEntry(data as EntryRow);
}

export async function replaceEntryPhoto(input: {
  entryId: number;
  nextPhotoUrl: string | null;
}): Promise<void> {
  const { data: currentRow, error: fetchError } = await supabase
    .from("journal_entries")
    .select("photo_url")
    .eq("id", input.entryId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  const currentPhoto = (currentRow as { photo_url?: string | null } | null)?.photo_url ?? null;
  const currentPath = getCatchPhotoStoragePath(currentPhoto);
  const nextPath = getCatchPhotoStoragePath(input.nextPhotoUrl);
  const shouldDeleteCurrent = currentPath && currentPath !== nextPath;

  const { error: updateError } = await supabase
    .from("journal_entries")
    .update({ photo_url: input.nextPhotoUrl })
    .eq("id", input.entryId);

  if (updateError) {
    throw updateError;
  }

  if (shouldDeleteCurrent && currentPhoto) {
    await deleteCatchPhoto(currentPhoto);
  }
}

export interface StatsOverviewData {
  totalCaught: number;
  personalBest: {
    species: string | null;
    weight: number | null;
    length: number | null;
    dateTime: string | null;
  } | null;
  bestLocation: {
    id: number | null;
    name: string | null;
    latitude: number | null;
    longitude: number | null;
    catches: number;
  } | null;
  speciesBreakdown: Array<{
    species: string;
    count: number;
  }>;
  topLures: Array<{
    name: string;
    count: number;
  }>;
  topBaits: Array<{
    name: string;
    count: number;
  }>;
}

export interface StatsSpeciesDetailData {
  species: string;
  totalCatches: number;
  fieldGuideSpecCode: number | null;
  topLures: Array<{
    name: string;
    count: number;
  }>;
  topBaits: Array<{
    name: string;
    count: number;
  }>;
  conditions: {
    avgTemp: number | null;
    avgWind: number | null;
    commonCondition: string | null;
  } | null;
  monthly: Array<{
    month: string;
    monthIndex: number;
    catches: number;
  }>;
  catchTimes: Array<{
    hour: number;
    catches: number;
  }>;
}

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
}

function toSafeNumber(value: unknown): number {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

export async function getStatsOverview(): Promise<StatsOverviewData> {
  const { data, error } = await supabase.rpc("get_stats_overview");

  if (error) {
    throw error;
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  const personalBestRaw = (payload.personalBest ?? null) as Record<string, unknown> | null;
  const bestLocationRaw = (payload.bestLocation ?? null) as Record<string, unknown> | null;
  const speciesRaw = Array.isArray(payload.speciesBreakdown) ? payload.speciesBreakdown : [];
  const lureRaw = Array.isArray(payload.topLures) ? payload.topLures : [];
  const baitRaw = Array.isArray(payload.topBaits) ? payload.topBaits : [];

  return {
    totalCaught: toSafeNumber(payload.totalCaught),
    personalBest: personalBestRaw
      ? {
          species: typeof personalBestRaw.species === "string" ? personalBestRaw.species : null,
          weight: toNumberOrNull(personalBestRaw.weight),
          length: toNumberOrNull(personalBestRaw.length),
          dateTime:
            typeof personalBestRaw.dateTime === "string" ? personalBestRaw.dateTime : null,
        }
      : null,
    bestLocation: bestLocationRaw
      ? {
          id: toNumberOrNull(bestLocationRaw.id),
          name: typeof bestLocationRaw.name === "string" ? bestLocationRaw.name : null,
          latitude: toNumberOrNull(bestLocationRaw.latitude),
          longitude: toNumberOrNull(bestLocationRaw.longitude),
          catches: toSafeNumber(bestLocationRaw.catches),
        }
      : null,
    speciesBreakdown: speciesRaw
      .map((item) => item as Record<string, unknown>)
      .map((item) => ({
        species: typeof item.species === "string" ? item.species : "Unknown",
        count: toSafeNumber(item.count),
      }))
      .filter((item) => item.count >= 0),
    topLures: lureRaw
      .map((item) => item as Record<string, unknown>)
      .map((item) => ({
        name: typeof item.name === "string" ? item.name : "Unknown",
        count: toSafeNumber(item.count),
      }))
      .filter((item) => item.count > 0),
    topBaits: baitRaw
      .map((item) => item as Record<string, unknown>)
      .map((item) => ({
        name: typeof item.name === "string" ? item.name : "Unknown",
        count: toSafeNumber(item.count),
      }))
      .filter((item) => item.count > 0),
  };
}

export async function getStatsSpeciesDetail(species: string): Promise<StatsSpeciesDetailData> {
  const { data, error } = await supabase.rpc("get_species_stats", { p_species: species });

  if (error) {
    throw error;
  }

  const payload = (data ?? {}) as Record<string, unknown>;
  const conditionsRaw = (payload.conditions ?? null) as Record<string, unknown> | null;
  const lureRaw = Array.isArray(payload.topLures) ? payload.topLures : [];
  const baitRaw = Array.isArray(payload.topBaits) ? payload.topBaits : [];
  const monthlyRaw = Array.isArray(payload.monthly) ? payload.monthly : [];
  const catchTimesRaw = Array.isArray(payload.catchTimes) ? payload.catchTimes : [];

  return {
    species: typeof payload.species === "string" ? payload.species : species,
    totalCatches: toSafeNumber(payload.totalCatches),
    fieldGuideSpecCode: toNumberOrNull(payload.fieldGuideSpecCode),
    topLures: lureRaw
      .map((item) => item as Record<string, unknown>)
      .map((item) => ({
        name: typeof item.name === "string" ? item.name : "Unknown",
        count: toSafeNumber(item.count),
      }))
      .filter((item) => item.count > 0),
    topBaits: baitRaw
      .map((item) => item as Record<string, unknown>)
      .map((item) => ({
        name: typeof item.name === "string" ? item.name : "Unknown",
        count: toSafeNumber(item.count),
      }))
      .filter((item) => item.count > 0),
    conditions: conditionsRaw
      ? {
          avgTemp: toNumberOrNull(conditionsRaw.avgTemp),
          avgWind: toNumberOrNull(conditionsRaw.avgWind),
          commonCondition:
            typeof conditionsRaw.commonCondition === "string"
              ? conditionsRaw.commonCondition
              : null,
        }
      : null,
    monthly: monthlyRaw
      .map((item) => item as Record<string, unknown>)
      .map((item) => ({
        month: typeof item.month === "string" ? item.month : "Jan",
        monthIndex: toSafeNumber(item.monthIndex),
        catches: toSafeNumber(item.catches),
      }))
      .sort((a, b) => a.monthIndex - b.monthIndex),
    catchTimes: catchTimesRaw
      .map((item) => item as Record<string, unknown>)
      .map((item) => ({
        hour: toSafeNumber(item.hour),
        catches: toSafeNumber(item.catches),
      }))
      .filter((item) => item.hour >= 0 && item.hour <= 23),
  };
}
