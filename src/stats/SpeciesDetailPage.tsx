import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FaBookOpen, FaFish } from "react-icons/fa6";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getFieldGuideSpeciesDetail,
} from "@/lib/field-guide";
import { getStatsSpeciesDetail } from "@/lib/supabase-data";
import SpeciesCatchTimeDistribution from "@/stats/SpeciesCatchTimeDistribution";
import SpeciesConditionsCard from "@/stats/SpeciesConditionsCard";
import SpeciesMonthlyChart from "@/stats/SpeciesMonthlyChart";
import TopNamedCountChart from "@/stats/TopNamedCountChart";
import { getSpeciesColor } from "@/stats/helpers";
import type { FishSpeciesDetail } from "@/types/field-guide";

type Props = {
  species: string;
};

export default function SpeciesDetailPage({ species }: Props) {
  const color = useMemo(() => getSpeciesColor(species, 0), [species]);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stats", "species", species],
    queryFn: () => getStatsSpeciesDetail(species),
    enabled: species.trim().length > 0,
  });
  const { data: fieldGuideSpecies } = useQuery<FishSpeciesDetail | null>({
    queryKey: ["field-guide", "species-link", data?.fieldGuideSpecCode ?? null],
    queryFn: async () => {
      if (!data?.fieldGuideSpecCode) {
        return null;
      }

      return getFieldGuideSpeciesDetail({ specCode: data.fieldGuideSpecCode });
    },
    enabled: Boolean(data?.fieldGuideSpecCode),
    staleTime: 1000 * 60 * 60,
  });

  if (isLoading) {
    return (
      <div className="stats-stack">
        <div className="stats-loading-block" />
        <div className="stats-loading-block" />
        <div className="stats-loading-block" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="stats-card">
        <CardContent className="pt-6">
          <p className="stats-empty-inline">Could not load species analytics right now.</p>
        </CardContent>
      </Card>
    );
  }

  return (
      <div className="stats-stack-lg">
      <div className="stats-species-header">
        <div className="stats-species-header-copy">
          <h2 className="stats-species-title">{data.species}</h2>
          <p className="stats-metric-subtle">{data.totalCatches} catches</p>
        </div>
        <div className="flex items-center gap-3">
          {fieldGuideSpecies?.slug && (
            <Link to={`/resources/field-guide/${fieldGuideSpecies.slug}`}>
              <Button variant="outline" className="btn-outline-info">
                <FaBookOpen className="mr-2 h-4 w-4" />
                View Field Guide
              </Button>
            </Link>
          )}
          <FaFish className="stats-species-header-icon" style={{ color }} />
        </div>
      </div>

      <TopNamedCountChart rows={data.topLures} title="Top Lures" emptyLabel="No lure data available yet." />
      <TopNamedCountChart rows={data.topBaits} title="Top Baits" emptyLabel="No bait data available yet." />
      <SpeciesConditionsCard conditions={data.conditions} />
      <SpeciesMonthlyChart monthly={data.monthly} color={color} />
      <SpeciesCatchTimeDistribution catchTimes={data.catchTimes} color={color} />
    </div>
  );
}
