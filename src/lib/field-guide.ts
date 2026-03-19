import { supabase } from "@/lib/supabase";
import { normalizeSpeciesSearchText } from "@/lib/field-guide-search";
import type {
  FishEnvironment,
  FishGuideStructuredSection,
  FishSpeciesImage,
  FishSpeciesDetail,
  FishSpeciesListItem,
} from "@/types/field-guide";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type FieldGuideSpeciesRow = {
  spec_code: number | string | null;
  slug: string | null;
  canonical_common_name: string | null;
  scientific_name: string | null;
  environment_type?: string | null;
  scope_region?: string | null;
  scope_habitat?: string | null;
  alternate_common_names?: JsonValue;
  browse_tags?: JsonValue;
  search_aliases?: JsonValue;
  reproduction?: JsonValue;
  spawning?: JsonValue;
  identification_summary?: string | null;
  habitat_summary?: string | null;
  behavior_summary?: string | null;
  diet_summary?: string | null;
  distribution_summary?: string | null;
  native_region_summary?: string | null;
  family?: string | null;
  order_name?: string | null;
  genus?: string | null;
  species_epithet?: string | null;
  angler_notes?: string | null;
  max_length_cm?: number | null;
  max_weight_g?: number | null;
  image_reference?: string | null;
  is_north_american?: boolean | null;
  is_active?: boolean | null;
};

type FieldGuideSpeciesImageRow = {
  id: string | null;
  species_id: number | string | null;
  source_name?: string | null;
  source_url?: string | null;
  external_url?: string | null;
  license_type?: string | null;
  copyright_holder?: string | null;
  attribution_text?: string | null;
  alt_text?: string | null;
  width_px?: number | null;
  height_px?: number | null;
  sort_order?: number | null;
  is_primary?: boolean | null;
  is_app_safe?: boolean | null;
  status?: string | null;
  is_active?: boolean | null;
};

const FIELD_GUIDE_LIST_COLUMNS = [
  "spec_code",
  "slug",
  "canonical_common_name",
  "scientific_name",
  "environment_type",
  "scope_habitat",
  "alternate_common_names",
  "browse_tags",
  "search_aliases",
  "distribution_summary",
  "family",
  "image_reference",
  "is_active",
].join(",");

const FIELD_GUIDE_DETAIL_COLUMNS = "*";
const FIELD_GUIDE_LIST_LIMIT = 250;
const FIELD_GUIDE_PAGE_SIZE = 1000;
export const UNIDENTIFIED_FIELD_GUIDE_SPEC_CODE = 1;
const FIELD_GUIDE_PRIMARY_IMAGE_COLUMNS = [
  "id",
  "species_id",
  "source_name",
  "source_url",
  "external_url",
  "license_type",
  "copyright_holder",
  "attribution_text",
  "alt_text",
  "width_px",
  "height_px",
  "sort_order",
  "is_primary",
  "is_app_safe",
  "status",
  "is_active",
].join(",");
let speciesImagesAccessUnavailable = false;

function decodeNumericHtmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, codePoint) => {
      const parsed = Number.parseInt(codePoint, 10);
      return Number.isNaN(parsed) ? _ : String.fromCodePoint(parsed);
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => {
      const parsed = Number.parseInt(codePoint, 16);
      return Number.isNaN(parsed) ? _ : String.fromCodePoint(parsed);
    });
}

function decodeNamedHtmlEntities(value: string) {
  if (typeof document === "undefined") {
    return value;
  }

  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}

function repairMojibake(value: string) {
  const suspiciousPattern = /[ÃÂÐÑÕÖØáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/;
  if (!suspiciousPattern.test(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from([...value].map((char) => char.charCodeAt(0) & 0xff));
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    return decoded.includes("\uFFFD") ? value : decoded;
  } catch {
    return value;
  }
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeSpeciesLookupText(value: string) {
  return normalizeSpeciesSearchText(normalizeText(value));
}

function coerceString(value: JsonValue | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const decodedValue = repairMojibake(
    decodeNamedHtmlEntities(decodeNumericHtmlEntities(value)),
  );
  const normalized = normalizeText(decodedValue);
  return normalized.length > 0 ? normalized : null;
}

function coerceStringArray(value: JsonValue | undefined): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => coerceString(item))
      .filter((item): item is string => Boolean(item));
  }

  const singleValue = coerceString(value);
  return singleValue ? [singleValue] : [];
}

