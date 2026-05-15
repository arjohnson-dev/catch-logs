import type { WeatherLocation } from "@/lib/weather-locations";

export type FishingResourceKind = "reports" | "regulations";

export type FishingResourceLink = {
  title: string;
  description: string;
  url: string;
  sourceLabel: string;
  isPrimary?: boolean;
};

export type UsState = {
  code: string;
  name: string;
  agencyName: string;
  fishingUrl: string;
  regulationsUrl: string;
  reportsUrl?: string;
};

export type FishingResourceContext =
  | {
      kind: "us-state";
      label: string;
      locationLabel: string;
      state: UsState;
      links: FishingResourceLink[];
    }
  | {
      kind: "search";
      label: string;
      locationLabel: string;
      links: FishingResourceLink[];
    };

export const US_STATES: UsState[] = [
  {
    code: "AL",
    name: "Alabama",
    agencyName: "Alabama Department of Conservation and Natural Resources",
    fishingUrl: "https://www.outdooralabama.com/fishing",
    regulationsUrl: "https://www.outdooralabama.com/fishing/freshwater-fishing",
  },
  {
    code: "AK",
    name: "Alaska",
    agencyName: "Alaska Department of Fish and Game",
    fishingUrl: "https://www.adfg.alaska.gov/index.cfm?adfg=fishing.main",
    regulationsUrl:
      "https://www.adfg.alaska.gov/index.cfm?adfg=fishregulations.main",
    reportsUrl: "https://www.adfg.alaska.gov/sf/FishingReports/",
  },
  {
    code: "AZ",
    name: "Arizona",
    agencyName: "Arizona Game and Fish Department",
    fishingUrl: "https://www.azgfd.com/fishing-2/licenses-and-regulations/",
    regulationsUrl: "https://www.azgfd.com/fishing-2/licenses-and-regulations/",
  },
  {
    code: "AR",
    name: "Arkansas",
    agencyName: "Arkansas Game and Fish Commission",
    fishingUrl: "https://www.agfc.com/fishing/",
    regulationsUrl: "https://www.agfc.com/regulations/general-fishing-regulations/",
  },
  {
    code: "CA",
    name: "California",
    agencyName: "California Department of Fish and Wildlife",
    fishingUrl: "https://wildlife.ca.gov/Fishing",
    regulationsUrl: "https://wildlife.ca.gov/Regulations/Fishing",
  },
  {
    code: "CO",
    name: "Colorado",
    agencyName: "Colorado Parks and Wildlife",
    fishingUrl: "https://cpw.state.co.us/fishing",
    regulationsUrl: "https://cpw.state.co.us/rules-and-regulations",
  },
  {
    code: "CT",
    name: "Connecticut",
    agencyName: "Connecticut Department of Energy and Environmental Protection",
    fishingUrl: "https://portal.ct.gov/DEEP/Fishing",
    regulationsUrl: "https://portal.ct.gov/DEEP-Fishing-Guides",
  },
  {
    code: "DE",
    name: "Delaware",
    agencyName: "Delaware DNREC Division of Fish and Wildlife",
    fishingUrl: "https://dnrec.delaware.gov/fish-wildlife/fishing/",
    regulationsUrl:
      "https://dnrec.delaware.gov/fish-wildlife/fishing/regulations/",
  },
  {
    code: "DC",
    name: "District of Columbia",
    agencyName: "District Department of Energy and Environment",
    fishingUrl: "https://doee.dc.gov/service/fishdc",
    regulationsUrl: "https://doee.dc.gov/service/fishdc",
  },
  {
    code: "FL",
    name: "Florida",
    agencyName: "Florida Fish and Wildlife Conservation Commission",
    fishingUrl: "https://myfwc.com/fishing/",
    regulationsUrl: "https://myfwc.com/about/rules-regulations/",
  },
  {
    code: "GA",
    name: "Georgia",
    agencyName: "Georgia Department of Natural Resources",
    fishingUrl: "https://georgiawildlife.com/fishing/angler-resources",
    regulationsUrl: "https://georgiawildlife.com/fishing-regulations",
  },
  {
    code: "HI",
    name: "Hawaii",
    agencyName: "Hawaii Division of Aquatic Resources",
    fishingUrl: "https://dlnr.hawaii.gov/dar/fishing/",
    regulationsUrl: "https://dlnr.hawaii.gov/dar/fishing/fishing-regulations/",
  },
  {
    code: "ID",
    name: "Idaho",
    agencyName: "Idaho Fish and Game",
    fishingUrl: "https://idfg.idaho.gov/fish",
    regulationsUrl: "https://idfg.idaho.gov/rules/fish",
  },
  {
    code: "IL",
    name: "Illinois",
    agencyName: "Illinois Department of Natural Resources",
    fishingUrl: "https://ifishillinois.org/",
    regulationsUrl: "https://ifishillinois.org/site-documents/FishingDigest.pdf",
  },
  {
    code: "IN",
    name: "Indiana",
    agencyName: "Indiana Department of Natural Resources",
    fishingUrl: "https://www.in.gov/dnr/fish-and-wildlife/fishing/",
    regulationsUrl:
      "https://www.in.gov/dnr/fish-and-wildlife/fishing/fishing-guide-and-regulations/",
  },
  {
    code: "IA",
    name: "Iowa",
    agencyName: "Iowa Department of Natural Resources",
    fishingUrl: "https://www.iowadnr.gov/things-do/fishing",
    regulationsUrl:
      "https://www.iowadnr.gov/things-do/fishing/regulations-laws",
  },
  {
    code: "KS",
    name: "Kansas",
    agencyName: "Kansas Department of Wildlife and Parks",
    fishingUrl: "https://www.ksoutdoors.gov/outdoor-activities/fishing-in-kansas",
    regulationsUrl:
      "https://www.ksoutdoors.gov/programs-services/law-enforcement/regulations-statutes/fishing-regulations",
  },
  {
    code: "KY",
    name: "Kentucky",
    agencyName: "Kentucky Department of Fish and Wildlife Resources",
    fishingUrl: "https://fw.ky.gov/Fish/Pages/default.aspx",
    regulationsUrl: "https://fw.ky.gov/Fish/Pages/Recreational-Fishing.aspx",
  },
  {
    code: "LA",
    name: "Louisiana",
    agencyName: "Louisiana Department of Wildlife and Fisheries",
    fishingUrl: "https://www.wlf.louisiana.gov/page/recreational-fishing",
    regulationsUrl: "https://www.wlf.louisiana.gov/page/recreational-fishing",
  },
  {
    code: "ME",
    name: "Maine",
    agencyName: "Maine Department of Inland Fisheries and Wildlife",
    fishingUrl: "https://www.maine.gov/ifw/fishing-boating/fishing/index.html",
    regulationsUrl:
      "https://www.maine.gov/ifw/fishing-boating/fishing/laws-rules/index.html",
  },
  {
    code: "MD",
    name: "Maryland",
    agencyName: "Maryland Department of Natural Resources",
    fishingUrl: "https://dnr.maryland.gov/fisheries/Pages/default.aspx",
    regulationsUrl:
      "https://dnr.maryland.gov/fisheries/Pages/regulations/index.aspx",
  },
  {
    code: "MA",
    name: "Massachusetts",
    agencyName: "Massachusetts Division of Fisheries and Wildlife",
    fishingUrl: "https://www.mass.gov/fishing",
    regulationsUrl: "https://www.mass.gov/info-details/freshwater-fishing-regulations",
  },
  {
    code: "MI",
    name: "Michigan",
    agencyName: "Michigan Department of Natural Resources",
    fishingUrl: "https://www.michigan.gov/dnr/things-to-do/fishing",
    regulationsUrl:
      "https://www.michigan.gov/dnr/things-to-do/fishing/fishing-regulations",
  },
  {
    code: "MN",
    name: "Minnesota",
    agencyName: "Minnesota Department of Natural Resources",
    fishingUrl: "https://www.dnr.state.mn.us/fishing/index.html",
    regulationsUrl: "https://www.dnr.state.mn.us/regulations/fishing/index.html",
    reportsUrl: "https://www.dnr.state.mn.us/fishing/outlooks.html",
  },
  {
    code: "MS",
    name: "Mississippi",
    agencyName: "Mississippi Department of Wildlife, Fisheries, and Parks",
    fishingUrl: "https://www.mdwfp.com/fishing-boating",
    regulationsUrl:
      "https://www.mdwfp.com/enforcement-education/general-fishing-rules-regulations",
  },
  {
    code: "MO",
    name: "Missouri",
    agencyName: "Missouri Department of Conservation",
    fishingUrl: "https://mdc.mo.gov/fishing",
    regulationsUrl: "https://mdc.mo.gov/fishing/regulations",
  },
  {
    code: "MT",
    name: "Montana",
    agencyName: "Montana Fish, Wildlife & Parks",
    fishingUrl: "https://fwp.mt.gov/fish",
    regulationsUrl: "https://fwp.mt.gov/fish/regulations",
  },
  {
    code: "NE",
    name: "Nebraska",
    agencyName: "Nebraska Game and Parks Commission",
    fishingUrl: "https://outdoornebraska.gov/fish/",
    regulationsUrl:
      "https://outdoornebraska.gov/guides-maps/fishing-guides-reports/fishing-guide/",
  },
  {
    code: "NV",
    name: "Nevada",
    agencyName: "Nevada Department of Wildlife",
    fishingUrl: "https://www.ndow.org/apply-buy/fishing/",
    regulationsUrl: "https://www.ndow.org/get-outside/fishing/fishing-regulations/",
  },
  {
    code: "NH",
    name: "New Hampshire",
    agencyName: "New Hampshire Fish and Game Department",
    fishingUrl: "https://www.wildlife.nh.gov/fishing-new-hampshire",
    regulationsUrl:
      "https://www.wildlife.nh.gov/fishing-new-hampshire/fishing-rules-regulations",
  },
  {
    code: "NJ",
    name: "New Jersey",
    agencyName: "New Jersey Fish & Wildlife",
    fishingUrl: "https://dep.nj.gov/njfw/fishing/",
    regulationsUrl:
      "https://dep.nj.gov/njfw/fishing/freshwater-fishing-regulations/",
  },
  {
    code: "NM",
    name: "New Mexico",
    agencyName: "New Mexico Department of Game and Fish",
    fishingUrl: "https://wildlife.dgf.nm.gov/fishing/",
    regulationsUrl: "https://wildlife.dgf.nm.gov/enforcement/rules-penalties/",
  },
  {
    code: "NY",
    name: "New York",
    agencyName: "New York State Department of Environmental Conservation",
    fishingUrl: "https://dec.ny.gov/things-to-do/freshwater-fishing",
    regulationsUrl: "https://dec.ny.gov/things-to-do/freshwater-fishing/regulations",
  },
  {
    code: "NC",
    name: "North Carolina",
    agencyName: "North Carolina Wildlife Resources Commission",
    fishingUrl: "https://www.ncwildlife.gov/fishing",
    regulationsUrl: "https://www.ncwildlife.gov/fishing",
  },
  {
    code: "ND",
    name: "North Dakota",
    agencyName: "North Dakota Game and Fish Department",
    fishingUrl: "https://gf.nd.gov/fishing",
    regulationsUrl: "https://gf.nd.gov/regulations/fishing",
  },
  {
    code: "OH",
    name: "Ohio",
    agencyName: "Ohio Department of Natural Resources",
    fishingUrl:
      "https://ohiodnr.gov/discover-and-learn/safety-conservation/about-ODNR/wildlife/fishing",
    regulationsUrl:
      "https://ohiodnr.gov/discover-and-learn/safety-conservation/about-ODNR/wildlife/fishing-regulations",
  },
  {
    code: "OK",
    name: "Oklahoma",
    agencyName: "Oklahoma Department of Wildlife Conservation",
    fishingUrl: "https://www.wildlifedepartment.com/fishing",
    regulationsUrl: "https://www.wildlifedepartment.com/fishing/regs",
  },
  {
    code: "OR",
    name: "Oregon",
    agencyName: "Oregon Department of Fish and Wildlife",
    fishingUrl: "https://myodfw.com/fishing",
    regulationsUrl:
      "https://myodfw.com/articles/oregon-fishing-hunting-regulations-and-updates",
  },
  {
    code: "PA",
    name: "Pennsylvania",
    agencyName: "Pennsylvania Fish and Boat Commission",
    fishingUrl: "https://www.pa.gov/agencies/fishandboat/fishing",
    regulationsUrl:
      "https://www.pa.gov/agencies/fishandboat/fishing/regulations",
  },
  {
    code: "RI",
    name: "Rhode Island",
    agencyName: "Rhode Island Department of Environmental Management",
    fishingUrl:
      "https://dem.ri.gov/natural-resources-bureau/fish-wildlife/freshwater-fishing",
    regulationsUrl:
      "https://dem.ri.gov/natural-resources-bureau/fish-wildlife/rules-regulations/freshwater-sizes-and-limits",
  },
  {
    code: "SC",
    name: "South Carolina",
    agencyName: "South Carolina Department of Natural Resources",
    fishingUrl: "https://www.dnr.sc.gov/fishing.html",
    regulationsUrl: "https://www.dnr.sc.gov/regs/fishing.html",
  },
  {
    code: "SD",
    name: "South Dakota",
    agencyName: "South Dakota Game, Fish and Parks",
    fishingUrl: "https://gfp.sd.gov/fish/",
    regulationsUrl: "https://gfp.sd.gov/pages/regulations/",
  },
  {
    code: "TN",
    name: "Tennessee",
    agencyName: "Tennessee Wildlife Resources Agency",
    fishingUrl: "https://www.tn.gov/twra/fishing.html",
    regulationsUrl: "https://www.tn.gov/twra/fishing.html",
  },
  {
    code: "TX",
    name: "Texas",
    agencyName: "Texas Parks and Wildlife Department",
    fishingUrl: "https://tpwd.texas.gov/fishboat/fish/",
    regulationsUrl: "https://tpwd.texas.gov/regulations/outdoor-annual/fishing/",
  },
  {
    code: "UT",
    name: "Utah",
    agencyName: "Utah Division of Wildlife Resources",
    fishingUrl: "https://wildlife.utah.gov/fishing",
    regulationsUrl: "https://wildlife.utah.gov/guidebooks/",
  },
  {
    code: "VT",
    name: "Vermont",
    agencyName: "Vermont Fish & Wildlife Department",
    fishingUrl: "https://vtfishandwildlife.com/fish",
    regulationsUrl: "https://vtfishandwildlife.com/fish/fishing-regulations",
  },
  {
    code: "VA",
    name: "Virginia",
    agencyName: "Virginia Department of Wildlife Resources",
    fishingUrl: "https://dwr.virginia.gov/fishing/",
    regulationsUrl: "https://dwr.virginia.gov/fishing/regulations/",
  },
  {
    code: "WA",
    name: "Washington",
    agencyName: "Washington Department of Fish and Wildlife",
    fishingUrl: "https://wdfw.wa.gov/fishing",
    regulationsUrl: "https://wdfw.wa.gov/fishing/regulations",
  },
  {
    code: "WV",
    name: "West Virginia",
    agencyName: "West Virginia Division of Natural Resources",
    fishingUrl: "https://wvdnr.gov/fishing/",
    regulationsUrl: "https://wvdnr.gov/fishing/fishing-regulations/",
  },
  {
    code: "WI",
    name: "Wisconsin",
    agencyName: "Wisconsin Department of Natural Resources",
    fishingUrl: "https://dnr.wisconsin.gov/topic/Fishing",
    regulationsUrl: "https://dnr.wisconsin.gov/topic/Fishing/regulations",
  },
  {
    code: "WY",
    name: "Wyoming",
    agencyName: "Wyoming Game and Fish Department",
    fishingUrl: "https://wgfd.wyo.gov/fishing-boating",
    regulationsUrl: "https://wgfd.wyo.gov/Regulations/Fish/Fishing-Regulation",
  },
];

