(() => {
  const STORAGE_KEY = "ej-italy-shortlist-v1";
  const CALC_KEY = "ej-italy-calc-defaults-v1";

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
    activeId: null,
    calcDefaults: loadCalcDefaults(),
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
    if (v.image) {
      return `<div class="${className}">
        <img src="${esc(v.image)}" alt="${esc(v.name)}" loading="lazy" decoding="async"
          onerror="this.style.display='none'; this.parentElement.querySelector('.monogram').hidden=false;" />
        <div class="monogram" hidden>${esc(v.monogram || "IT")}</div>
        ${credit}
      </div>`;
    }
    return `<div class="${className}"><div class="monogram">${esc(v.monogram || "IT")}</div>${credit}</div>`;
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
        return `<article class="card" data-id="${esc(v.id)}" tabindex="0" role="button" aria-label="Open ${esc(v.name)}">
          ${mediaBlock(v, "card-media")}
          <button type="button" class="heart${on ? " is-on" : ""}" data-heart="${esc(v.id)}" aria-label="${on ? "Remove from shortlist" : "Add to shortlist"}" aria-pressed="${on}">${heartSvg}</button>
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

    // Overflow / offsite lodging (gross cost — before guest reimbursements)
    let overflowGuests = 0;
    if (cm.dayVenue) {
      overflowGuests = needRooms;
      low.push([`Offsite lodging (${needRooms} × ${nights}n est.)`, needRooms * nights * AVG.overflowRoomNight[0]]);
      high.push([`Offsite lodging (${needRooms} × ${nights}n est.)`, needRooms * nights * AVG.overflowRoomNight[1]]);
      notes.push("Day venue — all lodging offsite (estimate).");
    } else if (overnightCap > 0 && needRooms > overnightCap && !cm.roomPerPersonPerNight) {
      overflowGuests = needRooms - overnightCap;
      low.push([
        `Overflow lodging (~${overflowGuests} × ${nights}n)`,
        overflowGuests * nights * AVG.overflowRoomNight[0],
      ]);
      high.push([
        `Overflow lodging (~${overflowGuests} × ${nights}n)`,
        overflowGuests * nights * AVG.overflowRoomNight[1],
      ]);
      notes.push(
        `Onsite overnight capacity ~${overnightCap} < ${needRooms} needing rooms — overflow estimated at €${AVG.overflowRoomNight[0]}–€${AVG.overflowRoomNight[1]}/person/night.`
      );
    }

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

    // Guest reimbursements: pay per night × accommodation guests × nights
    // Cap reimbursable room-nights to those actually housed (onsite + overflow we budgeted)
    const reimbursableGuests = needRooms;
    const reimbursements = reimbursableGuests * nights * pay;
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

  function renderAllIn60Static(v) {
    if (!v.allIn60) return "";
    const rows = (v.allIn60Breakdown || [])
      .map(
        (b) => `<tr>
          <td>${esc(b.item)}<span class="src-tag">${esc(b.source)}</span></td>
          <td>${fmtCompact(b.low)}–${fmtCompact(b.high).replace("€", "")}</td>
        </tr>`
      )
      .join("");
    return `<div class="section cost-60">
      <h3>Estimated total wedding cost · 60 guests</h3>
      <p class="cost-60-total"><strong>${esc(v.allIn60)}</strong> <span class="muted">(midpoint ${fmtCompact(v.allIn60Mid)})</span></p>
      ${v.allIn60OverflowNote ? `<p class="overflow-note">${esc(v.allIn60OverflowNote)}</p>` : ""}
      <div class="table-wrap"><table class="cost-table"><thead><tr><th>Line item</th><th>Range</th></tr></thead><tbody>${rows}</tbody></table></div>
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
    out.innerHTML = `
      <div class="calc-totals">
        <div class="calc-total primary">
          <span class="label">Estimated gross group cost</span>
          <strong>${fmtCompact(r.grossLo)}–${fmtCompact(r.grossHi).replace("€", "")}</strong>
          <em>mid ${fmtCompact(r.grossMid)}</em>
        </div>
        <div class="calc-total">
          <span class="label">Guest lodging reimbursements</span>
          <strong>${fmtCompact(r.reimbursements)}</strong>
          <em>${r.needRooms} × ${r.nights}n × ${fmtEuro(r.pay)}</em>
        </div>
        <div class="calc-total host">
          <span class="label">Estimated host outlay</span>
          <strong>${fmtCompact(r.hostLo)}–${fmtCompact(r.hostHi).replace("€", "")}</strong>
          <em>mid ${fmtCompact(r.hostMid)} · ${fmtCompact(r.perGuestHost)} / wedding guest</em>
        </div>
        <div class="calc-total">
          <span class="label">Per wedding guest (gross)</span>
          <strong>${fmtCompact(r.perGuestGross)}</strong>
        </div>
      </div>
      ${r.notes.map((n) => `<p class="overflow-note">${esc(n)}</p>`).join("")}
      <details class="calc-details"><summary>Line-item midpoints</summary>
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
    const on = state.shortlist.has(v.id);
    const website = clean(v.website);

    els.drawerContent.innerHTML = `
      ${mediaBlock(v, "drawer-hero")}
      <div class="drawer-body">
        <p class="drawer-kicker">${esc(v.region)} · ${esc(v.budgetBand)} band</p>
        <h2 id="drawer-title">${esc(v.name)}</h2>
        <p class="drawer-sub">${esc(v.location)}${v.correctedLocation ? ` · <em>${esc(clean(v.correctedLocation).split("—")[0].trim())}</em>` : ""}</p>
        <div class="drawer-actions">
          <button type="button" class="btn btn-heart${on ? " is-on" : ""}" data-heart="${esc(v.id)}">${heartSvg} ${on ? "Saved" : "Save to shortlist"}</button>
          ${website ? `<a class="btn btn-primary" href="${esc(website)}" target="_blank" rel="noopener noreferrer">Visit website</a>` : ""}
        </div>
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
        ${
          clean(v.brochure) && clean(v.brochure).startsWith("http")
            ? `<div class="section"><h3>Brochure</h3><p><a href="${esc(v.brochure)}" target="_blank" rel="noopener noreferrer">Open brochure link</a></p></div>`
            : ""
        }
      </div>`;

    bindCalculator(v);

    els.overlay.hidden = false;
    requestAnimationFrame(() => {
      els.overlay.classList.add("is-open");
      els.drawer.classList.add("is-open");
      els.drawer.setAttribute("aria-hidden", "false");
      document.body.classList.add("drawer-open");
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
      const res = await fetch("data/venues.json");
      const data = await res.json();
      state.venues = data.venues || [];
      state.meta = data.meta || {};
      if (data.meta && data.meta.calculatorDefaults) {
        state.calcDefaults = { ...state.calcDefaults, ...data.meta.calculatorDefaults, ...loadCalcDefaults() };
      }
      saveShortlist();
      renderChips();
      renderCards();
    } catch (err) {
      els.cards.innerHTML = `<p style="color:#8f3f22">Could not load venue data. Open this site via a local server or host so <code>data/venues.json</code> can load.</p>`;
      console.error(err);
    }
  }

  init();
})();
