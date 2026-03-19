import { FaBookmark, FaRegBookmark } from "react-icons/fa6";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SpeciesImage } from "@/components/species-image";
import { useUnitPreference } from "@/hooks/use-unit-preference";
import {
  formatSummaryText,
  formatTagLabel,
  getHabitatHint,
  getSpeciesSummaryPreview,
  titleCaseEnvironment,
  truncateText,
} from "@/features/field-guide/presentation";
import {
  getSpeciesSubtitle,
  getSpeciesTitle,
} from "@/lib/field-guide-search";
import type { FishSpeciesListItem } from "@/types/field-guide";

interface FieldGuideSpeciesCardProps {
  species: FishSpeciesListItem;
  isFavorite: boolean;
  onOpen: () => void;
  onToggleFavorite: () => void;
}

export function FieldGuideSpeciesCard({
  species,
  isFavorite,
  onOpen,
  onToggleFavorite,
}: FieldGuideSpeciesCardProps) {
  const { unitSystem } = useUnitPreference();
  const habitatHint = formatSummaryText(getHabitatHint(species), unitSystem);
  const summaryPreview = formatSummaryText(getSpeciesSummaryPreview(species), unitSystem);

  return (
    <Card className="resources-card resources-result-card surface-card surface-card-hover">
      <CardContent className="p-0">
        <div className="resources-result-media">
          <SpeciesImage
            image={species.primaryImage}
            commonName={species.canonicalCommonName}
            scientificName={species.scientificName}
            imageReference={species.imageReference}
            className="species-image-shell species-image-shell-card"
            imgClassName="species-image-media"
            fallbackClassName="species-image-fallback species-image-fallback-card"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="resources-favorite-button resources-favorite-button-overlay"
            onClick={onToggleFavorite}
            aria-label={isFavorite ? "Remove bookmark" : "Add bookmark"}
            title={isFavorite ? "Remove bookmark" : "Add bookmark"}
          >
            {isFavorite ? <FaBookmark size={18} /> : <FaRegBookmark size={18} />}
          </Button>
        </div>
        <button
          type="button"
          className="resources-result-main resources-result-main-stacked"
          onClick={onOpen}
          aria-label={`Open ${getSpeciesTitle(species)}`}
        >
          <div className="resources-result-copy">
            <div className="resources-result-heading">
              <h2 className="resources-result-title">{getSpeciesTitle(species)}</h2>
              <span className="resources-pill resources-pill-environment">
                {titleCaseEnvironment(species.environment)}
              </span>
            </div>
            {getSpeciesSubtitle(species) && (
              <p className="resources-result-scientific">{getSpeciesSubtitle(species)}</p>
            )}
            <p className="resources-result-meta">{species.family ?? "Family unavailable"}</p>
            {species.browseTags.length > 0 && (
              <div className="resources-pill-row">
                {species.browseTags.slice(0, 3).map((tag) => (
                  <span key={tag} className="resources-pill">
                    {formatTagLabel(tag)}
                  </span>
                ))}
              </div>
            )}
            {habitatHint && <p className="resources-result-meta">{truncateText(habitatHint, 120)}</p>}
            {species.alternateCommonNames.length > 0 && (
              <div className="resources-result-aliases">
                <p className="resources-result-alias-label">Also known as</p>
                <div className="resources-pill-row">
                  {species.alternateCommonNames.slice(0, 4).map((name) => (
                    <span key={name} className="resources-pill">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {summaryPreview && (
              <p className="resources-result-summary">{truncateText(summaryPreview, 180)}</p>
            )}
          </div>
        </button>
      </CardContent>
    </Card>
  );
}
