import { Link } from "wouter";
import {
  FaArrowLeft,
  FaBookOpen,
  FaFishFins,
  FaLandmark,
  FaShieldHalved,
} from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TRUSTED_SOURCE_ITEMS = [
  {
    key: "fishbase",
    name: "FishBase",
    type: "Reference",
    domain: "fishbase.se",
    baseUrl: "https://www.fishbase.se",
    icon: FaFishFins,
  },
  {
    key: "noaa_fisheries",
    name: "NOAA Fisheries",
    type: "Government",
    domain: "fisheries.noaa.gov",
    baseUrl: "https://www.fisheries.noaa.gov",
    icon: FaLandmark,
  },
  {
    key: "usgs_nas",
    name: "USGS Nonindigenous Aquatic Species",
    type: "Government",
    domain: "nas.er.usgs.gov",
    baseUrl: "https://nas.er.usgs.gov",
    icon: FaLandmark,
  },
  {
    key: "usfws",
    name: "U.S. Fish & Wildlife Service",
    type: "Government",
    domain: "fws.gov",
    baseUrl: "https://www.fws.gov",
    icon: FaShieldHalved,
  },
] as const;

export default function TrustedSourcesPage() {
  return (
    <div className="page-scroll">
      <div className="page-content resources-page-content">
        <div className="page-header">
          <Link to="/resources">
            <Button variant="ghost" size="sm" className="legal-back-button">
              <FaArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="page-title">Trusted Sources</h1>
        </div>

        <div className="resources-stack">
          <Card className="resources-card resources-hero-card surface-card">
            <CardContent className="resources-hero-content">
              <div className="resources-hero-icon">
                <FaBookOpen size={28} />
              </div>
              <div>
                <p className="resources-eyebrow">CatchLogs Sources</p>
                <h2 className="resources-hero-title">Approved source whitelist</h2>
                <p className="resources-hero-copy">
                  CatchLogs relies on hand-picked, curated external sources across the
                  application. We selected these sources because they are broadly trusted,
                  stable, and intended to provide objective reference information.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="resources-card surface-card">
            <CardHeader className="pb-3">
              <CardTitle className="resources-section-title">Current approved sources</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="resources-detail-list">
                {TRUSTED_SOURCE_ITEMS.map((source) => {
                  const Icon = source.icon;

                  return (
                    <div key={source.key} className="resources-trusted-source">
                      <div className="resources-trusted-source-heading">
                        <div className="resources-trusted-source-icon">
                          <Icon size={18} />
                        </div>
                        <div className="resources-trusted-source-copy">
                          <h3 className="resources-trusted-source-title">{source.name}</h3>
                          <p className="resources-trusted-source-meta">
                            {source.type} · {source.domain}
                          </p>
                        </div>
                      </div>
                      <p className="resources-trusted-source-link-row">
                        <a
                          href={source.baseUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-link"
                        >
                          Visit {source.name}
                        </a>
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
