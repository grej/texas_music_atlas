import { formatCity, isMeaningfulUrl } from "./data.js";

const DATA_URL = "/data/texas-music-venues.json";

const state = {
  venues: [],
  filtered: [],
  search: "",
  city: "all",
  type: "all",
};

async function loadVenues() {
  const response = await fetch(DATA_URL, { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(`Failed to load venue data (${response.status})`);
  }
  return response.json();
}

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

document.addEventListener("DOMContentLoaded", async () => {
  const searchInput = document.querySelector("#search");
  const citySelect = document.querySelector("#city-filter");
  const typeSelect = document.querySelector("#type-filter");

  if (!searchInput || !citySelect || !typeSelect) {
    return;
  }

  bindFilters(searchInput, citySelect, typeSelect);

  try {
    const data = await loadVenues();
    state.venues = data.venues.map((venue) => ({
      ...venue,
      slug: slugify(venue.name),
      instance: venue.instances[0], // Use first instance for display
      venueType: getVenueType(venue.tags),
    }));

    populateFilters(citySelect, typeSelect);
    updateFiltered();
  } catch (error) {
    console.error(error);
    renderListError();
  }
});

function bindFilters(searchInput, citySelect, typeSelect) {
  searchInput.addEventListener("input", () => {
    state.search = searchInput.value.trim().toLowerCase();
    updateFiltered();
  });

  citySelect.addEventListener("change", () => {
    state.city = citySelect.value;
    updateFiltered();
  });

  typeSelect.addEventListener("change", () => {
    state.type = typeSelect.value;
    updateFiltered();
  });
}

function populateFilters(citySelect, typeSelect) {
  // Populate city filter
  const cities = new Set(state.venues.map((v) => v.instance.city));
  const sortedCities = Array.from(cities).sort();

  sortedCities.forEach((city) => {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    citySelect.appendChild(option);
  });

  // Populate type filter
  const types = new Set(state.venues.map((v) => v.venueType));
  const sortedTypes = Array.from(types).sort();

  sortedTypes.forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = type;
    typeSelect.appendChild(option);
  });
}

function updateFiltered() {
  state.filtered = state.venues.filter((venue) => {
    // City filter
    if (state.city !== "all" && venue.instance.city !== state.city) {
      return false;
    }

    // Type filter
    if (state.type !== "all" && venue.venueType !== state.type) {
      return false;
    }

    // Search filter
    if (state.search) {
      const searchable = [
        venue.name,
        venue.instance.city,
        venue.instance.venue_name,
        venue.instance.description,
        venue.instance.address,
      ]
        .join(" ")
        .toLowerCase();

      if (!searchable.includes(state.search)) {
        return false;
      }
    }

    return true;
  });

  renderList();
}

function renderList() {
  const container = document.querySelector("#list-view");
  if (!container) {
    return;
  }

  if (!state.filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No venues match the current filters.</h3>
        <p>Try clearing your search or selecting different filters.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.filtered
    .map((venue) => {
      const detailLink = `venue.html#${venue.slug}`;
      const instance = venue.instance;
      const mapLink =
        isMeaningfulUrl(instance.google_maps_url)
          ? `<a href="${instance.google_maps_url}" target="_blank" rel="noopener noreferrer">Open map</a>`
          : "";

      return `
        <article class="card">
          <div class="pill-row">
            <span class="pill">${venue.venueType}</span>
          </div>
          <h3>${venue.name}</h3>
          <p>${instance.description}</p>
          <div class="pill-row">
            <span class="pill">📍 ${formatCity(instance.city)}</span>
            <span class="pill">🏛️ ${instance.venue_name}</span>
          </div>
          <div class="card-actions">
            <a href="${detailLink}" aria-label="View details for ${venue.name}">Venue detail</a>
            ${
              isMeaningfulUrl(instance.website_url)
                ? `<a href="${instance.website_url}" target="_blank" rel="noopener noreferrer">Visit website</a>`
                : ""
            }
            ${mapLink}
          </div>
        </article>
      `;
    })
    .join("");
}

function renderListError() {
  const container = document.querySelector("#list-view");
  if (!container) return;

  container.innerHTML = `
    <div class="empty-state">
      <h3>Unable to load the venue directory.</h3>
      <p>Refresh the page or check that the data file is available.</p>
    </div>
  `;
}
