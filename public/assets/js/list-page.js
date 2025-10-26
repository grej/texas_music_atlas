import {
  expandInstances,
  formatCity,
  formatDate,
  formatDateRange,
  instanceToICS,
  isMeaningfulUrl,
  isUpcoming,
  loadFestivals,
  summarizeInstances,
} from "./data.js";

const state = {
  instances: [],
  filtered: [],
  months: [],
  calendarMap: new Map(),
  selectedMonthKey: null,
  selectedDate: null,
  search: "",
  year: "all",
  showPast: false,
};

document.addEventListener("DOMContentLoaded", async () => {
  const searchInput = document.querySelector("#search");
  const yearSelect = document.querySelector("#year-filter");
  const listToggle = document.querySelector("#list-toggle");
  const calendarToggle = document.querySelector("#calendar-toggle");
  const showPastToggle = document.querySelector("#show-past");

  if (!searchInput || !yearSelect || !listToggle || !calendarToggle) {
    return;
  }

  bindFilters(searchInput, yearSelect);
  bindViewToggles(listToggle, calendarToggle);
  bindMonthSelect();
  bindCalendarClicks();
  bindPastToggle(showPastToggle);

  try {
    const data = await loadFestivals();
    state.instances = summarizeInstances(expandInstances(data));
    updateFiltered();
  } catch (error) {
    console.error(error);
    renderListError();
  }
});

function bindFilters(searchInput, yearSelect) {
  searchInput.addEventListener("input", () => {
    state.search = searchInput.value.trim().toLowerCase();
    updateFiltered();
  });

  yearSelect.addEventListener("change", () => {
    state.year = yearSelect.value;
    updateFiltered();
  });
}

function bindViewToggles(listToggle, calendarToggle) {
  listToggle.addEventListener("click", () => setView("list"));
  calendarToggle.addEventListener("click", () => setView("calendar"));
}

function bindMonthSelect() {
  const select = document.querySelector("#month-select");
  if (!select) return;

  select.addEventListener("change", (event) => {
    state.selectedMonthKey = event.target.value || null;
    renderCalendar();
  });
}

function bindCalendarClicks() {
  const grid = document.querySelector("#calendar-grid");
  if (!grid) return;

  grid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-date]");
    if (!button) return;
    const { date } = button.dataset;
    showDayDetail(date);
  });
}

function bindPastToggle(toggle) {
  if (!toggle) return;
  state.showPast = toggle.checked;
  toggle.addEventListener("change", () => {
    state.showPast = toggle.checked;
    updateFiltered();
  });
}

function setView(view) {
  const listSection = document.querySelector("#list-view");
  const calendarSection = document.querySelector("#calendar-view");
  const listToggle = document.querySelector("#list-toggle");
  const calendarToggle = document.querySelector("#calendar-toggle");

  if (!listSection || !calendarSection) {
    return;
  }

  const isList = view === "list";
  listSection.hidden = !isList;
  calendarSection.hidden = isList;
  listSection.dataset.visible = isList;

  if (listToggle && calendarToggle) {
    listToggle.setAttribute("aria-pressed", isList ? "true" : "false");
    calendarToggle.setAttribute("aria-pressed", isList ? "false" : "true");
  }

  if (!isList) {
    renderCalendar();
  }
}

function updateFiltered() {
  const searchTerm = state.search || "";
  const year = state.year || "all";
  const includePast = state.showPast;
  const today = new Date();

  state.filtered = state.instances.filter((instance) => {
    const matchesYear = year === "all" || String(instance.year) === year;
    const matchesSearch = searchTerm
      ? `${instance.festivalName} ${instance.instanceDescription} ${instance.city} ${instance.venueName}`
          .toLowerCase()
          .includes(searchTerm)
      : true;

    if (!matchesYear || !matchesSearch) {
      return false;
    }

    if (includePast) {
      return true;
    }

    const hasConcreteDates = Boolean(instance.startDateObj || instance.endDateObj);
    if (!hasConcreteDates) {
      return true;
    }

    return isUpcoming(instance, today);
  });

  renderList();
  prepareCalendarData();

  const calendarSection = document.querySelector("#calendar-view");
  if (calendarSection && !calendarSection.hidden) {
    renderCalendar();
  }
}

