/*
 * File:        src/lib/map-layers.ts
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
export type MapBaseLayerId =
  | "esri_satellite"
  | "osm_standard";

export interface MapBaseLayerDefinition {
  id: MapBaseLayerId;
  label: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string;
}

export const MAP_BASE_LAYERS: readonly MapBaseLayerDefinition[] = [
  {
    id: "esri_satellite",
    label: "Satellite (Esri)",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    maxZoom: 19,
  },
  {
    id: "osm_standard",
    label: "Standard (OpenStreetMap)",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    subdomains: "abc",
  },
] as const;

export const DEFAULT_MAP_BASE_LAYER: MapBaseLayerId = "esri_satellite";
