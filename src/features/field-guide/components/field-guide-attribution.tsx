import { FISHBASE_URL } from "@/features/field-guide/presentation";

export function FieldGuideAttribution() {
  return (
    <p className="resources-attribution">
      Species data provided by{" "}
      <a href={FISHBASE_URL} target="_blank" rel="noreferrer" className="text-link">
        FishBase
      </a>
      .
    </p>
  );
}