const US_STATE_BY_CODE = new Map(
  US_STATES.map((state) => [state.code, state]),
);
const US_STATE_BY_NAME = new Map(
  US_STATES.map((state) => [normalizeRegionValue(state.name), state]),
);

function normalizeRegionValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function isUnitedStates(country?: string | null) {
  if (!country) {
    return false;
  }

  const normalized = normalizeRegionValue(country);
  return ["us", "usa", "united states", "united states of america"].includes(
    normalized,
  );
}

function isNorthAmericaNiceToHave(country?: string | null) {
  if (!country) {
    return false;
  }

  const normalized = normalizeRegionValue(country);
  return ["canada", "mexico"].includes(normalized);
}

function getSearchUrl(query: string) {
  const url = new URL("https://www.google.com/search");
  url.searchParams.set("q", query);
  return url.toString();
}

function getLocationLabel(location: WeatherLocation) {
  return [location.name, location.admin1, location.country]
    .filter(Boolean)
    .join(", ");
}

function getUsStateFromValue(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const byCode = US_STATE_BY_CODE.get(trimmed.toUpperCase());
  if (byCode) {
    return byCode;
  }

  return US_STATE_BY_NAME.get(normalizeRegionValue(trimmed)) ?? null;
}

export function getUsStateForFishingLocation(location: WeatherLocation) {
  const state =
    getUsStateFromValue(location.admin1) ?? getUsStateFromValue(location.name);

  if (!state) {
    return null;
  }

  if (location.country && !isUnitedStates(location.country)) {
    return null;
  }

  return state;
}