function toSpecCode(value: number | string | null): number {
  const normalized =
    typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);

  if (Number.isNaN(normalized)) {
    throw new Error("Encountered a field-guide species row without a valid spec_code");
  }

  return normalized;
}

function toEnvironment(row: FieldGuideSpeciesRow, browseTags: string[]): FishEnvironment {
  const directValue = coerceString(row.environment_type)?.toLowerCase();
  const normalizedTags = browseTags.map((tag) => tag.toLowerCase());

  if (directValue === "freshwater") return "freshwater";
  if (directValue === "marine") return "marine";
  if (directValue === "brackish") return "brackish";
  if (directValue === "mixed") return "mixed";
  if (directValue === "freshwater/marine") return "mixed";
  if (directValue === "freshwater-brackish") return "mixed";
  if (directValue === "brackish/marine") return "mixed";

  if (normalizedTags.includes("freshwater") && normalizedTags.includes("marine")) {
    return "mixed";
  }

  if (normalizedTags.includes("freshwater") && normalizedTags.includes("brackish")) {
    return "mixed";
  }

  if (normalizedTags.includes("freshwater")) return "freshwater";
  if (normalizedTags.includes("brackish")) return "brackish";
  if (normalizedTags.includes("marine")) return "marine";

  return "unknown";
}

