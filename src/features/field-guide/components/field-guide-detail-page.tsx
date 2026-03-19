import { useState, type ReactNode } from "react";
import { FaArrowLeft, FaBookmark, FaRegBookmark, FaWater } from "react-icons/fa6";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageAttribution } from "@/components/image-attribution";
import { SpeciesAiSummaryCard } from "@/components/species-ai-summary-card";
import { SpeciesImage } from "@/components/species-image";
import { useUnitPreference } from "@/hooks/use-unit-preference";
import { FieldGuideAttribution } from "@/features/field-guide/components/field-guide-attribution";
import {
  formatSummaryText,
  formatTagLabel,
  getSpeciesSummaryPreview,
  renderLength,
  renderWeight,
  shouldRenderSection,
  titleCaseEnvironment,
} from "@/features/field-guide/presentation";
import { getSpeciesTitle } from "@/lib/field-guide-search";
import type { FishGuideStructuredSection, FishSpeciesDetail } from "@/types/field-guide";

function SpeciesSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="resources-card surface-card">
      <CardHeader className="pb-3">
        <CardTitle className="resources-section-title">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  );
}

function StructuredSection({
  title,
  data,
}: {
  title: string;
  data: FishGuideStructuredSection;
}) {
  if (!data.summary && data.entries.length === 0) {
    return null;
  }

  return (
    <SpeciesSection title={title}>
      <div className="resources-detail-list">
        {data.summary && <p>{data.summary}</p>}
        {data.entries.map((entry) => (
          <p key={`${entry.label}-${entry.value}`}>
            <strong>{entry.label}:</strong> {entry.value}
          </p>
        ))}
      </div>
    </SpeciesSection>
  );
}

