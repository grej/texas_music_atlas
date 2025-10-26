import { buildFestivalMap, formatDateRange, instanceToICS, isMeaningfulUrl, loadFestivals, summarizeInstances } from "./data.js";

const pageState = {
  map: null,
  festival: null,
  instances: [],
  currentIndex: 0,
};

document.addEventListener("DOMContentLoaded", async () => {
  const slug = resolveSlug();
  const hero = document.querySelector("#detail-hero");

  if (!slug && hero) {
    hero.querySelector("#festival-name").textContent = "Choose a festival from the directory";
    hero.querySelector("#festival-description").textContent =
      "Add a hash to the URL like #dripping-springs-songwriters-festival to load matching details.";
    return;
  }

  try {
    const data = await loadFestivals();
    pageState.map = buildFestivalMap(data);
    renderSlug(slug);

    window.addEventListener("hashchange", () => {
      const nextSlug = resolveSlug();
      renderSlug(nextSlug);
    });
  } catch (error) {
    console.error(error);
    showError("We were unable to load the festival data. Please try again later.");
  }
});

function resolveSlug() {
  const hash = window.location.hash.replace("#", "").trim();

  if (hash) {
    return hash;
  }

  const searchParams = new URLSearchParams(window.location.search);
  return (searchParams.get("slug") || "").trim();
}

function renderSlug(slug) {
  if (!slug || !pageState.map) {
    return;
  }

  if (!pageState.map.has(slug)) {
    showError(`No festival found for slug “${slug}”. Check the hash and try again.`);
    return;
  }

  const festival = pageState.map.get(slug);
  const instances = summarizeInstances(enrichInstances(festival));

  pageState.festival = festival;
  pageState.instances = instances;
  pageState.currentIndex = pickDefaultInstanceIndex(instances);

  updateHero(festival, instances[pageState.currentIndex]);
  populateInstanceSelect(instances, pageState.currentIndex);
  renderInstance(instances[pageState.currentIndex]);
}

function enrichInstances(festival) {
  return festival.instances.map((instance) => ({
    slug: festival.slug,
    festivalName: festival.name,
    festivalDescription: festival.description,
    year: instance.year,
    startDate: instance.start_date,
    endDate: instance.end_date,
    startDateObj: instance.startDateObj,
    endDateObj: instance.endDateObj,
    dateRangeLabel: instance.dateRangeLabel,
    city: instance.city,
    venueName: instance.venue_name,
    address: instance.address,
    websiteUrl: instance.website_url,
    mapsUrl: instance.google_maps_url,
    costNotes: instance.cost_notes,
    description: instance.description || festival.description,
  }));
}

function pickDefaultInstanceIndex(instances) {
  const today = stripTime(new Date());
  const upcomingIndex = instances.findIndex((instance) => {
    if (instance.startDateObj) {
      return instance.startDateObj >= today;
    }
    if (instance.endDateObj) {
      return instance.endDateObj >= today;
    }
    return false;
  });

  return upcomingIndex >= 0 ? upcomingIndex : 0;
}

function updateHero(festival, instance) {
  const nameEl = document.querySelector("#festival-name");
  const descEl = document.querySelector("#festival-description");
  const datesEl = document.querySelector("#festival-dates");
  const locationEl = document.querySelector("#festival-location");
  const yearEl = document.querySelector("#festival-year");
  const countEl = document.querySelector("#instance-count");
  const linksEl = document.querySelector("#festival-links");

  if (!nameEl || !descEl) return;

  nameEl.textContent = festival.name;
  descEl.textContent =
    festival.description ||
    instance.description ||
    "A Texas songwriter gathering with intimate performances and collaborative rounds.";
  datesEl.textContent = instance.dateRangeLabel;
  locationEl.textContent = instance.city;
  yearEl.textContent = instance.year;
  if (countEl) {
    countEl.textContent =
      pageState.instances.length > 1
        ? `Choose a season to view specific dates.`
        : "";
  }
  linksEl.innerHTML = renderLinkButtons(instance);
}

function populateInstanceSelect(instances, selectedIndex) {
  const select = document.querySelector("#instance-select");
  if (!select) return;

  select.innerHTML = instances
    .map(
      (instance, index) => `
        <option value="${index}" ${index === selectedIndex ? "selected" : ""}>
          ${instance.year} · ${instance.dateRangeLabel}
        </option>
      `
    )
    .join("");

  if (!select.dataset.bound) {
    select.addEventListener("change", (event) => {
      const index = Number.parseInt(event.target.value, 10);
      if (Number.isNaN(index) || !pageState.instances[index]) {
        return;
      }
      pageState.currentIndex = index;
      renderInstance(pageState.instances[index]);
    });
    select.dataset.bound = "true";
  }
}

function renderInstance(instance) {
  if (pageState.festival) {
    updateHero(pageState.festival, instance);
  }

  const overviewEl = document.querySelector("#festival-overview");
  const venueEl = document.querySelector("#festival-venue");
  const addressEl = document.querySelector("#festival-address");
  const rangeEl = document.querySelector("#festival-range");
  const costEl = document.querySelector("#festival-cost");
  const noticeEl = document.querySelector("#festival-notice");

  if (!overviewEl) return;

  overviewEl.textContent = instance.description || "More details coming soon.";
  venueEl.textContent = instance.venueName || "Venue TBA";
  addressEl.textContent = instance.address || "Address coming soon";
  rangeEl.textContent = formatDateRange(instance.startDate, instance.endDate);
  costEl.textContent = instance.costNotes || "Pricing not announced yet.";

  const notices = [];
  if (!instance.startDate || instance.startDate === "TBD") {
    notices.push("Exact dates are still pending—keep an eye on the official site for updates.");
  }
  if (!isMeaningfulUrl(instance.mapsUrl)) {
    notices.push("Map links will appear once locations are finalized.");
  }

  if (notices.length && noticeEl) {
    noticeEl.textContent = notices.join(" ");
    noticeEl.hidden = false;
  } else if (noticeEl) {
    noticeEl.hidden = true;
  }
}

function renderLinkButtons(instance) {
  const links = [];
  if (isMeaningfulUrl(instance.websiteUrl)) {
    links.push(`<a href="${instance.websiteUrl}" target="_blank" rel="noopener noreferrer">Official website</a>`);
  }
  if (isMeaningfulUrl(instance.mapsUrl)) {
    links.push(`<a href="${instance.mapsUrl}" target="_blank" rel="noopener noreferrer">View on maps</a>`);
  }
  const icsResult = instanceToICS({
    name: pageState.festival?.name || instance.festivalName,
    start_date: instance.startDate,
    end_date: instance.endDate,
    address: instance.address,
    website_url: instance.websiteUrl,
    description: instance.description,
  });
  if (icsResult.status === "ready") {
    links.push(`<a href="${icsResult.href}" download="${pageState.festival?.slug || instance.slug || "festival"}.ics">Add to calendar</a>`);
  } else if (icsResult.status === "pending") {
    links.push(`<span class="btn-disabled" aria-disabled="true" title="${icsResult.reason}">Add to calendar (TBD)</span>`);
  }
  return links.join("");
}

function showError(message) {
  const nameEl = document.querySelector("#festival-name");
  const descEl = document.querySelector("#festival-description");
  const overviewEl = document.querySelector("#festival-overview");
  if (nameEl) nameEl.textContent = "Festival unavailable";
  if (descEl) descEl.textContent = message;
  if (overviewEl) overviewEl.textContent = message;
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