function titleCaseKey(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toStructuredEntries(value: JsonValue | undefined): FishGuideStructuredSection {
  if (!value) {
    return { summary: null, entries: [] };
  }

  if (typeof value === "string") {
    return {
      summary: normalizeText(value),
      entries: [],
    };
  }

  if (Array.isArray(value)) {
    const entries = value
      .map((item, index) => {
        const normalized = coerceString(item);
        if (!normalized) return null;
        return {
          label: `Detail ${index + 1}`,
          value: normalized,
        };
      })
      .filter(
        (
          item,
        ): item is {
          label: string;
          value: string;
        } => Boolean(item),
      );

    return { summary: null, entries };
  }

  const objectValue = value as Record<string, JsonValue>;
  const summary =
    coerceString(objectValue.summary) ??
    coerceString(objectValue.overview) ??
    coerceString(objectValue.notes) ??
    null;

  const entries = Object.entries(objectValue)
    .filter(([key]) => !["summary", "overview", "notes"].includes(key))
    .flatMap(([key, nestedValue]) => {
      if (nestedValue === null) return [];

      if (Array.isArray(nestedValue)) {
        const joined = nestedValue
          .map((item) => coerceString(item))
          .filter((item): item is string => Boolean(item))
          .join(", ");

        return joined
          ? [{ label: titleCaseKey(key), value: joined }]
          : [];
      }

      if (typeof nestedValue === "object") {
        const parts = Object.entries(nestedValue)
          .map(([nestedKey, nestedItem]) => {
            const normalized = coerceString(nestedItem);
            return normalized ? `${titleCaseKey(nestedKey)}: ${normalized}` : null;
          })
          .filter((item): item is string => Boolean(item));

        return parts.length > 0
          ? [{ label: titleCaseKey(key), value: parts.join(" | ") }]
          : [];
      }

      const normalized = coerceString(nestedValue);
      return normalized ? [{ label: titleCaseKey(key), value: normalized }] : [];
    });

  return { summary, entries };
}

function mapSpeciesRow(row: FieldGuideSpeciesRow): FishSpeciesDetail {
  const browseTags = coerceStringArray(row.browse_tags);
  const searchAliases = coerceStringArray(row.search_aliases);
  const alternateCommonNames = coerceStringArray(row.alternate_common_names);
  const scientificName = coerceString(row.scientific_name) ?? "Unknown species";
  const canonicalCommonName = coerceString(row.canonical_common_name);
  const specCode = toSpecCode(row.spec_code);
  const slug = coerceString(row.slug) ?? String(specCode);

  return {
    specCode,
    slug,
    scientificName,
    canonicalCommonName,
    alternateCommonNames,
    searchAliases,
    family: coerceString(row.family),
    genus: coerceString(row.genus),
    speciesEpithet: coerceString(row.species_epithet),
    order: coerceString(row.order_name),
    environmentType: coerceString(row.environment_type),
    environment: toEnvironment(row, browseTags),
    browseTags,
    identificationSummary: coerceString(row.identification_summary),
    habitatSummary: coerceString(row.habitat_summary),
    behaviorSummary: coerceString(row.behavior_summary),
    dietSummary: coerceString(row.diet_summary),
    distributionSummary:
      coerceString(row.distribution_summary),
    nativeRegionSummary: coerceString(row.native_region_summary),
    anglerNotes: coerceString(row.angler_notes),
    maxLengthCm: row.max_length_cm ?? null,
    maxWeightG: row.max_weight_g ?? null,
    imageReference: coerceString(row.image_reference),
    primaryImage: null,
    scopeHabitat: coerceString(row.scope_habitat),
    reproduction: toStructuredEntries(row.reproduction),
    spawning: toStructuredEntries(row.spawning),
  };
}

function normalizeImageStatus(value: string | null | undefined): FishSpeciesImage["status"] {
  if (value === "approved" || value === "rejected" || value === "pending") {
    return value;
  }

  return "pending";
}

function mapSpeciesImageRow(row: FieldGuideSpeciesImageRow): FishSpeciesImage | null {
  const id = coerceString(row.id);
  if (!id) {
    return null;
  }

  return {
    id,
    speciesId: toSpecCode(row.species_id),
    sourceName: coerceString(row.source_name),
    sourceUrl: coerceString(row.source_url),
    externalUrl: coerceString(row.external_url),
    licenseType: coerceString(row.license_type),
    copyrightHolder: coerceString(row.copyright_holder),
    attributionText: coerceString(row.attribution_text),
    altText: coerceString(row.alt_text),
    widthPx: row.width_px ?? null,
    heightPx: row.height_px ?? null,
    sortOrder: row.sort_order ?? 0,
    isPrimary: Boolean(row.is_primary),
    isAppSafe: Boolean(row.is_app_safe),
    status: normalizeImageStatus(row.status),
    isActive: Boolean(row.is_active),
  };
}

function isHttpUrl(value: string | null | undefined) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function isFishBaseImageReference(value: string | null | undefined) {
  return Boolean(value && /^[A-Za-z0-9_-]+\.(gif|jpe?g|png|webp)$/i.test(value));
}

export function getFishBaseImageReferenceUrl(
  imageReference: string | null | undefined,
): string | null {
  if (!isFishBaseImageReference(imageReference)) {
    return null;
  }

  return `https://www.fishbase.se/images/species/${imageReference}`;
}

async function getApprovedPrimaryImageMap(specCodes: number[]) {
  if (speciesImagesAccessUnavailable) {
    return new Map<number, FishSpeciesImage>();
  }

  const uniqueSpecCodes = [...new Set(specCodes)].filter((value) => !Number.isNaN(value));
  if (uniqueSpecCodes.length === 0) {
    return new Map<number, FishSpeciesImage>();
  }

  const { data, error } = await supabase
    .schema("field-guide")
    .from("species_images")
    .select(FIELD_GUIDE_PRIMARY_IMAGE_COLUMNS)
    .in("species_id", uniqueSpecCodes)
    .eq("is_active", true)
    .eq("is_app_safe", true)
    .eq("status", "approved")
    .order("species_id", { ascending: true })
    .order("is_primary", { ascending: false })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    if (error.code === "42501") {
      speciesImagesAccessUnavailable = true;
    }
    console.warn("Field guide species images unavailable; continuing without images.", error);
    return new Map<number, FishSpeciesImage>();
  }

  const imageMap = new Map<number, FishSpeciesImage>();

  for (const row of (data ?? []) as unknown as FieldGuideSpeciesImageRow[]) {
    const mapped = mapSpeciesImageRow(row);
    if (mapped && !imageMap.has(mapped.speciesId)) {
      imageMap.set(mapped.speciesId, mapped);
    }
  }

  return imageMap;
}

function attachPrimaryImages<T extends FishSpeciesListItem | FishSpeciesDetail>(
  species: T[],
  imageMap: Map<number, FishSpeciesImage>,
): T[] {
  return species.map((item) => ({
    ...item,
    primaryImage: imageMap.get(item.specCode) ?? null,
  }));
}

