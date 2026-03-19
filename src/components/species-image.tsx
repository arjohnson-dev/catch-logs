import { useEffect, useState } from "react";
import { FaFishFins } from "react-icons/fa6";
import { getFishBaseImageReferenceUrl, getSpeciesImageUrl } from "@/lib/field-guide";
import type { FishSpeciesImage } from "@/types/field-guide";

function getFallbackAltText(commonName: string | null, scientificName: string) {
  return commonName ? `Photo of ${commonName}` : `Photo of ${scientificName}`;
}

export function SpeciesImage({
  image,
  commonName,
  scientificName,
  imageReference,
  className,
  imgClassName,
  fallbackClassName,
  priority = false,
  onRenderStateChange,
}: {
  image: FishSpeciesImage | null;
  commonName: string | null;
  scientificName: string;
  imageReference?: string | null;
  className?: string;
  imgClassName?: string;
  fallbackClassName?: string;
  priority?: boolean;
  onRenderStateChange?: (state: "image" | "fallback") => void;
}) {
  const imageKey = image?.id ?? image?.externalUrl ?? imageReference ?? null;
  const [failedImageKey, setFailedImageKey] = useState<string | null>(null);
  const didFail = imageKey !== null && failedImageKey === imageKey;
  const imageUrl = didFail
    ? null
    : getSpeciesImageUrl(image) ?? getFishBaseImageReferenceUrl(imageReference);
  const altText = image?.altText ?? getFallbackAltText(commonName, scientificName);

  useEffect(() => {
    onRenderStateChange?.(imageUrl ? "image" : "fallback");
  }, [imageUrl, onRenderStateChange]);

  return (
    <div className={className}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={altText}
          className={imgClassName}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => {
            console.warn("Species image failed to load; showing fallback.", {
              speciesName: commonName ?? scientificName,
              imageUrl,
              sourceUrl: image?.sourceUrl ?? null,
              imageReference: imageReference ?? null,
            });
            setFailedImageKey(imageKey);
          }}
        />
      ) : (
        <div className={fallbackClassName} aria-hidden="true">
          <div className="species-image-fallback-mark">
            <FaFishFins size={24} />
          </div>
          <div className="species-image-fallback-copy">
            <span className="species-image-fallback-label">Image unavailable</span>
            <span className="species-image-fallback-title">
              {commonName ?? scientificName}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
