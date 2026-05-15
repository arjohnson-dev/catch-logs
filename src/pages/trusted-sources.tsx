import { FaArrowLeft } from "react-icons/fa6";
import { Button } from "@/components/ui/button";

const TRUSTED_SOURCE_ITEMS = [
  {
    key: "arcgis",
    category: "Mapping & Geospatial",
    name: "ArcGIS Online (Esri)",
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/",
    details:
      "Satellite imagery and labels overlay tiles used by the map interface.",
  },
  {
    key: "openstreetmap",
    category: "Mapping & Geospatial",
    name: "OpenStreetMap Foundation",
    url: "https://www.openstreetmap.org/",
    details: "Basemap tiles and Nominatim geocoding/reverse-geocoding sources.",
  },
  {
    key: "google_places",
    category: "Mapping & Geospatial",
    name: "Google Maps Platform (Places)",
    url: "https://developers.google.com/maps/documentation/places/web-service",
    details:
      "Autocomplete and place details used in weather and resource location search.",
  },
  {
    key: "state_fish_wildlife_agencies",
    category: "Reference Data",
    name: "Official state fish and wildlife agencies",
    url: "https://www.usa.gov/state-governments",
    details:
      "State agency fishing, licensing, and regulation entry points used by resource launchpads.",
  },
  {
    key: "open_meteo",
    category: "Weather Data",
    name: "Open-Meteo",
    url: "https://open-meteo.com/",
    details: "Forecast, archive, and geocoding weather/location APIs.",
  },
  {
    key: "national_weather_service",
    category: "Weather Data",
    name: "National Weather Service",
    url: "https://www.weather.gov/documentation/services-web-api",
    details: "Reference weather source used in approved data guidance.",
  },
  {
    key: "fishbase",
    category: "Reference Data",
    name: "FishBase",
    url: "https://www.fishbase.se",
    details: "Species reference data and hosted species image assets.",
  },
  {
    key: "noaa_fisheries",
    category: "Reference Data",
    name: "NOAA Fisheries",
    url: "https://www.fisheries.noaa.gov",
    details: "Government fisheries reference information.",
  },
  {
    key: "usgs_nas",
    category: "Reference Data",
    name: "USGS Nonindigenous Aquatic Species",
    url: "https://nas.er.usgs.gov",
    details: "Government aquatic species reference information.",
  },
  {
    key: "usfws",
    category: "Reference Data",
    name: "U.S. Fish & Wildlife Service",
    url: "https://www.fws.gov",
    details: "Government wildlife and conservation reference information.",
  },
  {
    key: "supabase",
    category: "Infrastructure",
    name: "Supabase",
    url: "https://supabase.com/",
    details:
      "Authentication, database, storage, and edge-function infrastructure.",
  },
  {
    key: "cdnjs",
    category: "Infrastructure",
    name: "cdnjs (Cloudflare)",
    url: "https://cdnjs.cloudflare.com/",
    details: "CDN-hosted Leaflet marker image assets.",
  },
  {
    key: "flaticon",
    category: "Media Assets",
    name: "Flaticon",
    url: "https://www.flaticon.com/",
    details: "Weather icon assets used in attribution entries.",
  },
  {
    key: "freepik",
    category: "Media Assets",
    name: "Freepik",
    url: "https://www.freepik.com/",
    details: "Source/author attribution for icon assets.",
  },
] as const;

const TRUSTED_SOURCES_BY_CATEGORY = Array.from(
  TRUSTED_SOURCE_ITEMS.reduce((map, source) => {
    const existing = map.get(source.category) ?? [];
    existing.push(source);
    map.set(source.category, existing);
    return map;
  }, new Map<string, Array<(typeof TRUSTED_SOURCE_ITEMS)[number]>>()),
)
  .map(([category, sources]) => ({
    category,
    sources: [...sources].sort((left, right) =>
      left.name.localeCompare(right.name),
    ),
  }))
  .sort((left, right) => left.category.localeCompare(right.category));

export default function TrustedSourcesPage() {
  return (
    <div className="page-scroll">
      <div className="page-content resources-page-content">
        <div className="page-header">
          <Button
            variant="ghost"
            size="sm"
            className="legal-back-button"
            onClick={() => window.history.back()}
          >
            <FaArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="page-title">Trusted Sources</h1>
        </div>

        <div className="resources-stack">
          <p className="settings-meta">
            Every source listed here is vetted for credibility and relevance to
            anglers, and represents the current approved third-party set used by
            CatchLogs, organized by category.
          </p>
          <div className="space-y-6">
            {TRUSTED_SOURCES_BY_CATEGORY.map((group) => (
              <section key={group.category}>
                <h2 className="resources-section-title">{group.category}</h2>
                <div className="resources-category-sources resources-detail-list mt-2">
                  {group.sources.map((source) => (
                    <article
                      key={source.key}
                      className="resources-trusted-source"
                    >
                      <h3 className="resources-trusted-source-title">
                        {source.name}
                      </h3>
                      <p className="resources-trusted-source-description">
                        {source.details}
                      </p>
                      <p className="resources-trusted-source-link-row">
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-link break-all"
                        >
                          {source.url}
                        </a>
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
