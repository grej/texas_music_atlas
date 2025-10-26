import { isMeaningfulUrl } from "./data.js";

const DATA_URL = "/data/texas-music-venues.json";

const pageState = {
  venues: new Map(),
  currentVenue: null,
};

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getVenueType(tags) {
  const typeMap = {
    listening_room: "Listening Room",
    dance_hall: "Dance Hall",
    winery: "Winery",
    wine_bar: "Wine Bar",
    brewery: "Brewery",
    bar: "Bar",
    saloon: "Saloon",
    coffee_shop: "Coffee Shop",
    restaurant: "Restaurant",
  };

  for (const tag of tags || []) {
    if (typeMap[tag]) {
      return typeMap[tag];
    }
  }
  return "Music Venue";
}

async function loadVenues() {
  const response = await fetch(DATA_URL, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Failed to load venue data (${response.status})`);
  }
  return response.json();
}

document.addEventListener("DOMContentLoaded", async () => {
  const slug = resolveSlug();
  const hero = document.querySelector("#detail-hero");

  if (!slug && hero) {
    hero.querySelector("#venue-name").textContent = "Choose a venue from the directory";
    hero.querySelector("#venue-description").textContent =
      "Add a hash to the URL like #gruene-hall to load matching details.";
    return;
  }

  try {
    const data = await loadVenues();

    // Build venue map with slugs
    data.venues.forEach((venue) => {
      const slug = slugify(venue.name);
      pageState.venues.set(slug, venue);
    });

    renderSlug(slug);

    window.addEventListener("hashchange", () => {
      const nextSlug = resolveSlug();
      renderSlug(nextSlug);
    });
  } catch (error) {
    console.error(error);
    showError("We were unable to load the venue data. Please try again later.");
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
  if (!slug || !pageState.venues.size) {
    return;
  }

  if (!pageState.venues.has(slug)) {
    showError(`No venue found for slug "${slug}". Check the hash and try again.`);
    return;
  }

  const venue = pageState.venues.get(slug);
  pageState.currentVenue = venue;

  const instance = venue.instances[0]; // Venues typically have one instance
  const venueType = getVenueType(venue.tags);

  updateHero(venue, instance, venueType);
  renderVenue(venue, instance);
}

function updateHero(venue, instance, venueType) {
  const nameEl = document.querySelector("#venue-name");
  const descEl = document.querySelector("#venue-description");
  const locationEl = document.querySelector("#venue-location");
  const typeEl = document.querySelector("#venue-type");
  const linksEl = document.querySelector("#venue-links");

  if (!nameEl || !descEl) return;

  nameEl.textContent = venue.name;
  descEl.textContent = instance.description || "A Texas music venue featuring live performances.";
  locationEl.textContent = instance.city;
  typeEl.textContent = venueType;
  linksEl.innerHTML = renderLinkButtons(instance);
}

function renderVenue(venue, instance) {
  const overviewEl = document.querySelector("#venue-overview");
  const venueNameEl = document.querySelector("#venue-venue-name");
  const addressEl = document.querySelector("#venue-address");
  const cityEl = document.querySelector("#venue-city");
  const costEl = document.querySelector("#venue-cost");

  if (!overviewEl) return;

  overviewEl.textContent = instance.description || "More details coming soon.";
  venueNameEl.textContent = instance.venue_name || venue.name;
  addressEl.textContent = instance.address || "Address information pending";
  cityEl.textContent = instance.city || "—";
  costEl.textContent = instance.cost_notes || "Check venue website for current pricing.";
}

function renderLinkButtons(instance) {
  const links = [];

  if (isMeaningfulUrl(instance.website_url)) {
    links.push(`<a href="${instance.website_url}" target="_blank" rel="noopener noreferrer">Visit website</a>`);
  }

  if (isMeaningfulUrl(instance.google_maps_url)) {
    links.push(`<a href="${instance.google_maps_url}" target="_blank" rel="noopener noreferrer">View on maps</a>`);
  }

  return links.join("");
}

function showError(message) {
  const nameEl = document.querySelector("#venue-name");
  const descEl = document.querySelector("#venue-description");
  const overviewEl = document.querySelector("#venue-overview");

  if (nameEl) nameEl.textContent = "Venue unavailable";
  if (descEl) descEl.textContent = message;
  if (overviewEl) overviewEl.textContent = message;
}