function renderList() {
  const container = document.querySelector("#list-view");
  if (!container) {
    return;
  }

  if (!state.filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No festivals match the current filters.</h3>
        <p>Try clearing your search or selecting a different year.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.filtered
    .map((instance) => {
      const detailLink = `event.html#${instance.slug}`;
      const mapLink =
        isMeaningfulUrl(instance.mapsUrl) && instance.mapsUrl !== "TBA"
          ? `<a href="${instance.mapsUrl}" target="_blank" rel="noopener noreferrer">Open map</a>`
          : "";
      const icsResult = instanceToICS({
        name: instance.festivalName,
        start_date: instance.startDate,
        end_date: instance.endDate,
        address: instance.address,
        website_url: instance.websiteUrl,
        description: instance.instanceDescription,
      });

      return `
        <article class="card">
          <div class="pill-row">
            <span class="pill"><strong>${instance.year}</strong> season</span>
            <span class="pill">${instance.dateRangeLabel}</span>
          </div>
          <h3>${instance.festivalName}</h3>
          <p>${instance.instanceDescription}</p>
          <div class="pill-row">
            <span class="pill">📍 ${formatCity(instance.city)}</span>
            <span class="pill">🏛️ ${instance.venueName}</span>
          </div>
          <div class="card-actions">
            <a href="${detailLink}" aria-label="View details for ${instance.festivalName}">Festival detail</a>
            ${
              isMeaningfulUrl(instance.websiteUrl)
                ? `<a href="${instance.websiteUrl}" target="_blank" rel="noopener noreferrer">Visit website</a>`
                : ""
            }
            ${
              icsResult.status === "ready"
                ? `<a href="${icsResult.href}" download="${instance.slug || "festival"}-${instance.year}.ics">Add to calendar</a>`
                : icsResult.status === "pending"
                ? `<span class="btn-disabled" aria-disabled="true" title="${icsResult.reason}">Add to calendar (TBD)</span>`
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
      <h3>Unable to load the directory.</h3>
      <p>Refresh the page or check that the data file is available.</p>
    </div>
  `;
}

function prepareCalendarData() {
  const months = new Map();
  const dateMap = new Map();

  state.filtered.forEach((instance) => {
    if (!instance.startDateObj && !instance.endDateObj) {
      return;
    }

    const start = instance.startDateObj || instance.endDateObj;
    const end = instance.endDateObj || start;

    if (!start) {
      return;
    }

    const cursor = new Date(start);
    const last = new Date(end || start);

    while (cursor <= last) {
      const dateKey = toISODate(cursor);
      const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;

      if (!months.has(monthKey)) {
        months.set(monthKey, {
          key: monthKey,
          year: cursor.getFullYear(),
          monthIndex: cursor.getMonth(),
        });
      }

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }

      const list = dateMap.get(dateKey);
      if (!list.some((item) => item.slug === instance.slug && item.year === instance.year)) {
        list.push(instance);
      }

      cursor.setDate(cursor.getDate() + 1);
    }
  });

  state.months = Array.from(months.values()).sort((a, b) => {
    if (a.year === b.year) {
      return a.monthIndex - b.monthIndex;
    }

    return a.year - b.year;
  });

  state.calendarMap = dateMap;
  if (state.selectedMonthKey && !state.months.some((month) => month.key === state.selectedMonthKey)) {
    state.selectedMonthKey = state.months.length ? state.months[0].key : null;
  }
  syncMonthSelect();
}

function syncMonthSelect() {
  const select = document.querySelector("#month-select");
  if (!select) return;

  if (!state.months.length) {
    select.innerHTML = `<option value="">No dated festivals yet</option>`;
    state.selectedMonthKey = null;
    renderCalendar();
    return;
  }

  select.innerHTML = state.months
    .map((month, index) => {
      const label = monthLabel(month.year, month.monthIndex);
      const selected =
        state.selectedMonthKey === month.key || (!state.selectedMonthKey && index === 0)
          ? ' selected'
          : "";
      return `<option value="${month.key}"${selected}>${label}</option>`;
    })
    .join("");

  if (!state.selectedMonthKey) {
    state.selectedMonthKey = state.months[0].key;
  }

  renderCalendar();
}

function renderCalendar() {
  const grid = document.querySelector("#calendar-grid");
  const detailPanel = document.querySelector("#day-detail");

  if (!grid) return;

  grid.innerHTML = "";
  state.selectedDate = null;
  if (detailPanel) {
    detailPanel.hidden = true;
  }

  if (!state.selectedMonthKey) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1">
        <h3>No calendar data</h3>
        <p>Choose another filter or add exact dates to the dataset.</p>
      </div>
    `;
    return;
  }

  const month = state.months.find((entry) => entry.key === state.selectedMonthKey);

  if (!month) {
    return;
  }

  const firstDay = new Date(month.year, month.monthIndex, 1);
  const daysInMonth = new Date(month.year, month.monthIndex + 1, 0).getDate();
  const offset = firstDay.getDay();

  for (let i = 0; i < offset; i += 1) {
    grid.appendChild(emptyCalendarCell());
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(month.year, month.monthIndex, day);
    const dateKey = toISODate(date);
    const instances = state.calendarMap.get(dateKey) || [];

    grid.appendChild(calendarCell(day, dateKey, instances));
  }
}

function emptyCalendarCell() {
  const cell = document.createElement("div");
  cell.className = "calendar-day";
  cell.setAttribute("aria-disabled", "true");
  cell.setAttribute("role", "gridcell");
  return cell;
}

function calendarCell(dayNumber, dateKey, instances) {
  const cell = document.createElement("div");
  cell.className = "calendar-day";
  cell.dataset.date = dateKey;
  cell.setAttribute("role", "gridcell");

  if (instances.length) {
    cell.dataset.hasEvents = "true";
  }

  cell.innerHTML = `
    <button type="button" data-date="${dateKey}" aria-label="Show events for ${formatDate(dateKey)}">
      <span>${dayNumber}</span>
      ${instances.length ? renderDayEvents(instances) : ""}
    </button>
  `;

  return cell;
}

function renderDayEvents(instances) {
  const top = instances.slice(0, 3);
  const more = instances.length - top.length;

  const items = top
    .map((instance) => `<span class="day-event-pill">${instance.festivalName}</span>`)
    .join("");

  const suffix = more > 0 ? `<span class="day-event-pill">+${more} more</span>` : "";

  return `<div class="day-events">${items}${suffix}</div>`;
}

function showDayDetail(dateKey) {
  const detailPanel = document.querySelector("#day-detail");
  const heading = document.querySelector("#day-detail-heading");
  const list = document.querySelector("#day-detail-list");

  if (!detailPanel || !heading || !list) return;

  const instances = state.calendarMap.get(dateKey) || [];

  if (!instances.length) {
    detailPanel.hidden = true;
    state.selectedDate = null;
    return;
  }

  state.selectedDate = dateKey;
  heading.textContent = formatDate(dateKey);
  list.innerHTML = instances
    .map((instance) => {
      const icsResult = instanceToICS({
        name: instance.festivalName,
        start_date: instance.startDate,
        end_date: instance.endDate,
        address: instance.address,
        website_url: instance.websiteUrl,
        description: instance.instanceDescription,
      });
      return `
      <li>
        <strong>${instance.festivalName}</strong>
        <span class="muted">${formatDateRange(instance.startDate, instance.endDate)} · ${formatCity(instance.city)}</span>
        <div class="card-actions">
          <a href="event.html#${instance.slug}">Festival detail</a>
          ${
            isMeaningfulUrl(instance.websiteUrl)
              ? `<a href="${instance.websiteUrl}" target="_blank" rel="noopener noreferrer">Festival site</a>`
              : ""
          }
          ${
            icsResult.status === "ready"
              ? `<a href="${icsResult.href}" download="${instance.slug || "festival"}-${instance.year}.ics">Add to calendar</a>`
              : icsResult.status === "pending"
              ? `<span class="btn-disabled" aria-disabled="true" title="${icsResult.reason}">Add to calendar (TBD)</span>`
              : ""
          }
          ${
            isMeaningfulUrl(instance.mapsUrl)
              ? `<a href="${instance.mapsUrl}" target="_blank" rel="noopener noreferrer">Open map</a>`
              : ""
          }
        </div>
      </li>
    `;
    })
    .join("");

  detailPanel.hidden = false;
}

function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthLabel(year, monthIndex) {
  const date = new Date(year, monthIndex, 1);
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}
