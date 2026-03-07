/*
 * File:        src/lib/legal/third-party-disclaimer.ts
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
export const THIRD_PARTY_DISCLAIMER_PARAGRAPHS = [
  "Certain features of this application rely on data, services, or functionality provided by third-party providers through external APIs and data sources. We do not create, control, verify, or independently validate all information obtained from these sources.",
  "Accordingly, we make no representations or warranties regarding the accuracy, completeness, reliability, availability, or timeliness of any information provided through third-party services. This includes, but is not limited to, map data, bathymetric data, underwater structures, terrain features, environmental conditions, geographic details, and any other data retrieved from external providers.",
  "Map data may be outdated, incomplete, incorrectly rendered, or may not reflect current real-world conditions. Natural environments, particularly bodies of water, can change over time due to sediment movement, seasonal variation, human activity, weather events, or other factors. Users should not rely solely on map data provided within this application for navigation, safety decisions, fishing location assessment, or any other activity where inaccurate information could result in damage, injury, or loss.",
  "All third-party data and services are provided on an \"as-is\" and \"as-available\" basis. By using this application, you acknowledge that information obtained through third-party APIs or services may contain errors, omissions, or delays, and that the application and its operators disclaim all liability arising from reliance on such information.",
] as const;

export const THIRD_PARTY_PROVIDERS = [
  {
    name: "ArcGIS Online (Esri)",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/",
    details:
      "Satellite basemap (World Imagery) and labels overlay tiles used in the map interface.",
  },
  {
    name: "OpenStreetMap Foundation",
    url: "https://tile.openstreetmap.org/",
    details:
      "Standard basemap tiles used as an optional fallback map layer.",
  },
  {
    name: "Open-Meteo",
    url: "https://open-meteo.com/",
    details:
      "Weather and historical weather data used for environmental conditions.",
  },
  {
    name: "Supabase",
    url: "https://supabase.com/",
    details:
      "Authentication, database, storage, and edge-function APIs used by the application.",
  },
  {
    name: "cdnjs (Cloudflare)",
    url: "https://cdnjs.cloudflare.com/",
    details:
      "CDN-hosted Leaflet marker image assets used in the map interface.",
  },
] as const;
