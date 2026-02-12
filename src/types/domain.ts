export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface Pin {
  id: number;
  userId?: string;
  name: string;
  latitude: number;
  longitude: number;
  createdAt?: string;
}

export interface JournalEntry {
  id: number;
  pinId: number;
  userId?: string;
  fishType: string;
  length?: number | null;
  weight?: number | null;
  tackle: string;
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
  createdAt?: string;
}

export interface PinWithEntries extends Pin {
  entries: JournalEntry[];
}
