import type { FishSpeciesImage } from "@/types/field-guide";

function isHttpUrl(value: string | null | undefined) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function getAttributionLabel(image: FishSpeciesImage) {
  return (
    image.attributionText ??
    image.copyrightHolder ??
    image.sourceName ??
    null
  );
}

export function ImageAttribution({
  image,
  compact = false,
}: {
  image: FishSpeciesImage | null;
  compact?: boolean;
}) {
  if (!image) {
    return null;
  }

  const attributionLabel = getAttributionLabel(image);
  const sourceHref = isHttpUrl(image.sourceUrl) ? image.sourceUrl : null;
  const showSourceName = Boolean(image.sourceName && attributionLabel !== image.sourceName);

  if (!attributionLabel && !sourceHref) {
    return null;
  }

  return (
    <div
      className={
        compact
          ? "species-image-attribution species-image-attribution-compact"
          : "species-image-attribution"
      }
    >
      {attributionLabel && <span>{attributionLabel}</span>}
      {showSourceName && <span>{image.sourceName}</span>}
      {sourceHref && (
        <a
          href={sourceHref}
          target="_blank"
          rel="noreferrer"
          className="text-link"
        >
          Source
        </a>
      )}
    </div>
  );
}