function buildUsFishingResourceLinks(
  location: WeatherLocation,
  state: UsState,
  kind: FishingResourceKind,
): FishingResourceLink[] {
  const reportUrl =
    state.reportsUrl ??
    (state.fishingUrl !== state.regulationsUrl
      ? state.fishingUrl
      : getSearchUrl(`${getLocationLabel(location)} ${state.name} fishing reports`));
  const reportSourceLabel =
    state.reportsUrl || state.fishingUrl !== state.regulationsUrl
      ? state.agencyName
      : "Search";

  if (kind === "reports") {
    return [
      {
        title: `${state.name} Fishing Reports`,
        description:
          state.reportsUrl
            ? "Official state agency report information for recent activity and conditions."
            : "Closest available fishing report destination for local activity, conditions, and current updates.",
        url: reportUrl,
        sourceLabel: reportSourceLabel,
        isPrimary: true,
      },
    ];
  }

  return [
    {
      title: `${state.name} Fishing Regulations`,
      description:
        "Official state agency regulation information, including rules that may vary by season, species, or water body.",
      url: state.regulationsUrl,
      sourceLabel: state.agencyName,
      isPrimary: true,
    },
  ];
}

function buildSearchResourceLinks(
  location: WeatherLocation,
  kind: FishingResourceKind,
): FishingResourceLink[] {
  const locationLabel = getLocationLabel(location);
  const country = location.country?.trim();
  const regionLabel = [location.admin1, country].filter(Boolean).join(", ");
  const countryPrefix = isNorthAmericaNiceToHave(country)
    ? `${regionLabel || country} official`
    : `${locationLabel} official`;

  if (kind === "reports") {
    return [
      {
        title: "Local Fishing Reports Search",
        description:
          "Search for local reports near the selected place, including agency, guide, marina, and community updates.",
        url: getSearchUrl(`${locationLabel} fishing report`),
        sourceLabel: "Search",
        isPrimary: true,
      },
    ];
  }

  return [
    {
      title: "Official Regulations Search",
      description:
        "Search for current government fishing regulations for this region.",
      url: getSearchUrl(`${countryPrefix} fishing regulations`),
      sourceLabel: "Search",
      isPrimary: true,
    },
  ];
}

export function buildFishingResourceContext(
  location: WeatherLocation,
  kind: FishingResourceKind,
): FishingResourceContext {
  const state = getUsStateForFishingLocation(location);
  const locationLabel = getLocationLabel(location);

  if (state) {
    return {
      kind: "us-state",
      label: state.name,
      locationLabel,
      state,
      links: buildUsFishingResourceLinks(location, state, kind),
    };
  }

  return {
    kind: "search",
    label:
      [location.admin1, location.country].filter(Boolean).join(", ") ||
      location.name,
    locationLabel,
    links: buildSearchResourceLinks(location, kind),
  };
}
