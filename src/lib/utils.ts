/*
 * File:        src/lib/utils.ts
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
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "just now";
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}w ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths}mo ago`;
}

type CatchStatEntry = {
  length?: number | null;
  weight?: number | null;
};

export function formatCatchStats(entries: CatchStatEntry[]) {
  if (entries.length === 0) {
    return {
      totalCatches: 0,
      bestCatch: 0,
      averageWeight: 0,
      averageLength: 0,
    };
  }

  const totalWeight = entries.reduce((sum, entry) => sum + (entry.weight ?? 0), 0);
  const totalLength = entries.reduce((sum, entry) => sum + (entry.length ?? 0), 0);
  const bestCatch = Math.max(...entries.map((entry) => entry.weight ?? 0));

  return {
    totalCatches: entries.length,
    bestCatch,
    averageWeight: totalWeight / entries.length,
    averageLength: totalLength / entries.length,
  };
}
