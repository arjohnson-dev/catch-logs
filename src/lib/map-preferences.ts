/*
 * File:        src/lib/map-preferences.ts
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
import {
  DEFAULT_MAP_BASE_LAYER,
  MAP_BASE_LAYERS,
  type MapBaseLayerId,
} from "@/lib/map-layers";

const MAP_BASE_LAYER_KEY_PREFIX = "catchlogs:map-base-layer:";
const MAP_LABELS_VISIBLE_KEY_PREFIX = "catchlogs:map-labels-visible:";

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function mapBaseLayerKeyForUser(userId: string) {
  return `${MAP_BASE_LAYER_KEY_PREFIX}${userId}`;
}

function mapLabelsVisibleKeyForUser(userId: string) {
  return `${MAP_LABELS_VISIBLE_KEY_PREFIX}${userId}`;
}

function isMapBaseLayerId(value: string): value is MapBaseLayerId {
  return MAP_BASE_LAYERS.some((layer) => layer.id === value);
}

export function loadMapBaseLayerPreference(userId: string): MapBaseLayerId {
  const storage = getStorage();
  if (!storage) return DEFAULT_MAP_BASE_LAYER;
  const raw = storage.getItem(mapBaseLayerKeyForUser(userId));
  if (!raw || !isMapBaseLayerId(raw)) return DEFAULT_MAP_BASE_LAYER;
  return raw;
}

export function saveMapBaseLayerPreference(
  userId: string,
  baseLayer: MapBaseLayerId,
) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(mapBaseLayerKeyForUser(userId), baseLayer);
}

export function loadMapLabelsVisiblePreference(userId: string): boolean {
  const storage = getStorage();
  if (!storage) return true;
  const raw = storage.getItem(mapLabelsVisibleKeyForUser(userId));
  if (raw === null) return true;
  return raw === "1";
}

export function saveMapLabelsVisiblePreference(userId: string, visible: boolean) {
  const storage = getStorage();
  if (!storage) return;
  storage.setItem(mapLabelsVisibleKeyForUser(userId), visible ? "1" : "0");
}
