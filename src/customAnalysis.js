import * as d3 from "d3";
import { unmatchedComplications, matchedComplications, demographics } from "./data.js";
import { showTooltip, moveTooltip, hideTooltip } from "./tooltip.js";
import { exportChartAsPng } from "./exportPng.js";

// ── Data sources available to the user ──────────────────────────────────────

const SOURCES = {
  matched: {
    label: "Matched Complications (Table 3)",
    rows: matchedComplications,
    fields: {
      complication: { label: "Complication", type: "categorical" },
      octrRate: { label: "OCTR Rate (%)", type: "numeric", derive: (d) => (d.octr / d.octrN) * 100 },
      ectrRate: { label: "ECTR Rate (%)", type: "numeric", derive: (d) => (d.ectr / d.ectrN) * 100 },
      or: { label: "Odds Ratio", type: "numeric" },
      ciLow: { label: "CI Low", type: "numeric" },
      ciHigh: { label: "CI High", type: "numeric" },
      ard: { label: "Absolute Risk Diff (%)", type: "numeric" },
      nnt: { label: "NNT", type: "numeric", derive: (d) => (d.ard && d.ard !== 0 ? Math.round(100 / Math.abs(d.ard)) : null) },
    },
  },
  unmatched: {
    label: "Unmatched Complications (Table 2)",
    rows: unmatchedComplications,
    fields: {
      complication: { label: "Complication", type: "categorical" },
      octrRate: { label: "OCTR Rate (%)", type: "numeric", derive: (d) => (d.octr / d.octrN) * 100 },
      ectrRate: { label: "ECTR Rate (%)", type: "numeric", derive: (d) => (d.ectr / d.ectrN) * 100 },
      or: { label: "Odds Ratio", type: "numeric" },
      ciLow: { label: "CI Low", type: "numeric" },
      ciHigh: { label: "CI High", type: "numeric" },
    },
  },
  comorbidities: {
    label: "Comorbidities (Table 1, Matched)",
    rows: (() => {
      const mo = demographics.matchedOCTR;
      const me = demographics.matchedECTR;
      const n = demographics.matchedOCTR.n;
      return ["diabetes", "obesity", "heartDisease", "hypertension", "renalDisease"].map((k) => ({
        comorbidity: k.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()),
        octrCount: mo[k],
        ectrCount: me[k],
        octrRate: (mo[k] / n) * 100,
        ectrRate: (me[k] / n) * 100,
        diff: ((mo[k] - me[k]) / n) * 100,
      }));
    })(),
    fields: {
      comorbidity: { label: "Comorbidity", type: "categorical" },
      octrRate: { label: "OCTR Rate (%)", type: "numeric" },
      ectrRate: { label: "ECTR Rate (%)", type: "numeric" },
      octrCount: { label: "OCTR Count", type: "numeric" },
      ectrCount: { label: "ECTR Count", type: "numeric" },
      diff: { label: "Rate Difference (%)", type: "numeric" },
    },
  },
  sex: {
    label: "Sex Distribution (Table 1)",
    rows: (() => {
      const groups = [
        { cohort: "OCTR Unmatched", data: demographics.unmatchedOCTR, n: demographics.unmatchedOCTR.n },
        { cohort: "ECTR Unmatched", data: demographics.unmatchedECTR, n: demographics.unmatchedECTR.n },
        { cohort: "OCTR Matched",   data: demographics.matchedOCTR,   n: demographics.matchedOCTR.n },
        { cohort: "ECTR Matched",   data: demographics.matchedECTR,   n: demographics.matchedECTR.n },
      ];
      return groups.map((g) => ({
        cohort: g.cohort,
        malePct: (g.data.male / g.n) * 100,
        femalePct: (g.data.female / g.n) * 100,
        unknownPct: (g.data.unknownSex / g.n) * 100,
        maleCount: g.data.male,
        femaleCount: g.data.female,
      }));
    })(),
    fields: {
      cohort: { label: "Cohort", type: "categorical" },
      malePct: { label: "Male (%)", type: "numeric" },
      femalePct: { label: "Female (%)", type: "numeric" },
      unknownPct: { label: "Unknown (%)", type: "numeric" },
      maleCount: { label: "Male Count", type: "numeric" },
      femaleCount: { label: "Female Count", type: "numeric" },
    },
  },
  race: {
    label: "Race Distribution (Table 1, Matched)",
    rows: (() => {
      const groups = [
        { cohort: "OCTR Matched", d: demographics.matchedOCTR, n: demographics.matchedOCTR.n },
        { cohort: "ECTR Matched", d: demographics.matchedECTR, n: demographics.matchedECTR.n },
      ];
      return groups.map((g) => ({
        cohort: g.cohort,
        white: (g.d.white / g.n) * 100,
        blackAA: (g.d.blackAA / g.n) * 100,
        hispanic: (g.d.hispanicLatino / g.n) * 100,
        asian: (g.d.asian / g.n) * 100,
        other: ((g.d.otherRace + g.d.nativeHawaiian + g.d.americanIndian + g.d.unknownRace) / g.n) * 100,
      }));
    })(),
    fields: {
      cohort: { label: "Cohort", type: "categorical" },
      white: { label: "White (%)", type: "numeric" },
      blackAA: { label: "Black/AA (%)", type: "numeric" },
      hispanic: { label: "Hispanic/Latino (%)", type: "numeric" },
      asian: { label: "Asian (%)", type: "numeric" },
      other: { label: "Other/Unknown (%)", type: "numeric" },
    },
  },
};

