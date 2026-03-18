import { useState } from "react";
import { FaFishFins } from "react-icons/fa6";
import { getSpeciesImageUrl } from "@/lib/field-guide";
import type { FishSpeciesImage } from "@/types/field-guide";

function getFallbackAltText(commonName: string | null, scientificName: string) {
  return commonName ? `Photo of ${commonName}` : `Photo of ${scientificName}`;
}

export function SpeciesImage({
  image,
  commonName,
  scientificName,
  className,
  imgClassName,
  fallbackClassName,
  priority = false,
}: {
  image: FishSpeciesImage | null;
  commonName: string | null;
  scientificName: string;
  className?: string;
  imgClassName?: string;
  fallbackClassName?: string;
  priority?: boolean;
}) {
  const [didFail, setDidFail] = useState(false);
  const imageUrl = didFail ? null : getSpeciesImageUrl(image);
  const altText = image?.altText ?? getFallbackAltText(commonName, scientificName);

  return (
    <div className={className}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={altText}
          className={imgClassName}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onError={() => setDidFail(true)}
        />
      ) : (
        <div className={fallbackClassName} aria-hidden="true">
          <div className="species-image-fallback-mark">
            <FaFishFins size={24} />
          </div>
          <div className="species-image-fallback-copy">
            <span className="species-image-fallback-label">Image coming soon</span>
            <span className="species-image-fallback-title">
              {commonName ?? scientificName}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
