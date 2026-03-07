import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FaFish } from "react-icons/fa6";
import { Card, CardContent } from "@/components/ui/card";
import { getStatsSpeciesDetail } from "@/lib/supabase-data";
import SpeciesConditionsCard from "@/stats/SpeciesConditionsCard";
import SpeciesMonthlyChart from "@/stats/SpeciesMonthlyChart";
import SpeciesTimeScatter from "@/stats/SpeciesTimeScatter";
import TopTackleChart from "@/stats/TopTackleChart";
import { getSpeciesColor } from "@/stats/helpers";

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
        <FaFish className="stats-species-header-icon" style={{ color }} />
      </div>

      <TopTackleChart rows={data.topTackle} title="Top Tackle" />
      <SpeciesConditionsCard conditions={data.conditions} />
      <SpeciesMonthlyChart monthly={data.monthly} color={color} />
      <SpeciesTimeScatter points={data.points} color={color} />
    </div>
  );
}