// ── Chart renderers ──────────────────────────────────────────────────────────

function getVal(row, key, fields) {
  const f = fields[key];
  if (f.derive) return f.derive(row);
  return row[key];
}

// Legend is now rendered below the title (y=42) with adequate top margin (68)
const LEGEND_Y = 42;
const MARGIN_TOP = 68;

function renderGroupedBar(container, rows, fields, xKey, yKeys, title) {
  container.innerHTML = "";
  const width = 660;
  const height = 400;
  const margin = { top: MARGIN_TOP, right: 20, bottom: 90, left: 58 };
  const iW = width - margin.left - margin.right;
  const iH = height - margin.top - margin.bottom;

  const svg = d3.select(container).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  svg.append("text").attr("x", width / 2).attr("y", 22).attr("text-anchor", "middle").attr("class", "chart-title").text(title);

  const cats = rows.map((r) => String(getVal(r, xKey, fields)));
  const x0 = d3.scaleBand().domain(cats).range([0, iW]).padding(0.25);
  const x1 = d3.scaleBand().domain(yKeys).range([0, x0.bandwidth()]).padding(0.08);
  const colors = ["#2980b9", "#e74c3c", "#27ae60", "#8e44ad"];
  const maxVal = d3.max(rows, (r) => d3.max(yKeys, (k) => getVal(r, k, fields) ?? 0));
  const y = d3.scaleLinear().domain([0, maxVal * 1.15]).range([iH, 0]);

  g.append("g").attr("transform", `translate(0,${iH})`).call(d3.axisBottom(x0).tickSize(0))
    .selectAll("text").attr("class", "axis-text").attr("transform", "rotate(-35)").attr("text-anchor", "end").attr("dx", "-0.5em").attr("dy", "0.5em");

  g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat((d) => d.toFixed(1))).selectAll("text").attr("class", "axis-text");

  g.append("g").call(d3.axisLeft(y).ticks(5).tickSize(-iW).tickFormat("")).select(".domain").remove();
  g.selectAll(".tick line").attr("stroke", "#e8e8e8");

  const groups = g.selectAll(".grp").data(rows).join("g").attr("transform", (r) => `translate(${x0(String(getVal(r, xKey, fields)))},0)`);

  yKeys.forEach((k, i) => {
    groups.append("rect")
      .attr("x", x1(k)).attr("y", (r) => y(getVal(r, k, fields) ?? 0))
      .attr("width", x1.bandwidth()).attr("height", (r) => iH - y(getVal(r, k, fields) ?? 0))
      .attr("fill", colors[i % colors.length]).attr("rx", 2)
      .style("cursor", "pointer")
      .on("mouseover", (event, r) => {
        const catVal = String(getVal(r, xKey, fields));
        const yVal = getVal(r, k, fields);
        showTooltip(event, `<strong>${catVal}</strong>${fields[k].label}: ${yVal?.toFixed(2) ?? "N/A"}`);
      })
      .on("mousemove", moveTooltip)
      .on("mouseout", hideTooltip);
  });

  // Legend below title
  yKeys.forEach((k, i) => {
    svg.append("rect").attr("x", margin.left + i * 150).attr("y", LEGEND_Y).attr("width", 12).attr("height", 12).attr("fill", colors[i % colors.length]).attr("rx", 2);
    svg.append("text").attr("x", margin.left + i * 150 + 16).attr("y", LEGEND_Y + 10).attr("class", "legend-text").text(fields[k].label);
  });
}

