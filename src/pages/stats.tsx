import { useQuery } from "@tanstack/react-query";
import {
  FaArrowLeft,
  FaCalendar,
  FaMapLocationDot,
  FaRuler,
  FaTrophy,
  FaWeightScale,
} from "react-icons/fa6";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import JournalEntryCard from "@/components/journal-entry-card";
import type { JournalEntry } from "@/types/domain";
import { getEntries } from "@/lib/supabase-data";

function PlaceholderCard({ type }: { type: 'longest' | 'heaviest' }) {
  return (
    <Card className="stats-card stats-card-dashed">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-16 h-16 rounded-lg bg-gray-800 flex items-center justify-center">
            {type === 'longest' ? (
              <FaRuler className="w-6 h-6 text-gray-600" />
            ) : (
              <FaWeightScale className="w-6 h-6 text-gray-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-500">
                Your {type === 'longest' ? 'longest' : 'heaviest'} catch
              </h3>
            </div>
            
            <div className="text-sm text-gray-500 mb-2">
              Will appear here once you log your first catch
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Stats() {
  const [, navigate] = useLocation();
  const { data: entries = [], isLoading } = useQuery<JournalEntry[]>({
    queryKey: ["entries"],
    queryFn: getEntries,
  });

  if (isLoading) {
    return (
      <div className="page-scroll">
        <div className="page-content stats-page-content">
          <div className="page-header">
            <Link to="/">
              <Button variant="ghost" size="sm" className="legal-back-button">
                <FaArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="page-title">Your Stats</h1>
          </div>
          <div className="stats-stack">
            <div className="stats-loading-block" />
            <div className="stats-loading-block" />
            <div className="stats-loading-block" />
          </div>
        </div>
      </div>
    );
  }

  // Calculate stats
  const recentEntries = entries
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
    .slice(0, 5);

  // Get longest fish (up to 3 if tied)
  const entriesWithLength = entries.filter(entry => entry.length && entry.length > 0);
  const maxLength = entriesWithLength.length > 0 ? Math.max(...entriesWithLength.map(e => e.length || 0)) : 0;
  const longestFishEntries = entriesWithLength.length > 0 
    ? entriesWithLength.filter(entry => entry.length === maxLength).slice(0, 3)
    : [];

  // Get heaviest fish (up to 3 if tied)
  const entriesWithWeight = entries.filter(entry => entry.weight && entry.weight > 0);
  const maxWeight = entriesWithWeight.length > 0 ? Math.max(...entriesWithWeight.map(e => e.weight || 0)) : 0;
  const heaviestFishEntries = entriesWithWeight.length > 0
    ? entriesWithWeight.filter(entry => entry.weight === maxWeight).slice(0, 3)
    : [];

  return (
    <div className="page-scroll">
      <div className="page-content stats-page-content-main">
        <div className="page-header">
          <Link to="/">
            <Button variant="ghost" size="sm" className="legal-back-button">
              <FaArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="page-title">Your Stats</h1>
        </div>

        <div className="stats-stack-lg">
          {/* Recent Activity Card */}
          <Card className="stats-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FaCalendar className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentEntries.length > 0 ? (
                <div className="space-y-3">
                  {recentEntries.map((entry) => (
                    <JournalEntryCard key={entry.id} entry={entry} />
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-4">
                  <p>No recent catches</p>
                  <p className="text-sm">Start fishing to see your activity here!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Personal Records Card - Always Show */}
          <Card className="stats-card">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <FaTrophy className="w-5 h-5" />
                Personal Records
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <FaRuler className="w-4 h-4" />
                  Longest Fish {longestFishEntries.length > 0 && `(${maxLength}")`}
                </h3>
                <div className="space-y-3">
                  {longestFishEntries.length > 0 ? (
                    longestFishEntries.map((entry) => (
                      <JournalEntryCard
                        key={entry.id}
                        entry={entry}
                        actions={[
                          {
                            id: "take-me-there",
                            label: "Take me there",
                            icon: FaMapLocationDot,
                            onClick: () => navigate(`/?pinId=${entry.pinId}`),
                          },
                        ]}
                      />
                    ))
                  ) : (
                    <PlaceholderCard type="longest" />
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <FaWeightScale className="w-4 h-4" />
                  Heaviest Fish {heaviestFishEntries.length > 0 && `(${maxWeight} lbs)`}
                </h3>
                <div className="space-y-3">
                  {heaviestFishEntries.length > 0 ? (
                    heaviestFishEntries.map((entry) => (
                      <JournalEntryCard
                        key={entry.id}
                        entry={entry}
                        actions={[
                          {
                            id: "take-me-there",
                            label: "Take me there",
                            icon: FaMapLocationDot,
                            onClick: () => navigate(`/?pinId=${entry.pinId}`),
                          },
                        ]}
                      />
                    ))
                  ) : (
                    <PlaceholderCard type="heaviest" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
