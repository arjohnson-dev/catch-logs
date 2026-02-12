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
  length: number | null;
  weight: number | null;
  tackle: string;
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
    length: row.length,
    weight: row.weight,
    tackle: row.tackle,
    notes: row.notes,
    photoUrl: await resolveCatchPhotoUrl(row.photo_url),
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
  const entries = await Promise.all((entriesRes.data as EntryRow[]).map(mapEntry));

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

  return Promise.all((data as EntryRow[]).map(mapEntry));
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

export async function createEntry(input: {
  pinId: number;
  userId: string;
  fishType: string;
  length?: number;
  weight?: number;
  tackle: string;
  notes?: string;
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
    length: input.length ?? null,
    weight: input.weight ?? null,
    tackle: input.tackle,
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

  return await mapEntry(data as EntryRow);
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
  return await mapEntry(data as EntryRow);
}

export async function updateEntry(input: {
  entryId: number;
  fishType: string;
  length?: number | null;
  weight?: number | null;
  tackle: string;
  notes?: string | null;
  photoUrl?: string | null;
  dateTime: string;
}): Promise<JournalEntry> {
  const payload = {
    fish_type: input.fishType,
    length: input.length ?? null,
    weight: input.weight ?? null,
    tackle: input.tackle,
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
  return await mapEntry(data as EntryRow);
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
    const { count, error: countError } = await supabase
      .from("journal_entries")
      .select("id", { count: "exact", head: true })
      .eq("pin_id", pinId);

    if (countError) {
      throw countError;
    }

    if ((count ?? 0) === 0) {
      const { error: pinDeleteError } = await supabase
        .from("fishing_pins")
        .delete()
        .eq("id", pinId);

      if (pinDeleteError) {
        throw pinDeleteError;
      }
    }
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

  const { count, error: countError } = await supabase
    .from("journal_entries")
    .select("id", { count: "exact", head: true })
    .eq("pin_id", oldPinId);

  if (!countError && (count ?? 0) === 0) {
    await supabase.from("fishing_pins").delete().eq("id", oldPinId);
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
