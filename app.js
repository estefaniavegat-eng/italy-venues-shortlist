(() => {
  const STORAGE_KEY = "ej-italy-shortlist-v1";
  const CALC_KEY = "ej-italy-calc-defaults-v1";
  const NOTES_KEY = "ej-italy-venue-notes-v1";

  const heartSvg = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.716-4.35-9.428-7.062C.86 12.226.5 10.2.5 8.75.5 5.962 2.762 3.7 5.55 3.7c1.54 0 3.02.72 4 1.86A5.18 5.18 0 0 1 13.55 3.7c2.788 0 5.05 2.262 5.05 5.05 0 1.45-.36 3.476-2.072 5.188C18.716 16.65 12 21 12 21z"/></svg>`;
  const iconPeople = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M16 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 2c-2.67 0-8 1.34-8 4v2h10v-2c0-1.5.7-2.7 1.8-3.6C10.5 13.1 9.2 13 8 13zm8 0c-.3 0-.63.02-.97.05A4.86 4.86 0 0 1 17 17v2h7v-2c0-2.66-5.33-4-8-4z"/></svg>`;
  const iconEuro = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1.2 14.5h-1.7c-.9 0-1.7-.3-2.3-.8-.4.2-.8.3-1.2.3h-.8v-1.5h.6c.3 0 .5-.05.7-.15A3.7 3.7 0 0 1 7.8 13H6.5v-1.5h1.2c0-.35.05-.7.12-1H6.5V9h1.55A3.9 3.9 0 0 1 11.5 6.8h1.7v1.5h-.9c-.7 0-1.35.3-1.8.8.55-.2 1.15-.3 1.8-.3h1.1v1.5h-1.1c-.55 0-1.05.1-1.5.3.2.35.35.75.4 1.2h2.2V13h-2.15c-.05.55-.2 1.05-.45 1.5.45.3 1 .5 1.6.5h.9v1.5z"/></svg>`;
  const iconCal = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>`;

  const AVG = {
    planner: [3000, 5000],
    photo: [3000, 4500],
    video: [2500, 4000],
    florals: [3000, 6000],
    dj: [1000, 2000],
    ceremony: [500, 1000],
    transport: [1500, 3000],
    fbDinnerBar: [150, 220],
    welcome: [50, 80],
    brunch: [25, 40],
    overflowRoomNight: [180, 280],
    contingencyPct: 0.1,
  };

  const state = {
    venues: [],
    meta: {},
    view: "all",
    region: "All",
    band: "all",
    query: "",
    shortlist: loadShortlist(),
    notes: loadNotes(),
    activeId: null,
    calcDefaults: loadCalcDefaults(),
    galleryIndex: 0,
    notesTimer: null,
  };

  const els = {
    cards: document.getElementById("cards"),
    empty: document.getElementById("empty"),
    chips: document.getElementById("region-chips"),
    search: document.getElementById("search"),
    band: document.getElementById("band-filter"),
    count: document.getElementById("shortlist-count"),
    resultCount: document.getElementById("result-count"),
    viewTitle: document.getElementById("view-title"),
    tabs: document.querySelectorAll(".tab"),
    overlay: document.getElementById("overlay"),
    drawer: document.getElementById("drawer"),
    drawerContent: document.getElementById("drawer-content"),
    drawerClose: document.getElementById("drawer-close"),
    toolbar: document.getElementById("toolbar"),
  };

  function loadShortlist() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return new Set(Array.isArray(arr) ? arr : []);
    } catch {
      return new Set();
    }
  }

  function loadNotes() {
    try {
      const raw = localStorage.getItem(NOTES_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === "object" && !Array.isArray(obj) ? obj : {};
    } catch {
      return {};
    }
  }

  function saveNotes() {
    localStorage.setItem(NOTES_KEY, JSON.stringify(state.notes));
  }

  function venueHasNotes(id) {
    const t = (state.notes[id] || "").trim();
    return t.length > 0;
  }

  function galleryFor(v) {
    const g = Array.isArray(v.gallery) ? v.gallery.filter(Boolean) : [];
    if (g.length) return g;
    if (v.image) return [v.image];
    return [];
  }

  function resolveBrochureUrl(v) {
    if (v.brochureUrl && /^https?:\/\//i.test(v.brochureUrl)) return v.brochureUrl;
    const b = clean(v.brochure);
    if (b && /^https?:\/\//i.test(b)) return b;
    const m = String(v.brochure || "").match(/https?:\/\/[^\s)\"\'<>]+/);
    if (m && !/mail\.google\.com/i.test(m[0])) return m[0].replace(/[.,);]+$/, "");
    return "";
  }

  function loadCalcDefaults() {
    const base = { weddingGuests: 60, guestPayPerNight: 0, nightsPref: null };
    try {
      const raw = localStorage.getItem(CALC_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      return { ...base, ...obj };
    } catch {
      return base;
    }
  }

  function saveCalcDefaults(partial) {
    state.calcDefaults = { ...state.calcDefaults, ...partial };
    localStorage.setItem(CALC_KEY, JSON.stringify(state.calcDefaults));
  }

  function saveShortlist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...state.shortlist]));
    els.count.textContent = String(state.shortlist.size);
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function clean(s) {
    if (!s) return "";
    const t = String(s).trim();
    if (!t || /^tbd/i.test(t)) return "";
    return t;
  }

  function fmtEuro(n) {
    const v = Math.round(Number(n) || 0);
    return "€" + v.toLocaleString("en-US");
  }

  function fmtCompact(n) {
    const v = Math.round(Number(n) || 0);
    if (v >= 1000) {
      const k = v / 1000;
      if (Math.abs(k - Math.round(k)) < 0.05) return `€${Math.round(k)}k`;
      return k >= 10 ? `€${Math.round(k)}k` : `€${k.toFixed(1).replace(/\.0$/, "")}k`;
    }
    return fmtEuro(v);
  }

  function overnightNum(v) {
    const cm = v.costModel || {};
    if (typeof cm.overnightCap === "number") return cm.overnightCap;
    const raw = clean(v.overnightCapacity) || clean(v.guestsAccommodated) || "";
    const m = raw.match(/(\d+)/);
    return m ? Number(m[1]) : null;
  }

  function nightsDisplay(v) {
    const raw = clean(v.minNights) || "";
    if (!raw || /n\/a/i.test(raw)) {
      const d = (v.costModel || {}).defaultNights;
      return d ? String(d) : "—";
    }
    const range = raw.match(/(\d+)\s*[–-]\s*(\d+)/);
    if (range) return `${range[1]}–${range[2]}`;
    const single = raw.match(/(\d+)/);
    return single ? single[1] : raw.slice(0, 8);
  }

  function defaultNightsFor(v) {
    if (state.calcDefaults.nightsPref === 2 || state.calcDefaults.nightsPref === 3) {
      return state.calcDefaults.nightsPref;
    }
    const cm = v.costModel || {};
    if (cm.defaultNights) return cm.defaultNights;
    const d = nightsDisplay(v);
    const m = String(d).match(/(\d+)/);
    return m ? Number(m[1]) : 3;
  }

  function cardCostLabel(v) {
    if (v.allIn60) {
      const m = String(v.allIn60).match(/€?\s*([\d.]+)\s*k\s*[–-]\s*€?\s*([\d.]+)\s*k/i);
      if (m) return `€${m[1]}–${m[2]}k`;
      if (v.allIn60Mid) return `€~${Math.round(v.allIn60Mid / 1000)}k`;
      return String(v.allIn60).replace(/^€/, "€");
    }
    return clean(v.allIn40) || "Ask";
  }

  function mediaBlock(v, className) {
    const credit = v.imageCredit ? `<span class="credit">${esc(v.imageCredit)}</span>` : "";
    const src = (galleryFor(v)[0] || v.image || "");
    if (src) {
      return `<div class="${className}">
        <img src="${esc(src)}" alt="${esc(v.name)}" loading="lazy" decoding="async"
          onerror="this.style.display='none'; this.parentElement.querySelector('.monogram').hidden=false;" />
        <div class="monogram" hidden>${esc(v.monogram || "IT")}</div>
        ${credit}
      </div>`;
    }
    return `<div class="${className}"><div class="monogram">${esc(v.monogram || "IT")}</div>${credit}</div>`;
  }

  function drawerGallery(v) {
    const imgs = galleryFor(v);
    const credit = v.imageCredit ? `<span class="credit">${esc(v.imageCredit)}</span>` : "";
    if (!imgs.length) {
      return `<div class="drawer-hero"><div class="monogram">${esc(v.monogram || "IT")}</div>${credit}</div>`;
    }
    const main = imgs[0];
    const thumbs = imgs.length > 1
      ? `<div class="gallery-thumbs" role="list" aria-label="Photo gallery">
          ${imgs.map((src, i) => `<button type="button" class="gallery-thumb${i === 0 ? " is-active" : ""}" data-gallery-idx="${i}" role="listitem" aria-label="Photo ${i + 1}">
            <img src="${esc(src)}" alt="" loading="lazy" decoding="async" />
          </button>`).join("")}
        </div>`
      : "";
    return `<div class="drawer-gallery">
      <div class="drawer-hero">
        <img class="gallery-main" src="${esc(main)}" alt="${esc(v.name)}" decoding="async"
          onerror="this.style.display='none'; this.parentElement.querySelector('.monogram').hidden=false;" />
        <div class="monogram" hidden>${esc(v.monogram || "IT")}</div>
        ${credit}
      </div>
      ${thumbs}
    </div>`;
  }

  function renderLinks(v) {
    const website = clean(v.website);
    const brochureUrl = resolveBrochureUrl(v);
    const brochureLabel = clean(v.brochure) || "Brochure";
    const parts = [];
    if (website) {
      parts.push(`<a class="btn btn-primary" href="${esc(website)}" target="_blank" rel="noopener noreferrer">Visit website</a>`);
    }
    if (brochureUrl) {
      parts.push(`<a class="btn btn-brochure" href="${esc(brochureUrl)}" target="_blank" rel="noopener noreferrer">Open brochure</a>`);
    } else if (brochureLabel && !/^tbd/i.test(brochureLabel)) {
      parts.push(`<p class="brochure-text"><span class="brochure-label">Brochure</span> ${esc(brochureLabel)}</p>`);
    }
    if (!parts.length) return "";
    return `<div class="section links-section">
      <h3>Links</h3>
      <div class="drawer-actions links-actions">${parts.filter((p) => p.startsWith("<a")).join("")}</div>
      ${parts.filter((p) => p.startsWith("<p")).join("")}
    </div>`;
  }

  function renderNotes(v) {
    const val = state.notes[v.id] || "";
    return `<div class="section notes-section">
      <h3>Our notes</h3>
      <label class="notes-label" for="venue-notes">Our notes (Estefania &amp; James)</label>
      <textarea id="venue-notes" class="venue-notes" data-notes-for="${esc(v.id)}" rows="4" placeholder="Thoughts, questions for the venue, what we loved…">${esc(val)}</textarea>
      <p class="notes-hint">Autosaved on this device</p>
    </div>`;
  }

  function filteredVenues() {
    let list = state.venues.slice();
    if (state.view === "shortlist") list = list.filter((v) => state.shortlist.has(v.id));
    if (state.region !== "All") list = list.filter((v) => v.region === state.region);
    if (state.band !== "all") list = list.filter((v) => v.budgetBand === state.band);
    if (state.query) {
      const q = state.query.toLowerCase();
      list = list.filter((v) =>
        [v.name, v.city, v.location, v.region, v.bestFit].join(" ").toLowerCase().includes(q)
      );
    }
    return list;
  }

  function renderChips() {
    const regions = ["All", ...new Set(state.venues.map((v) => v.region).filter(Boolean))];
    const preferred = ["All", "Tuscany", "Umbria", "Campania", "Veneto", "Friuli", "Calabria"];
    regions.sort((a, b) => {
      const ia = preferred.indexOf(a);
      const ib = preferred.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    els.chips.innerHTML = regions
      .map(
        (r) =>
          `<button type="button" class="chip${state.region === r ? " is-active" : ""}" data-region="${esc(r)}">${esc(r)}</button>`
      )
      .join("");
  }

  function renderCards() {
    const list = filteredVenues();
    els.viewTitle.textContent = state.view === "shortlist" ? "Shortlist" : "All venues";
    els.resultCount.textContent = `${list.length} venue${list.length === 1 ? "" : "s"}`;
    els.count.textContent = String(state.shortlist.size);

    if (!list.length) {
      els.cards.innerHTML = "";
      els.empty.hidden = false;
      els.empty.querySelector(".empty-title").textContent =
        state.view === "shortlist" ? "No venues shortlisted yet" : "No matches";
      els.empty.querySelector(".empty-body").textContent =
        state.view === "shortlist"
          ? "Tap the heart on any card to save it here. Favorites stay on this device via local storage."
          : "Try another region, budget band, or search term.";
      return;
    }

    els.empty.hidden = true;
    els.cards.innerHTML = list
      .map((v) => {
        const on = state.shortlist.has(v.id);
        const overnight = overnightNum(v);
        const overnightLabel = overnight != null ? String(overnight) : "—";
        const nights = nightsDisplay(v);
        const cost = cardCostLabel(v);
        const hasNotes = venueHasNotes(v.id);
        return `<article class="card" data-id="${esc(v.id)}" tabindex="0" role="button" aria-label="Open ${esc(v.name)}">
          ${mediaBlock(v, "card-media")}
          <button type="button" class="heart${on ? " is-on" : ""}" data-heart="${esc(v.id)}" aria-label="${on ? "Remove from shortlist" : "Add to shortlist"}" aria-pressed="${on}">${heartSvg}</button>
          ${hasNotes ? `<span class="notes-badge" title="Has notes">Notes</span>` : ""}
          <div class="card-body">
            <p class="card-region">${esc(v.region)}</p>
            <h3>${esc(v.name)}</h3>
            <p class="card-loc">${esc(v.city || v.location)}</p>
            <div class="card-stats" role="list">
              <div class="stat-icon" role="listitem" title="Overnight guests">
                ${iconPeople}
                <div><strong>${esc(overnightLabel)}</strong><span>overnight</span></div>
              </div>
              <div class="stat-icon" role="listitem" title="Estimated total for ~60 guests">
                ${iconEuro}
                <div><strong>${esc(cost)}</strong><span>est. cost</span></div>
              </div>
              <div class="stat-icon" role="listitem" title="Nights">
                ${iconCal}
                <div><strong>${esc(nights)}</strong><span>nights</span></div>
              </div>
            </div>
          </div>
        </article>`;
      })
      .join("");
  }

  function fact(label, value) {
    const v = clean(value);
    if (!v) return "";
    return `<div class="stat"><dt>${esc(label)}</dt><dd>${esc(v)}</dd></div>`;
  }

  function section(title, body) {
    const v = clean(body);
    if (!v) return "";
    return `<div class="section"><h3>${esc(title)}</h3><p>${esc(v)}</p></div>`;
  }

  /** Live cost engine — scales with calculator inputs */
  function computeLiveCost(v, opts) {
    const cm = v.costModel || {};
    const guests = Math.max(20, Math.min(150, Number(opts.weddingGuests) || 60));
    const nights = Number(opts.nights) === 2 ? 2 : Number(opts.nights) === 1 ? 1 : 3;
    let needRooms = Number(opts.accommodationGuests);
    if (!Number.isFinite(needRooms) || needRooms < 0) needRooms = guests;
    const pay = Math.max(0, Number(opts.guestPayPerNight) || 0);
    const overnightCap = typeof cm.overnightCap === "number" ? cm.overnightCap : overnightNum(v) || 0;

    const low = [];
    const high = [];
    const notes = [];

    // Rental / buyout
    if (cm.dayVenue) {
      const base = cm.rentalTotal || 7850;
      low.push(["Venue rental (day)", base * 0.92]);
      high.push(["Venue rental (day)", base * 1.08]);
    } else if (cm.rentalTotal != null && cm.rentalTotal > 0) {
      let rLo = cm.rentalLow != null ? cm.rentalLow : cm.rentalTotal;
      let rHi = cm.rentalTotalHigh != null ? cm.rentalTotalHigh : cm.rentalTotal;
      // Scale nights if model assumed different default
      const baseN = cm.defaultNights || nights;
      if (baseN && nights !== baseN && cm.rentalPerNight) {
        rLo = cm.rentalPerNight * nights;
        rHi = (cm.rentalTotalHigh ? cm.rentalTotalHigh / baseN : cm.rentalPerNight) * nights;
      } else if (baseN && nights !== baseN && cm.rentalTotal) {
        const per = cm.rentalTotal / baseN;
        rLo = per * nights * 0.95;
        rHi = per * nights * 1.08;
      }
      if (v.id === "villa-paola") {
        rLo = (cm.rentalPerNight || 7000) * nights;
        rHi = 12000 * nights;
      }
      if (v.id === "borgo-castelvecchi") {
        // package tiers roughly by capacity
        if (needRooms > 65 || guests > 65) {
          rLo = rHi = nights >= 3 ? 28700 : 17500;
        } else {
          rLo = rHi = nights >= 3 ? 21900 : 13500;
        }
      }
      low.push([`Venue / lodging (${nights}n)`, rLo]);
      high.push([`Venue / lodging (${nights}n)`, rHi]);
      if (cm.gratPct) {
        low.push([`Gratuity (${Math.round(cm.gratPct * 100)}%)`, rLo * cm.gratPct]);
        high.push([`Gratuity (${Math.round(cm.gratPct * 100)}%)`, rHi * cm.gratPct]);
      }
    } else if (cm.roomPerPersonPerNight) {
      // hotel: rooms estimated
      const ppn = cm.roomPerPersonPerNight;
      low.push([`Guest rooms est. (${nights}n)`, ppn * 0.9 * needRooms * nights]);
      high.push([`Guest rooms est. (${nights}n)`, ppn * 1.15 * needRooms * nights]);
      notes.push("Room block rate not quoted — Italy hotel average used.");
    } else if (v.allIn60Low && v.allIn60High) {
      // fallback: scale static venue portion ~35% of mid
      const mid = (v.allIn60Low + v.allIn60High) / 2;
      const venue = mid * 0.32 * (guests / 60);
      low.push(["Venue / stay (scaled estimate)", venue * 0.9]);
      high.push(["Venue / stay (scaled estimate)", venue * 1.1]);
      notes.push("Venue fee not published — scaled from 60-guest planning model.");
    }

    if (cm.ceremonyFee) {
      low.push(["Ceremony set-up", cm.ceremonyFee]);
      high.push(["Ceremony set-up", cm.ceremonyFee]);
    }

    // F&B
    if (v.id === "villa-sermolli" && (cm.fbDinnerPerGuest || cm.fbBarPerGuest)) {
      const dinner = (cm.fbDinnerPerGuest || 100) * guests;
      const barLo = (cm.fbBarPerGuest || 70) * guests;
      const barHi = 85 * guests;
      const pizza = ((cm.welcomePizzaBudget60 || 4500) / 60) * guests;
      low.push(["F&B dinner", dinner]);
      high.push(["F&B dinner", dinner]);
      low.push(["Wedding bar", barLo]);
      high.push(["Wedding bar", barHi]);
      low.push(["Welcome pizza night", pizza * 0.9]);
      high.push(["Welcome pizza night", pizza * 1.1]);
    } else if (cm.fbPerGuest) {
      let ppLo = cm.fbPerGuest * 0.95;
      let ppHi = cm.fbPerGuest * 1.05;
      if (v.id === "villa-lena") {
        // scale 3-day bundle vs shorter
        const base = nights >= 3 ? [500, 600] : [430, 500];
        ppLo = base[0];
        ppHi = base[1];
      }
      if (v.id === "hotel-bellevue-syrene") {
        ppLo = 230;
        ppHi = 270;
      }
      if (v.id === "borgo-castelvecchi") {
        ppLo = 130;
        ppHi = 150;
      }
      if (v.id === "casale-de-pasquinelli") {
        ppLo = 165 * 1.1;
        ppHi = 174 * 1.1;
      }
      low.push(["F&B / banquet", ppLo * guests]);
      high.push(["F&B / banquet", ppHi * guests]);
      if (cm.drinksPerGuest) {
        low.push(["Drinks package", cm.drinksPerGuest * guests]);
        high.push(["Drinks package", cm.drinksPerGuest * guests]);
      }
    } else {
      low.push(["F&B dinner+bar (Italy avg)", AVG.fbDinnerBar[0] * guests]);
      high.push(["F&B dinner+bar (Italy avg)", AVG.fbDinnerBar[1] * guests]);
      if (nights >= 2 && !cm.dayVenue) {
        low.push(["Welcome party (Italy avg)", AVG.welcome[0] * guests]);
        high.push(["Welcome party (Italy avg)", AVG.welcome[1] * guests]);
      }
      if (nights >= 3) {
        low.push(["Brunch (Italy avg)", AVG.brunch[0] * guests]);
        high.push(["Brunch (Italy avg)", AVG.brunch[1] * guests]);
      }
    }

    // Overflow / offsite lodging — informational only (guest-paid; NOT in host budget)
    let overflowGuests = 0;
    let overflowLo = 0;
    let overflowHi = 0;
    if (cm.dayVenue) {
      overflowGuests = needRooms;
      overflowLo = needRooms * nights * AVG.overflowRoomNight[0];
      overflowHi = needRooms * nights * AVG.overflowRoomNight[1];
      notes.push(
        `Day venue — all lodging is guest-paid nearby hotels (est. €${AVG.overflowRoomNight[0]}–€${AVG.overflowRoomNight[1]}/person/night). Excluded from your budget.`
      );
    } else if (overnightCap > 0 && needRooms > overnightCap && !cm.roomPerPersonPerNight) {
      overflowGuests = needRooms - overnightCap;
      overflowLo = overflowGuests * nights * AVG.overflowRoomNight[0];
      overflowHi = overflowGuests * nights * AVG.overflowRoomNight[1];
      notes.push(
        `~${overflowGuests} guests need nearby hotels (guest-paid; not in your budget). Est. €${AVG.overflowRoomNight[0]}–€${AVG.overflowRoomNight[1]}/person/night.`
      );
    }
    const overflowMid = (overflowLo + overflowHi) / 2;

    // Vendors
    const planner = cm.plannerQuoted != null ? [cm.plannerQuoted, cm.plannerQuoted] : AVG.planner;
    low.push(["Planner / coordinator", planner[0]]);
    high.push(["Planner / coordinator", planner[1]]);

    if (cm.floralsMinQuoted) {
      low.push(["Florals / decor", cm.floralsMinQuoted]);
      high.push(["Florals / decor", Math.max(cm.floralsMinQuoted, AVG.florals[1])]);
    } else {
      low.push(["Florals / decor", AVG.florals[0]]);
      high.push(["Florals / decor", AVG.florals[1]]);
    }
    low.push(["Photography", AVG.photo[0]]);
    high.push(["Photography", AVG.photo[1]]);
    low.push(["Videography", AVG.video[0]]);
    high.push(["Videography", AVG.video[1]]);
    const dj = cm.djQuoted != null ? [cm.djQuoted, cm.djQuoted] : AVG.dj;
    low.push(["DJ / music", dj[0]]);
    high.push(["DJ / music", dj[1]]);
    if (!cm.ceremonyFee) {
      low.push(["Ceremony / SIAE", AVG.ceremony[0]]);
      high.push(["Ceremony / SIAE", AVG.ceremony[1]]);
    }
    low.push(["Guest transport", AVG.transport[0]]);
    high.push(["Guest transport", AVG.transport[1]]);

    if (cm.touristTaxPerNight) {
      const tax = cm.touristTaxPerNight * Math.min(needRooms, overnightCap || needRooms) * nights;
      low.push(["Tourist tax", tax]);
      high.push(["Tourist tax", tax]);
    }

    const sumLo = low.reduce((s, [, a]) => s + a, 0);
    const sumHi = high.reduce((s, [, a]) => s + a, 0);
    const contLo = sumLo * AVG.contingencyPct;
    const contHi = sumHi * AVG.contingencyPct;
    low.push(["Contingency (10%)", contLo]);
    high.push(["Contingency (10%)", contHi]);

    const grossLo = sumLo + contLo;
    const grossHi = sumHi + contHi;
    const grossMid = (grossLo + grossHi) / 2;

    // Guest reimbursements: ONLY guests sleeping onsite (or hotel-block rooms)
    // Overflow/offsite guests book & pay their own hotels — not reimbursable to host budget.
    let onsiteGuests;
    if (cm.roomPerPersonPerNight) {
      onsiteGuests = needRooms; // hotel-block rooms are onsite lodging
    } else if (overnightCap > 0) {
      onsiteGuests = Math.min(needRooms, overnightCap);
    } else {
      onsiteGuests = cm.dayVenue ? 0 : needRooms;
    }
    const reimbursements = onsiteGuests * nights * pay;
    const hostLo = Math.max(0, grossLo - reimbursements);
    const hostHi = Math.max(0, grossHi - reimbursements);
    const hostMid = Math.max(0, grossMid - reimbursements);

    return {
      guests,
      nights,
      needRooms,
      pay,
      overnightCap,
      overflowGuests,
      overflowLo,
      overflowHi,
      overflowMid,
      onsiteGuests,
      grossLo,
      grossHi,
      grossMid,
      reimbursements,
      hostLo,
      hostHi,
      hostMid,
      perGuestGross: grossMid / guests,
      perGuestHost: hostMid / guests,
      linesLow: low,
      linesHigh: high,
      notes,
    };
  }

  function isGuestPaidLodgingItem(item) {
    return /overflow\s*lodging|offsite\s*lodging|all guest lodging|guest lodging\s*\(/i.test(
      String(item || "")
    );
  }

  function renderAllIn60Static(v) {
    if (!v.allIn60) return "";
    const budgeted = [];
    const overflow = [];
    for (const b of v.allIn60Breakdown || []) {
      if (isGuestPaidLodgingItem(b.item)) overflow.push(b);
      else budgeted.push(b);
    }
    const rowHtml = (b) => `<tr>
          <td>${esc(b.item)}<span class="src-tag">${esc(b.source)}</span></td>
          <td>${fmtCompact(b.low)}–${fmtCompact(b.high).replace("€", "")}</td>
        </tr>`;
    const rows = budgeted.map(rowHtml).join("");
    const overflowRows = overflow.map(rowHtml).join("");
    const overflowSection = overflow.length
      ? `<div class="overflow-info">
      <h4>Guest-paid offsite hotels (not in your budget)</h4>
      <div class="table-wrap"><table class="cost-table"><thead><tr><th>Line item</th><th>Range</th></tr></thead><tbody>${overflowRows}</tbody></table></div>
      <p class="overflow-note">${esc(
        v.allIn60OverflowNote ||
          "Guests book and pay nearby hotels themselves; these amounts are excluded from your all-in."
      )}</p>
    </div>`
      : v.allIn60OverflowNote
        ? `<p class="overflow-note">${esc(v.allIn60OverflowNote)}</p>`
        : "";
    return `<div class="section cost-60">
      <h3>Estimated total wedding cost · 60 guests</h3>
      <p class="cost-60-total"><strong>${esc(v.allIn60)}</strong> <span class="muted">(midpoint ${fmtCompact(v.allIn60Mid)})</span></p>
      <p class="muted" style="margin-top:0.25rem;font-size:0.85rem;">Host budget only — guest-paid offsite lodging excluded.</p>
      <div class="table-wrap"><table class="cost-table"><thead><tr><th>Line item</th><th>Range</th></tr></thead><tbody>${rows}</tbody></table></div>
      ${overflowSection}
      <p class="assumptions">${esc(v.allIn60Assumptions || state.meta.costAssumptions || "")}</p>
    </div>`;
  }

  function renderCalculator(v) {
    const guests = state.calcDefaults.weddingGuests || 60;
    const nights = defaultNightsFor(v);
    const pay = state.calcDefaults.guestPayPerNight || 0;
    return `<div class="calc-panel" data-calc-for="${esc(v.id)}">
      <h3>Adjust your numbers</h3>
      <p class="calc-lead">Live estimate using this villa’s quoted rates where available, plus Italy destination averages for the rest — like your XLSM Settings sheet.</p>
      <div class="calc-grid">
        <label class="calc-field">
          <span>Wedding guests</span>
          <div class="calc-row">
            <input type="range" min="20" max="150" step="1" value="${guests}" data-calc="weddingGuests" />
            <input type="number" min="20" max="150" value="${guests}" data-calc="weddingGuestsNum" />
          </div>
        </label>
        <label class="calc-field">
          <span>Guests needing accommodation</span>
          <input type="number" min="0" max="200" value="${guests}" data-calc="accommodationGuests" />
        </label>
        <label class="calc-field">
          <span>Nights</span>
          <select data-calc="nights">
            <option value="2"${nights === 2 ? " selected" : ""}>2 nights</option>
            <option value="3"${nights === 3 ? " selected" : ""}>3 nights</option>
            ${((v.costModel || {}).dayVenue) ? `<option value="1"${nights === 1 ? " selected" : ""}>1 day (no stay)</option>` : ""}
          </select>
        </label>
        <label class="calc-field">
          <span>Guest pays · € / person / night</span>
          <input type="number" min="0" max="500" step="10" value="${pay}" data-calc="guestPayPerNight" />
        </label>
      </div>
      <div class="calc-results" data-calc-results></div>
    </div>`;
  }

  function paintCalcResults(container, v) {
    const panel = container.querySelector(".calc-panel");
    if (!panel) return;
    const guests = Number(panel.querySelector('[data-calc="weddingGuests"]').value);
    const nights = Number(panel.querySelector('[data-calc="nights"]').value);
    const need = Number(panel.querySelector('[data-calc="accommodationGuests"]').value);
    const pay = Number(panel.querySelector('[data-calc="guestPayPerNight"]').value);
    const r = computeLiveCost(v, {
      weddingGuests: guests,
      nights,
      accommodationGuests: need,
      guestPayPerNight: pay,
    });
    const out = panel.querySelector("[data-calc-results]");
    const overflowInfo =
      r.overflowGuests > 0
        ? `<div class="overflow-info">
        <p class="overflow-note"><strong>Guest-paid offsite hotels (not in your budget):</strong> ${fmtCompact(
          r.overflowLo
        )}–${fmtCompact(r.overflowHi).replace("€", "")}
        <br /><span class="muted">~${r.overflowGuests} guests book and pay nearby hotels themselves.</span></p>
      </div>`
        : "";
    out.innerHTML = `
      <div class="calc-totals">
        <div class="calc-total primary">
          <span class="label">Your estimated wedding spend</span>
          <strong>${fmtCompact(r.grossLo)}–${fmtCompact(r.grossHi).replace("€", "")}</strong>
          <em>mid ${fmtCompact(r.grossMid)} · host budget before onsite guest contributions</em>
        </div>
        <div class="calc-total">
          <span class="label">Onsite guest lodging contributions</span>
          <strong>${fmtCompact(r.reimbursements)}</strong>
          <em>${r.onsiteGuests} onsite × ${r.nights}n × ${fmtEuro(r.pay)}</em>
        </div>
        <div class="calc-total host">
          <span class="label">Your estimated host outlay</span>
          <strong>${fmtCompact(r.hostLo)}–${fmtCompact(r.hostHi).replace("€", "")}</strong>
          <em>mid ${fmtCompact(r.hostMid)} · ${fmtCompact(r.perGuestHost)} / wedding guest</em>
        </div>
        <div class="calc-total">
          <span class="label">Per wedding guest (host budget)</span>
          <strong>${fmtCompact(r.perGuestGross)}</strong>
        </div>
      </div>
      ${overflowInfo}
      ${r.notes.map((n) => `<p class="overflow-note">${esc(n)}</p>`).join("")}
      <details class="calc-details"><summary>Line-item midpoints (host budget)</summary>
        <ul class="calc-lines">${r.linesLow
          .map((row, i) => {
            const hi = r.linesHigh[i] ? r.linesHigh[i][1] : row[1];
            const mid = (row[1] + hi) / 2;
            return `<li><span>${esc(row[0])}</span><span>${fmtCompact(mid)}</span></li>`;
          })
          .join("")}</ul>
      </details>`;
  }

  function bindCalculator(v) {
    const panel = els.drawerContent.querySelector(".calc-panel");
    if (!panel) return;
    const syncGuests = (from) => {
      const range = panel.querySelector('[data-calc="weddingGuests"]');
      const num = panel.querySelector('[data-calc="weddingGuestsNum"]');
      const acc = panel.querySelector('[data-calc="accommodationGuests"]');
      let g = from === "num" ? Number(num.value) : Number(range.value);
      g = Math.max(20, Math.min(150, g || 60));
      range.value = g;
      num.value = g;
      // keep accommodation in sync if it still matches previous guest default-ish
      if (!acc.dataset.touched) acc.value = g;
      saveCalcDefaults({ weddingGuests: g });
      paintCalcResults(els.drawerContent, v);
    };
    panel.querySelector('[data-calc="weddingGuests"]').addEventListener("input", () => syncGuests("range"));
    panel.querySelector('[data-calc="weddingGuestsNum"]').addEventListener("input", () => syncGuests("num"));
    panel.querySelector('[data-calc="accommodationGuests"]').addEventListener("input", (e) => {
      e.target.dataset.touched = "1";
      paintCalcResults(els.drawerContent, v);
    });
    panel.querySelector('[data-calc="nights"]').addEventListener("change", (e) => {
      saveCalcDefaults({ nightsPref: Number(e.target.value) });
      paintCalcResults(els.drawerContent, v);
    });
    panel.querySelector('[data-calc="guestPayPerNight"]').addEventListener("input", (e) => {
      saveCalcDefaults({ guestPayPerNight: Number(e.target.value) || 0 });
      paintCalcResults(els.drawerContent, v);
    });
    paintCalcResults(els.drawerContent, v);
  }

  function openDrawer(id) {
    const v = state.venues.find((x) => x.id === id);
    if (!v) return;
    state.activeId = id;
    state.galleryIndex = 0;
    const on = state.shortlist.has(v.id);

    els.drawerContent.innerHTML = `
      ${drawerGallery(v)}
      <div class="drawer-body">
        <p class="drawer-kicker">${esc(v.region)} · ${esc(v.budgetBand)} band</p>
        <h2 id="drawer-title">${esc(v.name)}</h2>
        <p class="drawer-sub">${esc(v.location)}${v.correctedLocation ? ` · <em>${esc(clean(v.correctedLocation).split("—")[0].trim())}</em>` : ""}</p>
        <div class="drawer-actions">
          <button type="button" class="btn btn-heart${on ? " is-on" : ""}" data-heart="${esc(v.id)}">${heartSvg} ${on ? "Saved" : "Save to shortlist"}</button>
        </div>
        ${renderLinks(v)}
        ${renderNotes(v)}
        ${renderCalculator(v)}
        ${renderAllIn60Static(v)}
        ${clean(v.confidence) ? `<p><span class="confidence">Confidence: ${esc(v.confidence)}</span></p>` : ""}
        <dl class="stats">
          ${fact("Overnight capacity", v.overnightCapacity)}
          ${fact("Event capacity", v.eventCapacity)}
          ${fact("Min nights", v.minNights)}
          ${fact("Venue fee", v.venueFee)}
          ${fact("40-guest all-in", v.allIn40)}
          ${fact("60-guest all-in (modeled)", v.allIn60)}
          ${fact("100-guest all-in", v.allIn100)}
          ${fact("Food", v.foodPrice)}
          ${fact("Alcohol", v.alcoholPrice)}
          ${fact("Music curfew", v.musicCurfew)}
          ${fact("In-house catering", v.inHouseCatering)}
          ${fact("Airport", v.airportNotes)}
          ${fact("Guests accommodated", v.guestsAccommodated)}
        </dl>
        ${clean(v.bestFit) ? `<div class="callout"><strong>Best fit</strong>${esc(v.bestFit)}</div>` : ""}
        ${clean(v.watchOuts) ? `<div class="callout"><strong>Watch-outs</strong>${esc(v.watchOuts)}</div>` : ""}
        ${section("Prices & packages", v.pricesPackages)}
        ${section("Date requirements", v.dateRequirements)}
        ${section("Discounts / extra fees", v.discountsExtraFees)}
        ${section("Backup indoor space", v.backupIndoor)}
        ${section("Min / max numbers", v.minMaxNumbers)}
        ${section("Cake", v.cake)}
        ${section("Source notes", v.sourceNotes)}
      </div>`;

    bindCalculator(v);
    bindGallery(v);
    bindNotes(v);

    els.overlay.hidden = false;
    requestAnimationFrame(() => {
      els.overlay.classList.add("is-open");
      els.drawer.classList.add("is-open");
      els.drawer.setAttribute("aria-hidden", "false");
      document.body.classList.add("drawer-open");
    });
  }

  function bindGallery(v) {
    const imgs = galleryFor(v);
    const main = els.drawerContent.querySelector(".gallery-main");
    const thumbs = els.drawerContent.querySelectorAll("[data-gallery-idx]");
    if (!main || !thumbs.length) return;
    thumbs.forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.galleryIdx);
        if (!imgs[idx]) return;
        state.galleryIndex = idx;
        main.src = imgs[idx];
        thumbs.forEach((t) => t.classList.toggle("is-active", Number(t.dataset.galleryIdx) === idx));
      });
    });
  }

  function bindNotes(v) {
    const ta = els.drawerContent.querySelector("[data-notes-for]");
    if (!ta) return;
    ta.addEventListener("input", () => {
      const id = ta.dataset.notesFor;
      state.notes[id] = ta.value;
      if (state.notesTimer) clearTimeout(state.notesTimer);
      state.notesTimer = setTimeout(() => {
        saveNotes();
        // refresh card badge without closing drawer
        const card = els.cards.querySelector(`.card[data-id="${id}"]`);
        if (card) {
          const existing = card.querySelector(".notes-badge");
          const has = venueHasNotes(id);
          if (has && !existing) {
            const badge = document.createElement("span");
            badge.className = "notes-badge";
            badge.title = "Has notes";
            badge.textContent = "Notes";
            card.appendChild(badge);
          } else if (!has && existing) {
            existing.remove();
          }
        }
      }, 350);
    });
  }

  function closeDrawer() {
    els.overlay.classList.remove("is-open");
    els.drawer.classList.remove("is-open");
    els.drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("drawer-open");
    setTimeout(() => {
      els.overlay.hidden = true;
      state.activeId = null;
    }, 280);
  }

  function toggleHeart(id, ev) {
    if (ev) {
      ev.preventDefault();
      ev.stopPropagation();
    }
    if (state.shortlist.has(id)) state.shortlist.delete(id);
    else state.shortlist.add(id);
    saveShortlist();
    renderCards();
    if (state.activeId === id) openDrawer(id);
  }

  function setView(view) {
    state.view = view;
    els.tabs.forEach((t) => {
      const active = t.dataset.view === view;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", active ? "true" : "false");
    });
    els.toolbar.style.display = view === "shortlist" ? "none" : "flex";
    renderCards();
  }

  els.tabs.forEach((t) => t.addEventListener("click", () => setView(t.dataset.view)));
  els.chips.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-region]");
    if (!btn) return;
    state.region = btn.dataset.region;
    renderChips();
    renderCards();
  });
  els.search.addEventListener("input", () => {
    state.query = els.search.value.trim();
    renderCards();
  });
  els.band.addEventListener("change", () => {
    state.band = els.band.value;
    renderCards();
  });
  els.cards.addEventListener("click", (e) => {
    const heart = e.target.closest("[data-heart]");
    if (heart) return toggleHeart(heart.dataset.heart, e);
    const card = e.target.closest(".card");
    if (card) openDrawer(card.dataset.id);
  });
  els.cards.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest(".card");
    if (!card) return;
    e.preventDefault();
    openDrawer(card.dataset.id);
  });
  els.drawerContent.addEventListener("click", (e) => {
    const heart = e.target.closest("[data-heart]");
    if (heart) toggleHeart(heart.dataset.heart, e);
  });
  els.drawerClose.addEventListener("click", closeDrawer);
  els.overlay.addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeDrawer();
  });

  async function init() {
    try {
      let data;
      if (window.__EJ_VENUES__) {
        data = window.__EJ_VENUES__;
      } else {
        const res = await fetch("data/venues.json");
        data = await res.json();
      }
      state.venues = data.venues || [];
      state.meta = data.meta || {};
      if (data.meta && data.meta.calculatorDefaults) {
        state.calcDefaults = { ...state.calcDefaults, ...data.meta.calculatorDefaults, ...loadCalcDefaults() };
      }
      saveShortlist();
      renderChips();
      renderCards();
    } catch (err) {
      els.cards.innerHTML = `<p style="color:#FF7560">Could not load venue data. Open this site via a local server or host so <code>data/venues.json</code> can load.</p>`;
      console.error(err);
    }
  }

  init();
})();