function escapeIlikePattern(value: string) {
  return value.replace(/[%_,]/g, " ").trim();
}

export async function getFieldGuideSpeciesList(input?: {
  search?: string;
  limit?: number;
}): Promise<FishSpeciesListItem[]> {
  const search = input?.search?.trim() ?? "";
  const limit = input?.limit ?? FIELD_GUIDE_LIST_LIMIT;
  let query = supabase
    .schema("field-guide")
    .from("species")
    .select(FIELD_GUIDE_LIST_COLUMNS)
    .eq("is_active", true)
    .order("canonical_common_name", { ascending: true, nullsFirst: false })
    .limit(limit);

  if (search.length > 0) {
    const normalizedSearch = escapeIlikePattern(search);
    query = query.or(
      [
        `canonical_common_name.ilike.%${normalizedSearch}%`,
        `scientific_name.ilike.%${normalizedSearch}%`,
      ].join(","),
    );
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const species = ((data ?? []) as unknown as FieldGuideSpeciesRow[]).map(mapSpeciesRow);
  const imageMap = await getApprovedPrimaryImageMap(species.map((item) => item.specCode));
  return attachPrimaryImages(species, imageMap);
}

function getFieldGuideSpeciesMatchRank(species: FishSpeciesListItem, query: string) {
  const normalizedQuery = normalizeSpeciesLookupText(query);
  const canonicalCommonName = normalizeSpeciesLookupText(species.canonicalCommonName ?? "");
  const scientificName = normalizeSpeciesLookupText(species.scientificName);
  const alternateCommonNames = species.alternateCommonNames.map(normalizeSpeciesLookupText);
  const searchAliases = species.searchAliases.map(normalizeSpeciesLookupText);

  if (canonicalCommonName === normalizedQuery) return 0;
  if (alternateCommonNames.includes(normalizedQuery)) return 1;
  if (searchAliases.includes(normalizedQuery)) return 2;
  if (scientificName === normalizedQuery) return 3;
  return null;
}

export function findFieldGuideSpeciesByName(
  species: FishSpeciesListItem[],
  query: string,
): FishSpeciesListItem | null {
  const normalizedQuery = normalizeSpeciesLookupText(query);
  if (!normalizedQuery) {
    return null;
  }

  const rankedMatches = species
    .map((item) => ({
      item,
      rank: getFieldGuideSpeciesMatchRank(item, normalizedQuery),
    }))
    .filter((entry): entry is { item: FishSpeciesListItem; rank: number } => entry.rank !== null)
    .sort((left, right) => {
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }

      const leftTitle = left.item.canonicalCommonName ?? left.item.scientificName;
      const rightTitle = right.item.canonicalCommonName ?? right.item.scientificName;
      return leftTitle.localeCompare(rightTitle);
    });

  return rankedMatches[0]?.item ?? null;
}

export async function resolveFieldGuideSpeciesSpecCode(query: string): Promise<number> {
  const normalizedQuery = normalizeSpeciesLookupText(query);
  if (!normalizedQuery) {
    return UNIDENTIFIED_FIELD_GUIDE_SPEC_CODE;
  }

  const exactSearchMatches = await getFieldGuideSpeciesList({
    search: query,
    limit: 50,
  });
  const exactMatch =
    findFieldGuideSpeciesByName(exactSearchMatches, normalizedQuery) ??
    await (async () => {
      let from = 0;

      while (true) {
        const to = from + FIELD_GUIDE_PAGE_SIZE - 1;
        const { data, error } = await supabase
          .schema("field-guide")
          .from("species")
          .select(FIELD_GUIDE_LIST_COLUMNS)
          .eq("is_active", true)
          .order("canonical_common_name", { ascending: true, nullsFirst: false })
          .range(from, to);

        if (error) {
          throw error;
        }

        const speciesPage = ((data ?? []) as unknown as FieldGuideSpeciesRow[]).map(mapSpeciesRow);
        const pageMatch = findFieldGuideSpeciesByName(speciesPage, normalizedQuery);
        if (pageMatch) {
          return pageMatch;
        }

        if (speciesPage.length < FIELD_GUIDE_PAGE_SIZE) {
          return null;
        }

        from += FIELD_GUIDE_PAGE_SIZE;
      }
    })();

  return exactMatch?.specCode ?? UNIDENTIFIED_FIELD_GUIDE_SPEC_CODE;
}