function DetailHeader({
  species,
  isFavorite,
  onToggleFavorite,
}: {
  species: FishSpeciesDetail;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const [heroImageState, setHeroImageState] = useState<"image" | "fallback">("fallback");

  return (
    <Card className="resources-card resources-hero-card surface-card">
      <SpeciesImage
        image={species.primaryImage}
        commonName={species.canonicalCommonName}
        scientificName={species.scientificName}
        imageReference={species.imageReference}
        className="species-image-shell species-image-shell-hero"
        imgClassName="species-image-media"
        fallbackClassName="species-image-fallback species-image-fallback-hero"
        priority
        onRenderStateChange={setHeroImageState}
      />
      <CardContent className="resources-species-hero resources-species-hero-body">
        <div className="resources-species-copy">
          <div className="resources-species-title-row">
            <div>
              <p className="resources-eyebrow">Species Profile</p>
              <h2 className="resources-species-title">{getSpeciesTitle(species)}</h2>
              <p className="resources-species-scientific">{species.scientificName}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="btn-outline-muted resources-save-button"
              onClick={onToggleFavorite}
            >
              {isFavorite ? <FaBookmark size={16} /> : <FaRegBookmark size={16} />}
              {isFavorite ? "Bookmarked" : "Bookmark"}
            </Button>
          </div>
          <div className="resources-pill-row">
            <span className="resources-pill resources-pill-environment">
              <FaWater size={12} />
              {titleCaseEnvironment(species.environment)}
            </span>
            {species.scopeHabitat && <span className="resources-pill">{species.scopeHabitat}</span>}
            {species.browseTags.map((tag) => (
              <span key={tag} className="resources-pill">
                {formatTagLabel(tag)}
              </span>
            ))}
          </div>
          {heroImageState === "image" && <ImageAttribution image={species.primaryImage} />}
        </div>
      </CardContent>
    </Card>
  );
}

interface FieldGuideDetailPageProps {
  species: FishSpeciesDetail;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onBack: () => void;
}

export function FieldGuideDetailPage({
  species,
  isFavorite,
  onToggleFavorite,
  onBack,
}: FieldGuideDetailPageProps) {
  const { unitSystem } = useUnitPreference();
  const hasDistributionSection = Boolean(
    species.scopeHabitat || species.distributionSummary || species.nativeRegionSummary,
  );
  const hasMeasurementSection = Boolean(species.maxLengthCm || species.maxWeightG);
  const hasQuickFactsSection = Boolean(
    species.environmentType ||
      species.scopeHabitat ||
      species.family ||
      species.order ||
      species.maxLengthCm ||
      species.maxWeightG,
  );
  const showIdentificationSection = shouldRenderSection(
    species.identificationSummary,
    species.habitatSummary,
  );
  const showHabitatSection = shouldRenderSection(
    species.habitatSummary,
    species.identificationSummary,
  );
  const showBehaviorSection = shouldRenderSection(species.behaviorSummary);
  const showDietSection = shouldRenderSection(species.dietSummary);
  const distributionSummary = formatSummaryText(species.distributionSummary, unitSystem);
  const nativeRegionSummary = formatSummaryText(species.nativeRegionSummary, unitSystem);
  const identificationSummary = formatSummaryText(species.identificationSummary, unitSystem);
  const habitatSummary = formatSummaryText(species.habitatSummary, unitSystem);
  const behaviorSummary = formatSummaryText(species.behaviorSummary, unitSystem);
  const dietSummary = formatSummaryText(species.dietSummary, unitSystem);
  const anglerNotes = formatSummaryText(species.anglerNotes, unitSystem);
  const fallbackSummary = formatSummaryText(getSpeciesSummaryPreview(species), unitSystem);

  return (
    <div className="page-scroll">
      <div className="page-content resources-page-content">
        <div className="page-header">
          <Button variant="ghost" size="sm" className="legal-back-button" onClick={onBack}>
            <FaArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="page-title">Field Guide</h1>
        </div>

        <div className="resources-stack">
          <DetailHeader
            species={species}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
          />

          <SpeciesAiSummaryCard slug={species.slug} fallbackSummary={fallbackSummary} />

          <SpeciesSection title="Overview">
            <div className="resources-detail-list">
              <p>
                <strong>Common name:</strong> {species.canonicalCommonName ?? "Not available"}
              </p>
              <p>
                <strong>Scientific name:</strong> {species.scientificName}
              </p>
              {species.family && (
                <p>
                  <strong>Family:</strong> {species.family}
                </p>
              )}
              {species.genus && (
                <p>
                  <strong>Genus:</strong> {species.genus}
                </p>
              )}
              {species.speciesEpithet && (
                <p>
                  <strong>Species:</strong> {species.speciesEpithet}
                </p>
              )}
              {species.order && (
                <p>
                  <strong>Order:</strong> {species.order}
                </p>
              )}
              <p>
                <strong>Environment:</strong> {titleCaseEnvironment(species.environment)}
              </p>
            </div>
          </SpeciesSection>

          {hasQuickFactsSection && (
            <SpeciesSection title="Quick Facts">
              <div className="resources-detail-list">
                {species.environmentType && (
                  <p>
                    <strong>Environment:</strong> {species.environmentType}
                  </p>
                )}
                {species.scopeHabitat && (
                  <p>
                    <strong>Habitat:</strong> {species.scopeHabitat}
                  </p>
                )}
                {species.family && (
                  <p>
                    <strong>Family:</strong> {species.family}
                  </p>
                )}
                {species.order && (
                  <p>
                    <strong>Order:</strong> {species.order}
                  </p>
                )}
                {species.maxLengthCm && (
                  <p>
                    <strong>Maximum length:</strong> {renderLength(species.maxLengthCm, unitSystem)}
                  </p>
                )}
                {species.maxWeightG && (
                  <p>
                    <strong>Maximum weight:</strong> {renderWeight(species.maxWeightG, unitSystem)}
                  </p>
                )}
              </div>
            </SpeciesSection>
          )}

          {hasDistributionSection && (
            <SpeciesSection title="Distribution">
              <div className="resources-detail-list">
                {species.scopeHabitat && (
                  <p>
                    <strong>Habitat:</strong> {species.scopeHabitat}
                  </p>
                )}
                {distributionSummary && (
                  <p>
                    <strong>Distribution:</strong> {distributionSummary}
                  </p>
                )}
                {nativeRegionSummary && (
                  <p>
                    <strong>Native region:</strong> {nativeRegionSummary}
                  </p>
                )}
              </div>
            </SpeciesSection>
          )}

          {showIdentificationSection && (
            <SpeciesSection title="Identification">
              <div className="resources-detail-list">
                <p>{identificationSummary}</p>
              </div>
            </SpeciesSection>
          )}

          {showHabitatSection && (
            <SpeciesSection title="Habitat">
              <div className="resources-detail-list">
                <p>{habitatSummary}</p>
              </div>
            </SpeciesSection>
          )}

          {showBehaviorSection && (
            <SpeciesSection title="Behavior">
              <div className="resources-detail-list">
                <p>{behaviorSummary}</p>
              </div>
            </SpeciesSection>
          )}

          {showDietSection && (
            <SpeciesSection title="Diet">
              <div className="resources-detail-list">
                <p>{dietSummary}</p>
              </div>
            </SpeciesSection>
          )}

          {hasMeasurementSection && (
            <SpeciesSection title="Size & Weight">
              <div className="resources-detail-list">
                {species.maxLengthCm && (
                  <p>
                    <strong>Maximum length:</strong> {renderLength(species.maxLengthCm, unitSystem)}
                  </p>
                )}
                {species.maxWeightG && (
                  <p>
                    <strong>Maximum weight:</strong> {renderWeight(species.maxWeightG, unitSystem)}
                  </p>
                )}
              </div>
            </SpeciesSection>
          )}

          <StructuredSection title="Reproduction" data={species.reproduction} />
          <StructuredSection title="Spawning" data={species.spawning} />

          {anglerNotes && (
            <SpeciesSection title="Angler Notes">
              <div className="resources-detail-list">
                <p>{anglerNotes}</p>
              </div>
            </SpeciesSection>
          )}

          <Card className="resources-card surface-card">
            <CardContent className="resources-footer-card">
              <FieldGuideAttribution />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