const SCATTER_SHAPES = [
  d3.symbolCircle, d3.symbolDiamond, d3.symbolSquare,
  d3.symbolTriangle, d3.symbolStar, d3.symbolCross, d3.symbolWye,
];
const SCATTER_COLORS = ["#2980b9", "#e74c3c", "#27ae60", "#8e44ad", "#e67e22", "#16a085", "#c0392b", "#2c3e50"];

function renderScatter(container, rows, fields, xKey, yKey, colorKey, title) {
  container.innerHTML = "";
  const width = 660;

  // Build legend items first so we know how much top margin is needed
  const isCatColor = colorKey !== "significance" && fields[colorKey]?.type === "categorical";
  let legendItems = [];

  if (colorKey === "significance") {
    legendItems = [
      { color: "var(--sig-color)",    shape: d3.symbolCircle,  label: "Significant" },
      { color: "var(--nonsig-color)", shape: d3.symbolCircle,  label: "Not significant" },
    ];
  } else if (isCatColor) {
    const cats = [...new Set(rows.map((r) => String(getVal(r, colorKey, fields))))];
    const colorScale = d3.scaleOrdinal(SCATTER_COLORS).domain(cats);
    const shapeScale = d3.scaleOrdinal(SCATTER_SHAPES).domain(cats);
    legendItems = cats.map((cat) => ({ color: colorScale(cat), shape: shapeScale(cat), label: cat }));
  }

  const ITEMS_PER_ROW = 3;
  const legendRows = Math.ceil(legendItems.length / ITEMS_PER_ROW);
  const marginTop = Math.max(MARGIN_TOP, LEGEND_Y + legendRows * 18 + 10);

  const height = 420 + Math.max(0, marginTop - MARGIN_TOP);
  const margin = { top: marginTop, right: 30, bottom: 60, left: 62 };
  const iW = width - margin.left - margin.right;
  const iH = height - margin.top - margin.bottom;

  const svg = d3.select(container).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  svg.append("text").attr("x", width / 2).attr("y", 22).attr("text-anchor", "middle").attr("class", "chart-title").text(title);

  const xVals = rows.map((r) => getVal(r, xKey, fields));
  const yVals = rows.map((r) => getVal(r, yKey, fields));
  const x = d3.scaleLinear().domain([d3.min(xVals) * 0.9, d3.max(xVals) * 1.1]).range([0, iW]);
  const y = d3.scaleLinear().domain([d3.min(yVals) * 0.9, d3.max(yVals) * 1.1]).range([iH, 0]);

  g.append("g").attr("transform", `translate(0,${iH})`).call(d3.axisBottom(x).ticks(6).tickFormat((d) => d.toFixed(1))).selectAll("text").attr("class", "axis-text");
  g.append("g").call(d3.axisLeft(y).ticks(6).tickFormat((d) => d.toFixed(1))).selectAll("text").attr("class", "axis-text");

  g.append("text").attr("x", iW / 2).attr("y", iH + 44).attr("text-anchor", "middle").attr("class", "axis-label").text(fields[xKey].label);
  g.append("text").attr("transform", "rotate(-90)").attr("x", -iH / 2).attr("y", -48).attr("text-anchor", "middle").attr("class", "axis-label").text(fields[yKey].label);

  const catKey = Object.keys(fields).find((k) => fields[k].type === "categorical");

  // Derive per-row color and shape
  let colorFn, shapeFn;
  if (colorKey === "significance") {
    colorFn = (r) => (r.significant ? "var(--sig-color)" : "var(--nonsig-color)");
    shapeFn = () => d3.symbolCircle;
  } else if (isCatColor) {
    const cats = [...new Set(rows.map((r) => String(getVal(r, colorKey, fields))))];
    const colorScale = d3.scaleOrdinal(SCATTER_COLORS).domain(cats);
    const shapeScale = d3.scaleOrdinal(SCATTER_SHAPES).domain(cats);
    colorFn = (r) => colorScale(String(getVal(r, colorKey, fields)));
    shapeFn = (r) => shapeScale(String(getVal(r, colorKey, fields)));
  } else {
    colorFn = () => "var(--ectr-color)";
    shapeFn = () => d3.symbolCircle;
  }

  g.selectAll(".dot").data(rows).join("path")
    .attr("class", "dot")
    .attr("transform", (r) => `translate(${x(getVal(r, xKey, fields))},${y(getVal(r, yKey, fields))})`)
    .attr("d", (r) => d3.symbol().type(shapeFn(r)).size(70)())
    .attr("fill", colorFn)
    .attr("opacity", 0.85)
    .attr("stroke", "#fff").attr("stroke-width", 1.5)
    .style("cursor", "pointer")
    .on("mouseover", (event, r) => {
      const label = catKey ? String(r[catKey]) : "";
      const xVal = getVal(r, xKey, fields);
      const yVal = getVal(r, yKey, fields);
      let html = label ? `<strong>${label}</strong>` : "";
      html += `${fields[xKey].label}: ${xVal?.toFixed(2) ?? "N/A"}<br>${fields[yKey].label}: ${yVal?.toFixed(2) ?? "N/A"}`;
      showTooltip(event, html);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  if (catKey) {
    g.selectAll(".dot-label").data(rows).join("text")
      .attr("x", (r) => x(getVal(r, xKey, fields)) + 9)
      .attr("y", (r) => y(getVal(r, yKey, fields)) + 4)
      .attr("font-size", "9px").attr("fill", "var(--text-muted)")
      .text((r) => String(r[catKey]).slice(0, 12));
  }

  // Legend below title
  legendItems.forEach(({ color, shape, label }, i) => {
    const lx = margin.left + (i % ITEMS_PER_ROW) * 190;
    const ly = LEGEND_Y + Math.floor(i / ITEMS_PER_ROW) * 18;
    svg.append("path")
      .attr("transform", `translate(${lx + 6},${ly + 6})`)
      .attr("d", d3.symbol().type(shape).size(40)())
      .attr("fill", color);
    svg.append("text").attr("x", lx + 16).attr("y", ly + 10).attr("class", "legend-text").text(label.slice(0, 22));
  });
}

function renderLollipop(container, rows, fields, xKey, yKey, title) {
  container.innerHTML = "";
  const width = 660;
  const height = 400;
  const margin = { top: MARGIN_TOP, right: 20, bottom: 90, left: 58 };
  const iW = width - margin.left - margin.right;
  const iH = height - margin.top - margin.bottom;

  const svg = d3.select(container).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  svg.append("text").attr("x", width / 2).attr("y", 22).attr("text-anchor", "middle").attr("class", "chart-title").text(title);

  const cats = rows.map((r) => String(getVal(r, xKey, fields)));
  const vals = rows.map((r) => getVal(r, yKey, fields) ?? 0);
  const minV = d3.min(vals);
  const maxV = d3.max(vals);
  const x = d3.scaleBand().domain(cats).range([0, iW]).padding(0.4);
  const y = d3.scaleLinear().domain([Math.min(0, minV * 1.1), Math.max(0, maxV * 1.2)]).range([iH, 0]);

  g.append("g").attr("transform", `translate(0,${iH})`).call(d3.axisBottom(x).tickSize(0))
    .selectAll("text").attr("class", "axis-text").attr("transform", "rotate(-35)").attr("text-anchor", "end").attr("dx", "-0.5em").attr("dy", "0.5em");

  g.append("g").call(d3.axisLeft(y).ticks(6).tickFormat((d) => d.toFixed(1))).selectAll("text").attr("class", "axis-text");

  g.append("line").attr("x1", 0).attr("x2", iW).attr("y1", y(0)).attr("y2", y(0)).attr("class", "reference-line");

  g.selectAll(".stem").data(rows).join("line")
    .attr("x1", (r) => x(String(getVal(r, xKey, fields))) + x.bandwidth() / 2)
    .attr("x2", (r) => x(String(getVal(r, xKey, fields))) + x.bandwidth() / 2)
    .attr("y1", y(0)).attr("y2", (r) => y(getVal(r, yKey, fields) ?? 0))
    .attr("stroke", (r) => ((r.significant ?? true) ? "var(--sig-color)" : "var(--nonsig-color)"))
    .attr("stroke-width", 2);

  g.selectAll(".ball").data(rows).join("circle")
    .attr("cx", (r) => x(String(getVal(r, xKey, fields))) + x.bandwidth() / 2)
    .attr("cy", (r) => y(getVal(r, yKey, fields) ?? 0))
    .attr("r", 6)
    .attr("fill", (r) => ((r.significant ?? true) ? "var(--sig-color)" : "var(--nonsig-color)"))
    .style("cursor", "pointer")
    .on("mouseover", (event, r) => {
      const catVal = String(getVal(r, xKey, fields));
      const yVal = getVal(r, yKey, fields);
      let html = `<strong>${catVal}</strong>${fields[yKey].label}: ${yVal?.toFixed(2) ?? "N/A"}`;
      if (r.significant != null) html += r.significant
        ? `<br><span style="color:#ff9999">★ Statistically significant</span>`
        : `<br><span style="color:#aaa">Not significant</span>`;
      showTooltip(event, html);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  g.append("text").attr("x", iW / 2).attr("y", iH + 80).attr("text-anchor", "middle").attr("class", "axis-label").text(fields[yKey].label);

  // Legend below title
  [["var(--sig-color)", "Significant"], ["var(--nonsig-color)", "Not significant"]].forEach(([col, lbl], i) => {
    svg.append("circle").attr("cx", margin.left + i * 160 + 6).attr("cy", LEGEND_Y + 6).attr("r", 5).attr("fill", col);
    svg.append("text").attr("x", margin.left + i * 160 + 16).attr("y", LEGEND_Y + 10).attr("class", "legend-text").text(lbl);
  });
}

function renderHeatmap(container, rows, fields, metricKeys, title) {
  container.innerHTML = "";
  const catKey = Object.keys(fields).find((k) => fields[k].type === "categorical");
  const cats = rows.map((r) => String(r[catKey]));
  const width = 660;
  const height = 80 + cats.length * 36 + metricKeys.length * 10;
  const margin = { top: MARGIN_TOP + 20, right: 20, bottom: 40, left: 160 };
  const iW = width - margin.left - margin.right;
  const iH = height - margin.top - margin.bottom;

  const svg = d3.select(container).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  svg.append("text").attr("x", width / 2).attr("y", 22).attr("text-anchor", "middle").attr("class", "chart-title").text(title);

  const x = d3.scaleBand().domain(metricKeys).range([0, iW]).padding(0.05);
  const y = d3.scaleBand().domain(cats).range([0, iH]).padding(0.05);

  const colScales = {};
  metricKeys.forEach((k) => {
    const vals = rows.map((r) => getVal(r, k, fields)).filter((v) => v != null);
    colScales[k] = d3.scaleSequential(d3.interpolateRdYlGn).domain([d3.max(vals), d3.min(vals)]);
  });

  g.append("g").call(d3.axisTop(x).tickSize(0).tickFormat((k) => fields[k].label))
    .selectAll("text").attr("class", "axis-text").attr("transform", "rotate(-30)").attr("text-anchor", "start").attr("dx", "0.3em");

  g.append("g").call(d3.axisLeft(y).tickSize(0)).select(".domain").remove();
  g.selectAll(".tick text").attr("class", "axis-text");

  rows.forEach((r) => {
    const cat = String(r[catKey]);
    metricKeys.forEach((k) => {
      const val = getVal(r, k, fields);
      if (val == null) return;
      g.append("rect")
        .attr("x", x(k)).attr("y", y(cat))
        .attr("width", x.bandwidth()).attr("height", y.bandwidth())
        .attr("fill", colScales[k](val)).attr("rx", 3)
        .style("cursor", "pointer")
        .on("mouseover", (event) => showTooltip(event, `<strong>${cat}</strong>${fields[k].label}: ${val.toFixed(2)}`))
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);

      g.append("text")
        .attr("x", x(k) + x.bandwidth() / 2).attr("y", y(cat) + y.bandwidth() / 2 + 4)
        .attr("text-anchor", "middle").attr("font-size", "10px").attr("fill", "#333")
        .text(val.toFixed(1));
    });
  });
}

// ── Axis control builder ─────────────────────────────────────────────────────

function buildAxisControls(chartType, sourceKey) {
  const container = document.getElementById("axis-controls");
  container.innerHTML = "";
  const src = SOURCES[sourceKey];
  const numFields = Object.entries(src.fields).filter(([, f]) => f.type === "numeric");
  const catFields = Object.entries(src.fields).filter(([, f]) => f.type === "categorical");

  function makeSelect(id, label, options, defaultVal) {
    const grp = document.createElement("div");
    grp.className = "control-group";
    const lbl = document.createElement("label");
    lbl.setAttribute("for", id);
    lbl.textContent = label;
    const sel = document.createElement("select");
    sel.id = id;
    options.forEach(([val, txt]) => {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = txt;
      if (val === defaultVal) opt.selected = true;
      sel.appendChild(opt);
    });
    grp.appendChild(lbl);
    grp.appendChild(sel);
    container.appendChild(grp);
  }

  if (chartType === "grouped-bar") {
    makeSelect("ctrl-x", "X Axis (Category)", catFields.map(([k, f]) => [k, f.label]), catFields[0]?.[0]);
    makeSelect("ctrl-y1", "Y Axis — Series 1", numFields.map(([k, f]) => [k, f.label]), numFields[0]?.[0]);
    makeSelect("ctrl-y2", "Y Axis — Series 2 (optional)", [["none", "— None —"], ...numFields.map(([k, f]) => [k, f.label])], numFields[1]?.[0] ?? "none");
  } else if (chartType === "scatter") {
    makeSelect("ctrl-x", "X Axis", numFields.map(([k, f]) => [k, f.label]), numFields[0]?.[0]);
    makeSelect("ctrl-y", "Y Axis", numFields.map(([k, f]) => [k, f.label]), numFields[1]?.[0]);
    makeSelect("ctrl-color", "Color By", [["significance", "Significance"], ...catFields.map(([k, f]) => [k, f.label])], "significance");
  } else if (chartType === "lollipop") {
    makeSelect("ctrl-x", "X Axis (Category)", catFields.map(([k, f]) => [k, f.label]), catFields[0]?.[0]);
    makeSelect("ctrl-y", "Y Axis (Value)", numFields.map(([k, f]) => [k, f.label]), numFields[0]?.[0]);
  } else if (chartType === "heatmap") {
    const checkDiv = document.createElement("div");
    checkDiv.className = "control-group";
    const checkLabel = document.createElement("label");
    checkLabel.textContent = "Metrics to Show";
    checkDiv.appendChild(checkLabel);
    numFields.forEach(([k, f], i) => {
      const wrap = document.createElement("label");
      wrap.style.cssText = "display:flex;align-items:center;gap:6px;font-size:0.78rem;font-weight:400;text-transform:none;letter-spacing:0;margin-top:4px;cursor:pointer;";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.name = "heatmap-metric";
      cb.value = k;
      cb.checked = i < 4;
      wrap.appendChild(cb);
      wrap.appendChild(document.createTextNode(f.label));
      checkDiv.appendChild(wrap);
    });
    container.appendChild(checkDiv);
  }
}

// ── Stats summary ────────────────────────────────────────────────────────────

function computeStats(rows, fields, keys) {
  const out = document.getElementById("stats-output");
  const numKeys = keys.filter((k) => k && k !== "none" && fields[k]?.type === "numeric");
  if (!numKeys.length) { out.innerHTML = ""; return; }

  let html = "<table><tr><th>Field</th><th>Min</th><th>Max</th><th>Mean</th></tr>";
  numKeys.forEach((k) => {
    const vals = rows.map((r) => getVal(r, k, fields)).filter((v) => v != null && isFinite(v));
    const mn = d3.min(vals).toFixed(2);
    const mx = d3.max(vals).toFixed(2);
    const avg = d3.mean(vals).toFixed(2);
    html += `<tr><td>${fields[k].label}</td><td>${mn}</td><td>${mx}</td><td>${avg}</td></tr>`;
  });
  html += "</table>";
  out.innerHTML = html;
}

// ── Public init ──────────────────────────────────────────────────────────────

export function initCustomAnalysis() {
  const chartTypeEl = document.getElementById("chart-type");
  const dataSourceEl = document.getElementById("data-source");
  const exportBtn = document.getElementById("export-btn");
  const randomizeBtn = document.getElementById("randomize-btn");
  const chartContainer = document.getElementById("custom-chart");

  // Debounce state
  let debounceTimer = null;
  let renderToken = 0;

  function scheduleRender() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => doRender(), 300);
  }

  function doRender() {
    const token = ++renderToken;
    const chartType = chartTypeEl.value;
    const sourceKey = dataSourceEl.value;
    const src = SOURCES[sourceKey];
    if (!src) return;
    const rows = src.rows;
    const fields = src.fields;

    // Guard: if a newer render was scheduled, abort
    if (token !== renderToken) return;

    chartContainer.className = "card has-chart";
    chartContainer.innerHTML = "";

    if (chartType === "grouped-bar") {
      const xKey = document.getElementById("ctrl-x")?.value;
      const y1Key = document.getElementById("ctrl-y1")?.value;
      const y2Key = document.getElementById("ctrl-y2")?.value;
      const yKeys = [y1Key, ...(y2Key && y2Key !== "none" ? [y2Key] : [])];
      const title = yKeys.map((k) => fields[k].label).join(" vs ") + " by " + fields[xKey].label;
      if (token !== renderToken) return;
      renderGroupedBar(chartContainer, rows, fields, xKey, yKeys, title);
      computeStats(rows, fields, yKeys);
    } else if (chartType === "scatter") {
      const xKey = document.getElementById("ctrl-x")?.value;
      const yKey = document.getElementById("ctrl-y")?.value;
      const colorKey = document.getElementById("ctrl-color")?.value;
      const title = `${fields[yKey].label} vs ${fields[xKey].label}`;
      if (token !== renderToken) return;
      renderScatter(chartContainer, rows, fields, xKey, yKey, colorKey, title);
      computeStats(rows, fields, [xKey, yKey]);
    } else if (chartType === "lollipop") {
      const xKey = document.getElementById("ctrl-x")?.value;
      const yKey = document.getElementById("ctrl-y")?.value;
      const title = `${fields[yKey].label} by ${fields[xKey].label}`;
      if (token !== renderToken) return;
      renderLollipop(chartContainer, rows, fields, xKey, yKey, title);
      computeStats(rows, fields, [yKey]);
    } else if (chartType === "heatmap") {
      const checked = [...document.querySelectorAll("input[name='heatmap-metric']:checked")].map((el) => el.value);
      if (!checked.length) { chartContainer.innerHTML = "<div class='chart-placeholder'>Select at least one metric.</div>"; return; }
      if (token !== renderToken) return;
      renderHeatmap(chartContainer, rows, fields, checked, `${src.label} — Heatmap`);
      computeStats(rows, fields, checked);
    }
  }

  function refresh() {
    buildAxisControls(chartTypeEl.value, dataSourceEl.value);
    scheduleRender();
  }

  chartTypeEl.addEventListener("change", refresh);
  dataSourceEl.addEventListener("change", refresh);

  // Listen for changes on dynamically-built axis controls (event delegation)
  document.getElementById("axis-controls").addEventListener("change", scheduleRender);

  function randomize() {
    const chartTypes = ["grouped-bar", "scatter", "lollipop", "heatmap"];
    const sourceKeys = Object.keys(SOURCES);
    chartTypeEl.value = chartTypes[Math.floor(Math.random() * chartTypes.length)];
    dataSourceEl.value = sourceKeys[Math.floor(Math.random() * sourceKeys.length)];
    buildAxisControls(chartTypeEl.value, dataSourceEl.value);

    const selects = [...document.querySelectorAll("#axis-controls select")];
    const xSel = document.getElementById("ctrl-x");
    const ySel = document.getElementById("ctrl-y");
    selects.forEach((sel) => {
      sel.selectedIndex = Math.floor(Math.random() * sel.options.length);
    });
    // For scatter (and lollipop with same x/y field pool), ensure y != x
    if (xSel && ySel && xSel.options.length > 1) {
      while (ySel.value === xSel.value) {
        ySel.selectedIndex = Math.floor(Math.random() * ySel.options.length);
      }
    }

    const cbs = [...document.querySelectorAll("#axis-controls input[type='checkbox']")];
    if (cbs.length) {
      cbs.forEach((cb) => (cb.checked = Math.random() > 0.5));
      if (!cbs.some((cb) => cb.checked)) cbs[0].checked = true;
    }

    scheduleRender();
  }

  randomizeBtn.addEventListener("click", randomize);
  exportBtn.addEventListener("click", () => exportChartAsPng(chartContainer));

  // Initial render
  refresh();
}