export async function getFieldGuideSpeciesDetail(input: {
  slug?: string | null;
  specCode?: number | null;
}): Promise<FishSpeciesDetail | null> {
  const schemaQuery = supabase
    .schema("field-guide")
    .from("species")
    .select(FIELD_GUIDE_DETAIL_COLUMNS)
    .eq("is_active", true);

  const query =
    input.slug && input.slug.trim().length > 0
      ? schemaQuery.eq("slug", input.slug.trim())
      : input.specCode !== null && input.specCode !== undefined
        ? schemaQuery.eq("spec_code", input.specCode)
        : null;

  if (!query) {
    return null;
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const species = mapSpeciesRow(data as unknown as FieldGuideSpeciesRow);
  const imageMap = await getApprovedPrimaryImageMap([species.specCode]);
  return attachPrimaryImages([species], imageMap)[0] ?? species;
}

export async function getMyFavoriteSpecCodes(): Promise<number[]> {
  const { data, error } = await supabase
    .schema("field-guide")
    .rpc("get_my_favorite_spec_codes");

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<number | string | null>)
    .map((value) =>
      typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10),
    )
    .filter((value) => !Number.isNaN(value));
}

export async function getMyFavoriteSpecies(): Promise<FishSpeciesListItem[]> {
  const { data, error } = await supabase
    .schema("field-guide")
    .rpc("get_my_favorite_species");

  if (error) {
    throw error;
  }

  const species = ((data ?? []) as unknown as FieldGuideSpeciesRow[]).map(mapSpeciesRow);
  const imageMap = await getApprovedPrimaryImageMap(species.map((item) => item.specCode));
  return attachPrimaryImages(species, imageMap);
}

export function getSpeciesImageUrl(image: FishSpeciesImage | null | undefined): string | null {
  if (!image || image.isActive !== true || image.isAppSafe !== true || image.status !== "approved") {
    return null;
  }

  return isHttpUrl(image.externalUrl) ? image.externalUrl : null;
}

export async function getFieldGuideSpeciesPhotoUrlMap(
  specCodes: number[],
): Promise<Map<number, string>> {
  const uniqueSpecCodes = [...new Set(specCodes)].filter((value) => !Number.isNaN(value));
  if (uniqueSpecCodes.length === 0) {
    return new Map<number, string>();
  }

  const [imageMap, speciesReferenceResponse] = await Promise.all([
    getApprovedPrimaryImageMap(uniqueSpecCodes),
    supabase
      .schema("field-guide")
      .from("species")
      .select("spec_code,image_reference,canonical_common_name")
      .in("spec_code", uniqueSpecCodes)
      .eq("is_active", true),
  ]);
  const photoUrlMap = new Map<number, string>();
  const speciesReferenceRows =
    (speciesReferenceResponse.data as Array<{
      spec_code: number | string | null;
      image_reference: string | null;
      canonical_common_name: string | null;
    }> | null) ?? [];
  const speciesBySpecCode = new Map(
    speciesReferenceRows.map((species) => [
      toSpecCode(species.spec_code),
      {
        imageReference: coerceString(species.image_reference),
        canonicalCommonName: coerceString(species.canonical_common_name),
      },
    ]),
  );

  for (const specCode of uniqueSpecCodes) {
    const image = imageMap.get(specCode);
    const species = speciesBySpecCode.get(specCode);
    const photoUrl =
      getSpeciesImageUrl(image) ??
      getFishBaseImageReferenceUrl(species?.imageReference);

    if (photoUrl) {
      photoUrlMap.set(specCode, photoUrl);
    }
  }

  return photoUrlMap;
}

export async function favoriteSpecies(specCode: number): Promise<void> {
  const { error } = await supabase
    .schema("field-guide")
    .rpc("favorite_species", { p_spec_code: specCode });

  if (error) {
    throw error;
  }
}

export async function unfavoriteSpecies(specCode: number): Promise<void> {
  const { error } = await supabase
    .schema("field-guide")
    .rpc("unfavorite_species", { p_spec_code: specCode });

  if (error) {
    throw error;
  }
}
