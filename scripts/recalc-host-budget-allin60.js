#!/usr/bin/env node
/**
 * Idempotently exclude guest-paid overflow/offsite lodging from host allIn60 totals.
 * Overflow rows stay in allIn60Breakdown for display; contingency & headline totals
 * are recomputed from non-overflow budgeted lines only.
 */
const fs = require("fs");
const path = require("path");

const DATA = path.join(__dirname, "..", "data", "venues.json");

const BASE_ASSUMPTIONS =
  "Italy destination averages used when the villa did not quote a line item (2025–2027 planning bands): planner €3–5k; photography €3–4.5k; videography €2.5–4k; florals/decor €3–6k; DJ/music €1–2k; ceremony/SIAE €0.5–1k; guest shuttles €1.5–3k. If no F&B quote: dinner+aperitivo+open bar ~€150–€220 pp; welcome party ~€50–€80 pp; brunch ~€25–€40 pp for a multi-day weekend. Contingency ~10%. Nearby/overflow hotel lodging for guests not sleeping onsite is guest-paid and excluded from host all-in totals. Onsite guest €/person/night contributions (when set) reduce host outlay toward the villa buyout.";

function isOverflowItem(item) {
  return /overflow\s*lodging|offsite\s*lodging|all guest lodging|guest lodging\s*\(/i.test(
    String(item || "")
  );
}

function isContingencyItem(item) {
  return /contingency/i.test(String(item || ""));
}

function fmtAllIn(low, high) {
  return `€${Math.round(low / 1000)}k–€${Math.round(high / 1000)}k`;
}

function overflowNoteFor(v, overflowRows) {
  if (!overflowRows.length) return v.allIn60OverflowNote || "";
  const cm = v.costModel || {};
  if (cm.dayVenue) {
    return "Day venue — all lodging is guest-paid nearby hotels (not in your all-in).";
  }
  // Try to parse guest count from item text (~N guests)
  const m = String(overflowRows[0].item).match(/~?\s*(\d+)\s*guests?/i);
  const n = m ? Number(m[1]) : null;
  if (n != null) {
    return `~${n} guests need nearby hotels (guest-paid; not in your all-in).`;
  }
  return "Some guests need nearby hotels (guest-paid; not in your all-in).";
}

function venueAssumptions(v, overflowRows) {
  let extra = "";
  const cm = v.costModel || {};
  if (cm.dayVenue) {
    extra =
      " Day venue — guest lodging is offsite and guest-paid (excluded from host all-in).";
  } else if (overflowRows.length) {
    const m = String(overflowRows[0].item).match(/~?\s*(\d+)\s*guests?/i);
    const cap = cm.overnightCap;
    if (cap != null && m) {
      extra = ` Onsite overnight capacity ~${cap} < 60 wedding guests — ~${m[1]} guests book nearby hotels themselves (guest-paid; not in your all-in).`;
    }
  }
  return BASE_ASSUMPTIONS + extra;
}

function recalcVenue(v) {
  const bd = Array.isArray(v.allIn60Breakdown) ? v.allIn60Breakdown : null;
  if (!bd || !bd.length) return { changed: false };

  const overflowRows = bd.filter((b) => isOverflowItem(b.item));
  const before = {
    allIn60: v.allIn60,
    allIn60Low: v.allIn60Low,
    allIn60High: v.allIn60High,
    allIn60Mid: v.allIn60Mid,
  };

  // Budgeted lines = everything except overflow and existing contingency
  const budgeted = bd.filter((b) => !isOverflowItem(b.item) && !isContingencyItem(b.item));
  const sumLo = budgeted.reduce((s, b) => s + (Number(b.low) || 0), 0);
  const sumHi = budgeted.reduce((s, b) => s + (Number(b.high) || 0), 0);
  const contLo = Math.round(sumLo * 0.1);
  const contHi = Math.round(sumHi * 0.1);
  const totalLo = sumLo + contLo;
  const totalHi = sumHi + contHi;
  const totalMid = Math.round((totalLo + totalHi) / 2);

  const ovLo = overflowRows.reduce((s, b) => s + (Number(b.low) || 0), 0);
  const ovHi = overflowRows.reduce((s, b) => s + (Number(b.high) || 0), 0);

  // Rebuild breakdown: budgeted + overflow (info) + new contingency
  const newBd = [
    ...budgeted,
    ...overflowRows.map((b) => ({ ...b })),
    {
      item: "Contingency (10%)",
      low: contLo,
      high: contHi,
      source: "assumption",
    },
  ];

  v.allIn60Breakdown = newBd;
  v.allIn60Low = totalLo;
  v.allIn60High = totalHi;
  v.allIn60Mid = totalMid;
  v.allIn60 = fmtAllIn(totalLo, totalHi);
  if (overflowRows.length) {
    v.allIn60OverflowLow = ovLo;
    v.allIn60OverflowHigh = ovHi;
  }
  v.allIn60OverflowNote = overflowNoteFor(v, overflowRows);
  v.allIn60Assumptions = venueAssumptions(v, overflowRows);

  const changed =
    before.allIn60 !== v.allIn60 ||
    before.allIn60Low !== v.allIn60Low ||
    before.allIn60High !== v.allIn60High ||
    before.allIn60Mid !== v.allIn60Mid;

  return {
    changed,
    before,
    after: {
      allIn60: v.allIn60,
      allIn60Low: v.allIn60Low,
      allIn60High: v.allIn60High,
      allIn60Mid: v.allIn60Mid,
      overflowLow: ovLo,
      overflowHigh: ovHi,
    },
    overflowCount: overflowRows.length,
  };
}

function main() {
  const data = JSON.parse(fs.readFileSync(DATA, "utf8"));
  data.meta = data.meta || {};
  data.meta.costAssumptions = BASE_ASSUMPTIONS;

  const report = [];
  for (const v of data.venues || []) {
    const r = recalcVenue(v);
    if (r.overflowCount || r.changed) {
      report.push({
        id: v.id,
        name: v.name,
        dayVenue: !!(v.costModel && v.costModel.dayVenue),
        ...r,
      });
    }
  }

  fs.writeFileSync(DATA, JSON.stringify(data, null, 2) + "\n");

  console.log("Updated meta.costAssumptions");
  for (const r of report) {
    if (!r.changed && r.overflowCount === 0) continue;
    console.log(
      `${r.id}: ${r.before.allIn60} → ${r.after.allIn60} (mid ${r.before.allIn60Mid} → ${r.after.allIn60Mid})` +
        (r.overflowCount
          ? ` | overflow €${r.after.overflowLow}–€${r.after.overflowHigh} excluded`
          : "")
    );
  }
  console.log(`Wrote ${DATA}`);
}

main();
