const DATA_URL = "/data/texas_songwriter_festivals_2025_2026.json";

let cachedPromise;

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export async function loadFestivals() {
  if (!cachedPromise) {
    cachedPromise = fetch(DATA_URL, { cache: "no-cache" }).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load festival data (${response.status})`);
      }

      return response.json();
    });
  }

  return cachedPromise;
}

export function slugify(name) {
  if (!name || typeof name !== "string") {
    return "";
  }

  return name
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseDate(value) {
  if (!value || value === "TBD") {
    return null;
  }

  return new Date(`${value}T00:00:00`);
}

export function formatDate(value) {
  const parsed = parseDate(value);
  return parsed ? dateFormatter.format(parsed) : "TBD";
}

export function formatDateRange(startValue, endValue) {
  const start = parseDate(startValue);
  const end = parseDate(endValue);

  if (!start && !end) {
    return "Dates TBD";
  }

  if (start && !end) {
    return `Starts ${dateFormatter.format(start)}`;
  }

  if (!start && end) {
    return `Ends ${dateFormatter.format(end)}`;
  }

  if (start && end) {
    const sameDay = start.getTime() === end.getTime();
    return sameDay
      ? dateFormatter.format(start)
      : `${dateFormatter.format(start)} – ${dateFormatter.format(end)}`;
  }

  return "Dates TBD";
}

export function expandInstances(data) {
  return data.events.flatMap((festival) => {
    if (!festival?.name) {
      console.warn("Skipping festival without a name field.", festival);
      return [];
    }

    const slug = slugify(festival.name);
    const baseDescription = festival.summary || festival.description || "";

    return festival.instances.map((instance) => {
      const startDateObj = parseDate(instance.start_date);
      const endDateObj = parseDate(instance.end_date);

      return {
        slug,
        festivalName: festival.name,
        festivalDescription: baseDescription || instance.description || "",
        instanceDescription: instance.description || baseDescription || "",
        year: instance.year,
        startDate: instance.start_date,
        endDate: instance.end_date,
        city: instance.city,
        venueName: instance.venue_name,
        address: instance.address,
        mapsUrl: instance.google_maps_url,
        websiteUrl: instance.website_url,
        costNotes: instance.cost_notes,
        startDateObj,
        endDateObj,
        hasExactDates: Boolean(startDateObj && endDateObj),
        dateRangeLabel: formatDateRange(instance.start_date, instance.end_date),
      };
    });
  });
}

export function buildFestivalMap(data) {
  return data.events.reduce((map, festival) => {
    if (!festival?.name) {
      console.warn("Skipping unnamed festival while building map.", festival);
      return map;
    }

    const slug = slugify(festival.name);
    map.set(slug, {
      ...festival,
      slug,
      description: festival.summary || festival.description || deriveFestivalDescription(festival),
      instances: festival.instances.map((instance) => ({
        ...instance,
        startDateObj: parseDate(instance.start_date),
        endDateObj: parseDate(instance.end_date),
        dateRangeLabel: formatDateRange(instance.start_date, instance.end_date),
      })),
    });
    return map;
  }, new Map());
}

function deriveFestivalDescription(festival) {
  const richest = festival.instances
    .map((instance) => instance.description || "")
    .sort((a, b) => b.length - a.length)[0];
  return richest || "";
}

export function summarizeInstances(instances) {
  const withDates = instances.filter((instance) => instance.startDateObj);
  const withoutDates = instances.filter((instance) => !instance.startDateObj);

  return [
    ...withDates.sort((a, b) => a.startDateObj - b.startDateObj),
    ...withoutDates.sort((a, b) => String(a.year).localeCompare(String(b.year))),
  ];
}

export function isUpcoming(instance, referenceDate = new Date()) {
  if (instance.startDateObj) {
    return instance.startDateObj >= stripTime(referenceDate);
  }

  if (instance.endDateObj) {
    return instance.endDateObj >= stripTime(referenceDate);
  }

  return false;
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function formatCity(city) {
  return city || "Texas";
}

export function isMeaningfulUrl(url) {
  if (!url || typeof url !== "string") {
    return false;
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return false;
  }

  const upper = trimmed.toUpperCase();
  if (upper === "TBD" || upper === "TBA" || upper === "COMING SOON") {
    return false;
  }

  try {
    const parsed = new URL(trimmed, "https://placeholder.local");
    const protocol = parsed.protocol.replace(":", "");
    if (parsed.origin === "https://placeholder.local") {
      return false;
    }
    return protocol === "http" || protocol === "https";
  } catch {
    return false;
  }
}
