/*
 * File:        src/types/domain.ts
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
