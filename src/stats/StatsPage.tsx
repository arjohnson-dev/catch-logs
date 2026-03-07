import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FaArrowLeft } from "react-icons/fa6";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getStatsOverview } from "@/lib/supabase-data";
import SpeciesBreakdownChart from "@/stats/SpeciesBreakdownChart";
import SpeciesDetailPage from "@/stats/SpeciesDetailPage";
import StatsSummaryCards from "@/stats/StatsSummaryCards";
import TopTackleChart from "@/stats/TopTackleChart";

export default function StatsPage() {
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["stats", "overview"],
    queryFn: getStatsOverview,
  });

  return (
    <div className="page-scroll">
      <div className="page-content stats-page-content-main">
        <div className="page-header">
          {selectedSpecies ? (
            <Button
              variant="ghost"
              size="sm"
              className="legal-back-button"
              onClick={() => setSelectedSpecies(null)}
            >
              <FaArrowLeft className="w-4 h-4" />
            </Button>
          ) : (
            <Link to="/">
              <Button variant="ghost" size="sm" className="legal-back-button">
                <FaArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          )}
          <h1 className="page-title">Your Stats</h1>
        </div>

        {selectedSpecies ? (
          <SpeciesDetailPage species={selectedSpecies} />
        ) : (
          <div className="stats-stack-lg">
            <Card className="stats-card stats-beta-card">
              <CardContent className="pt-6">
                <p className="stats-beta-copy">
                  Stats is currently in beta. Feedback and improvement ideas are encouraged via the{" "}
                  <Link to="/support" className="text-link">
                    Contact Support page
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>

            {isLoading && (
              <div className="stats-stack">
                <div className="stats-loading-block" />
                <div className="stats-loading-block" />
                <div className="stats-loading-block" />
              </div>
            )}

            {!isLoading && (isError || !data) && (
              <Card className="stats-card">
                <CardContent className="pt-6">
                  <p className="stats-empty-inline">Could not load your stats right now.</p>
                </CardContent>
              </Card>
            )}

            {!isLoading && data && (
              <>
                {data.totalCaught === 0 ? (
                  <Card className="stats-card">
                    <CardContent className="pt-6">
                      <p className="stats-empty-inline">No catches yet. Log your first catch to unlock analytics.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <StatsSummaryCards overview={data} />
                    <SpeciesBreakdownChart
                      speciesBreakdown={data.speciesBreakdown}
                      totalCaught={data.totalCaught}
                      onSelectSpecies={setSelectedSpecies}
                    />
                    <TopTackleChart rows={data.topTackle} title="Most Successful Tackle" />
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
