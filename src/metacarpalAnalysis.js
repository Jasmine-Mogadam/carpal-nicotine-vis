import * as d3 from "d3";
import { showTooltip, moveTooltip, hideTooltip } from "./tooltip.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const NICOTINE_KEY = "Smoking / Nicotine Dependence";

const OUTCOMES = [
  { key: "edVisit",           label: "ED Visit",        short: "ED Visit" },
  { key: "readmission",       label: "Readmission",     short: "Readmit" },
  { key: "additionalSurgery", label: "Add'l Surgery",   short: "Add'l Surg" },
  { key: "nerveInjury",       label: "Nerve Injury",    short: "Nerve Inj" },
  { key: "painSite",          label: "Pain at Site",    short: "Pain" },
  { key: "superficialSSI",    label: "Superficial SSI", short: "Sup SSI" },
  { key: "deepSSI",           label: "Deep SSI",        short: "Deep SSI" },
  { key: "analgesics",        label: "Analgesics",      short: "Analgesics" },
];

const KEY_OUTCOMES = OUTCOMES.slice(0, 5);

// ── Statistical helpers ───────────────────────────────────────────────────────

// Abramowitz & Stegun approximation, max error ~1.5e-7
function erf(x) {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const a1 =  0.254829592;
  const a2 = -0.284496736;
  const a3 =  1.421413741;
  const a4 = -1.453152027;
  const a5 =  1.061405429;
  const p  =  0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function normalCDF(z) {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

function chiSqP(chi2) {
  if (chi2 <= 0 || !isFinite(chi2)) return 1;
  return 1 - erf(Math.sqrt(chi2 / 2));
}

// 2×2 odds ratio with Woolf 95% CI and chi-square p-value
// a = events in group A, nA = total in group A
// c = events in reference, nRef = total in reference
function computeOR(a, nA, c, nRef) {
  const b = nA - a;
  const d = nRef - c;
  if (a <= 0 || b <= 0 || c <= 0 || d <= 0) return null;
  const or    = (a * d) / (b * c);
  const lnOR  = Math.log(or);
  const se    = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
  const ciLow  = Math.exp(lnOR - 1.96 * se);
  const ciHigh = Math.exp(lnOR + 1.96 * se);
  const N     = a + b + c + d;
  const chi2  = N * Math.pow(a * d - b * c, 2) / ((a + b) * (c + d) * (a + c) * (b + d));
  const p     = chiSqP(chi2);
  return { or, lnOR, se, ciLow, ciHigh, chi2, p, significant: p < 0.05 };
}

// Absolute risk difference (%) vs reference
function computeARD(eventA, nA, eventRef, nRef) {
  const rA   = eventA / nA;
  const rRef = eventRef / nRef;
  const ard  = (rA - rRef) * 100;
  const se   = Math.sqrt(rA * (1 - rA) / nA + rRef * (1 - rRef) / nRef) * 100;
  const z    = se > 0 ? ard / se : 0;
  const p    = 2 * (1 - normalCDF(Math.abs(z)));
  const zeroCell = eventA === 0 || (nA - eventA) === 0 || eventRef === 0 || (nRef - eventRef) === 0;
  return {
    ard,
    ciLow:  ard - 1.96 * se,
    ciHigh: ard + 1.96 * se,
    se,
    z,
    p,
    significant: p < 0.05,
    zeroCell,
  };
}

// Pearson r between equal-length arrays
function pearsonR(xs, ys) {
  const n = xs.length;
  if (n < 3) return 0;
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num  += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

// Minimum detectable difference at α=0.05, power=0.80
function mdd80(rRef, nA, nRef) {
  const r = Math.max(0.001, Math.min(0.999, rRef));
  return (1.96 + 0.842) * Math.sqrt(r * (1 - r) * (1 / nA + 1 / nRef)) * 100;
}

// ── Chart 1: Forest Plot (OR vs Nicotine) ────────────────────────────────────

export function createMetacarpalForestVsNicotine(container, data, { title, width = 920 }) {
  const ref    = data.find((d) => d.group === NICOTINE_KEY);
  const others = data.filter((d) => d.group !== NICOTINE_KEY);

  const sharedMarginL = 186;
  const marginR       = 16;
  const marginT       = 62;
  const marginB       = 36;
  const rowH          = 32;
  const innerH        = others.length * rowH;
  const panelGap      = 6;
  const nPanels       = KEY_OUTCOMES.length;
  const availW        = width - sharedMarginL - marginR - panelGap * (nPanels - 1);
  const panelW        = Math.floor(availW / nPanels);
  const totalH        = marginT + innerH + marginB;

  // Compute all OR results and collect CI bounds for global domain
  const allResults = {};
  KEY_OUTCOMES.forEach((outcome) => {
    allResults[outcome.key] = others.map((grp) => {
      const res = computeOR(grp[outcome.key], grp.n, ref[outcome.key], ref.n);
      return { group: grp.group, n: grp.n, res };
    });
  });

  let domainMin = 0.15, domainMax = 25;
  KEY_OUTCOMES.forEach((outcome) => {
    allResults[outcome.key].forEach(({ res }) => {
      if (res) {
        domainMin = Math.min(domainMin, Math.max(0.15, res.ciLow));
        domainMax = Math.max(domainMax, Math.min(25, res.ciHigh));
      }
    });
  });
  domainMin = Math.max(0.15, domainMin * 0.85);
  domainMax = Math.min(25,   domainMax * 1.15);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${totalH}`)
    .attr("class", "meta-forest-nicotine");

  // Title
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("class", "chart-title")
    .text(title);

  // Alternating row stripes (drawn behind everything)
  others.forEach((_, i) => {
    if (i % 2 === 1) {
      svg.append("rect")
        .attr("x", 0)
        .attr("y", marginT + i * rowH)
        .attr("width", width)
        .attr("height", rowH)
        .attr("fill", "#f7f7f7")
        .lower();
    }
  });

  // Shared Y axis (group labels)
  const yScale = d3.scaleBand()
    .domain(others.map((d) => d.group))
    .range([0, innerH])
    .padding(0);

  const yAxisG = svg.append("g")
    .attr("transform", `translate(${sharedMarginL},${marginT})`);

  yAxisG.call(
    d3.axisLeft(yScale)
      .tickSize(0)
  )
    .select(".domain").remove();

  yAxisG.selectAll(".tick text")
    .attr("class", "axis-text")
    .attr("font-size", "10px")
    .attr("dx", "-4px");

  // Legend (top, before panels)
  const legendX = sharedMarginL;
  const legendY = 42;

  // Red significant diamond
  svg.append("rect")
    .attr("x", legendX)
    .attr("y", legendY - 4)
    .attr("width", 8)
    .attr("height", 8)
    .attr("fill", "var(--sig-color)")
    .attr("transform", `rotate(45,${legendX + 4},${legendY})`);
  svg.append("text")
    .attr("x", legendX + 14)
    .attr("y", legendY + 4)
    .attr("font-size", "9px")
    .attr("fill", "var(--text-muted)")
    .text("P < .05");

  // Gray not-significant diamond
  svg.append("rect")
    .attr("x", legendX + 60)
    .attr("y", legendY - 4)
    .attr("width", 8)
    .attr("height", 8)
    .attr("fill", "var(--nonsig-color)")
    .attr("transform", `rotate(45,${legendX + 64},${legendY})`);
  svg.append("text")
    .attr("x", legendX + 74)
    .attr("y", legendY + 4)
    .attr("font-size", "9px")
    .attr("fill", "var(--text-muted)")
    .text("Not sig.");

  // X axis label (centered across all panels)
  const allPanelsLeft  = sharedMarginL;
  const allPanelsRight = sharedMarginL + nPanels * panelW + (nPanels - 1) * panelGap;
  svg.append("text")
    .attr("x", (allPanelsLeft + allPanelsRight) / 2)
    .attr("y", totalH - 4)
    .attr("text-anchor", "middle")
    .attr("class", "axis-label")
    .attr("font-size", "9px")
    .text("Odds Ratio vs Nicotine Reference (log scale)");

  // Each panel
  KEY_OUTCOMES.forEach((outcome, pi) => {
    const panelOffsetX = sharedMarginL + pi * (panelW + panelGap);

    const xScale = d3.scaleLog()
      .domain([domainMin, domainMax])
      .range([0, panelW]);

    const panelG = svg.append("g")
      .attr("transform", `translate(${panelOffsetX},${marginT})`);

    // Panel title
    svg.append("text")
      .attr("x", panelOffsetX + panelW / 2)
      .attr("y", marginT - 8)
      .attr("text-anchor", "middle")
      .attr("font-size", "9.5px")
      .attr("font-weight", "600")
      .attr("fill", "var(--text)")
      .text(outcome.label);

    // Dashed reference line at OR=1
    panelG.append("line")
      .attr("x1", xScale(1))
      .attr("x2", xScale(1))
      .attr("y1", 0)
      .attr("y2", innerH)
      .attr("stroke", "#888")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3");

    // X axis
    panelG.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(2)
          .tickFormat(d3.format(".2~g"))
      )
      .selectAll("text")
      .attr("class", "axis-text")
      .attr("font-size", "8px");

    panelG.select(".domain").remove();

    // Direction labels below x axis
    panelG.append("text")
      .attr("x", xScale(1) - 4)
      .attr("y", innerH + 28)
      .attr("text-anchor", "end")
      .attr("font-size", "7.5px")
      .attr("fill", "var(--text-muted)")
      .text("← Nicotine higher risk");

    panelG.append("text")
      .attr("x", xScale(1) + 4)
      .attr("y", innerH + 28)
      .attr("text-anchor", "start")
      .attr("font-size", "7.5px")
      .attr("fill", "var(--text-muted)")
      .text("Group higher risk →");

    // Data rows
    allResults[outcome.key].forEach(({ group, n, res }) => {
      const cy = yScale(group) + yScale.bandwidth() / 2;
      const rowG = panelG.append("g");

      if (res === null) {
        // Show dash at OR=1 for uncomputable cells
        rowG.append("text")
          .attr("x", xScale(1))
          .attr("y", cy + 4)
          .attr("text-anchor", "middle")
          .attr("font-size", "11px")
          .attr("fill", "#aaa")
          .text("—");
      } else {
        const clampedLow  = Math.max(domainMin, res.ciLow);
        const clampedHigh = Math.min(domainMax, res.ciHigh);
        const color = res.significant ? "var(--sig-color)" : "var(--nonsig-color)";
        const grpData = data.find((d) => d.group === group);

        const tipHtml =
          `<strong>${group}</strong><br>` +
          `n = ${n.toLocaleString()}<br>` +
          `Outcome: ${outcome.label}<br>` +
          `OR = ${res.or.toFixed(2)} (95% CI: ${res.ciLow.toFixed(2)}–${res.ciHigh.toFixed(2)})<br>` +
          `P = ${res.p < 0.001 ? "<0.001" : res.p.toFixed(3)}<br>` +
          (res.significant
            ? `<span style="color:#e74c3c">★ Significantly different from nicotine</span>`
            : `<span style="color:#aaa">Not significantly different</span>`);

        // CI line
        rowG.append("line")
          .attr("x1", xScale(clampedLow))
          .attr("x2", xScale(clampedHigh))
          .attr("y1", cy)
          .attr("y2", cy)
          .attr("stroke", color)
          .attr("stroke-width", 1.5)
          .style("cursor", "pointer")
          .on("mouseover", (event) => showTooltip(event, tipHtml))
          .on("mousemove", moveTooltip)
          .on("mouseout", hideTooltip);

        // Diamond marker
        const cx = xScale(Math.max(domainMin, Math.min(domainMax, res.or)));
        const ds = 4.5;
        rowG.append("rect")
          .attr("x", cx - ds / 2)
          .attr("y", cy - ds / 2)
          .attr("width", ds)
          .attr("height", ds)
          .attr("fill", color)
          .attr("transform", `rotate(45,${cx},${cy})`)
          .style("cursor", "pointer")
          .on("mouseover", (event) => showTooltip(event, tipHtml))
          .on("mousemove", moveTooltip)
          .on("mouseout", hideTooltip);
      }
    });
  });
}

// ── Chart 2: P-Value Heatmap ──────────────────────────────────────────────────

export function createMetacarpalPValueHeatmap(container, data, { title, width = 760, height = 380 }) {
  const ref    = data.find((d) => d.group === NICOTINE_KEY);
  const others = data.filter((d) => d.group !== NICOTINE_KEY);

  const margin = { top: 56, right: 20, bottom: 110, left: 200 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const colorScale = d3.scaleSequential(d3.interpolateOrRd).domain([0, 4]);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("class", "meta-pvalue-heatmap");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 26)
    .attr("text-anchor", "middle")
    .attr("class", "chart-title")
    .text(title);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleBand()
    .domain(OUTCOMES.map((o) => o.short))
    .range([0, innerW])
    .padding(0.05);

  const yScale = d3.scaleBand()
    .domain(others.map((d) => d.group))
    .range([0, innerH])
    .padding(0.05);

  // X axis (rotated)
  const xAxisG = g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).tickSize(0));
  xAxisG.select(".domain").remove();
  xAxisG.selectAll(".tick text")
    .attr("class", "axis-text")
    .attr("transform", "rotate(-40)")
    .attr("text-anchor", "end")
    .attr("dx", "-0.4em")
    .attr("dy", "0.2em");

  // Y axis
  const yAxisG = g.append("g")
    .call(d3.axisLeft(yScale).tickSize(0));
  yAxisG.select(".domain").remove();
  yAxisG.selectAll(".tick text")
    .attr("class", "axis-text")
    .attr("font-size", "9px");

  // Cells
  others.forEach((grp) => {
    OUTCOMES.forEach((outcome) => {
      const a = grp[outcome.key];
      const b = grp.n - a;
      const c = ref[outcome.key];
      const d = ref.n - c;

      const isComputable = a > 0 && b > 0 && c > 0 && d > 0;
      let p = null, chi2 = null, negLogP = 0;

      if (isComputable) {
        const res = computeOR(a, grp.n, c, ref.n);
        if (res) {
          chi2   = res.chi2;
          p      = res.p;
          negLogP = Math.min(4, -Math.log10(Math.max(1e-4, p)));
        }
      }

      const fill   = isComputable && p !== null ? colorScale(negLogP) : "#e8e8e8";
      const cellX  = xScale(outcome.short);
      const cellY  = yScale(grp.group);
      const cellW  = xScale.bandwidth();
      const cellH  = yScale.bandwidth();

      let stars = "";
      if (p !== null) {
        if      (p < 0.001) stars = "***";
        else if (p < 0.01)  stars = "**";
        else if (p < 0.05)  stars = "*";
      }

      const tipHtml = isComputable && p !== null
        ? `<strong>${grp.group}</strong><br>` +
          `Outcome: ${outcome.label}<br>` +
          `χ² = ${chi2.toFixed(2)}<br>` +
          `P = ${p < 0.001 ? "<0.001" : p.toFixed(3)}<br>` +
          `−log₁₀(P) = ${negLogP.toFixed(2)}<br>` +
          (p < 0.05
            ? `<span style="color:#e74c3c">★ Significantly different from nicotine</span>`
            : `<span style="color:#aaa">Not significantly different</span>`)
        : `<strong>${grp.group}</strong><br>` +
          `Outcome: ${outcome.label}<br>` +
          `Zero-event cell (not computable)`;

      g.append("rect")
        .attr("x", cellX)
        .attr("y", cellY)
        .attr("width", cellW)
        .attr("height", cellH)
        .attr("fill", fill)
        .attr("rx", 2)
        .style("cursor", "pointer")
        .on("mouseover", (event) => showTooltip(event, tipHtml))
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);

      if (stars || !isComputable) {
        const label = isComputable ? stars : "—";
        g.append("text")
          .attr("x", cellX + cellW / 2)
          .attr("y", cellY + cellH / 2 + 4)
          .attr("text-anchor", "middle")
          .attr("font-size", "9px")
          .attr("fill", isComputable && (p < 0.05) ? "#fff" : "#666")
          .text(label);
      }
    });
  });

  // Color legend bar
  const legendW = 160, legendH = 10;
  const legendX = margin.left + innerW / 2 - legendW / 2;
  const legendY = height - 28;

  const defs = svg.append("defs");
  const gradId = "pvalue-heatmap-grad";
  const grad = defs.append("linearGradient").attr("id", gradId);
  [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
    grad.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", colorScale(t * 4));
  });

  svg.append("rect")
    .attr("x", legendX)
    .attr("y", legendY)
    .attr("width", legendW)
    .attr("height", legendH)
    .style("fill", `url(#${gradId})`);

  svg.append("text")
    .attr("x", legendX)
    .attr("y", legendY - 4)
    .attr("font-size", "9px")
    .attr("fill", "var(--text-muted)")
    .text("0");
  svg.append("text")
    .attr("x", legendX + legendW / 2)
    .attr("y", legendY - 4)
    .attr("text-anchor", "middle")
    .attr("font-size", "9px")
    .attr("fill", "var(--text-muted)")
    .text("−log₁₀(P), capped at 4");
  svg.append("text")
    .attr("x", legendX + legendW)
    .attr("y", legendY - 4)
    .attr("text-anchor", "end")
    .attr("font-size", "9px")
    .attr("fill", "var(--text-muted)")
    .text("4");

  svg.append("text")
    .attr("x", legendX + legendW / 2)
    .attr("y", legendY + legendH + 12)
    .attr("text-anchor", "middle")
    .attr("font-size", "9px")
    .attr("fill", "var(--text-muted)")
    .text("* P<.05  ** P<.01  *** P<.001");
}

// ── Chart 3: ARD Small Multiples ──────────────────────────────────────────────

export function createMetacarpalARDChart(container, data, { title, width = 920 }) {
  const ref    = data.find((d) => d.group === NICOTINE_KEY);
  const others = data.filter((d) => d.group !== NICOTINE_KEY);

  const sharedMarginL = 186;
  const marginR       = 16;
  const marginT       = 62;
  const marginB       = 36;
  const rowH          = 32;
  const innerH        = others.length * rowH;
  const panelGap      = 6;
  const nPanels       = KEY_OUTCOMES.length;
  const availW        = width - sharedMarginL - marginR - panelGap * (nPanels - 1);
  const panelW        = Math.floor(availW / nPanels);
  const totalH        = marginT + innerH + marginB;

  // Compute all ARD results
  const allResults = {};
  KEY_OUTCOMES.forEach((outcome) => {
    allResults[outcome.key] = others.map((grp) => {
      const res = computeARD(grp[outcome.key], grp.n, ref[outcome.key], ref.n);
      return { group: grp.group, n: grp.n, res };
    });
  });

  // Global X domain
  let maxAbs = 2;
  KEY_OUTCOMES.forEach((outcome) => {
    allResults[outcome.key].forEach(({ res }) => {
      maxAbs = Math.max(maxAbs, Math.abs(res.ciLow), Math.abs(res.ciHigh));
    });
  });
  maxAbs = maxAbs * 1.2;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${totalH}`)
    .attr("class", "meta-ard-chart");

  // Title
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("class", "chart-title")
    .text(title);

  // Alternating row stripes
  others.forEach((_, i) => {
    if (i % 2 === 1) {
      svg.append("rect")
        .attr("x", 0)
        .attr("y", marginT + i * rowH)
        .attr("width", width)
        .attr("height", rowH)
        .attr("fill", "#f7f7f7")
        .lower();
    }
  });

  // Shared Y axis (group labels)
  const yScale = d3.scaleBand()
    .domain(others.map((d) => d.group))
    .range([0, innerH])
    .padding(0);

  const yAxisG = svg.append("g")
    .attr("transform", `translate(${sharedMarginL},${marginT})`);

  yAxisG.call(
    d3.axisLeft(yScale).tickSize(0)
  )
    .select(".domain").remove();

  yAxisG.selectAll(".tick text")
    .attr("class", "axis-text")
    .attr("font-size", "10px")
    .attr("dx", "-4px");

  // Legend
  const legendX = sharedMarginL;
  const legendY = 42;

  // Red = group higher
  svg.append("circle")
    .attr("cx", legendX + 4)
    .attr("cy", legendY)
    .attr("r", 4)
    .attr("fill", "#c0392b");
  svg.append("text")
    .attr("x", legendX + 12)
    .attr("y", legendY + 4)
    .attr("font-size", "9px")
    .attr("fill", "var(--text-muted)")
    .text("Group higher risk");

  // Blue = nicotine higher
  svg.append("circle")
    .attr("cx", legendX + 110)
    .attr("cy", legendY)
    .attr("r", 4)
    .attr("fill", "#2980b9");
  svg.append("text")
    .attr("x", legendX + 118)
    .attr("y", legendY + 4)
    .attr("font-size", "9px")
    .attr("fill", "var(--text-muted)")
    .text("Nicotine higher risk");

  // X axis label
  const allPanelsLeft  = sharedMarginL;
  const allPanelsRight = sharedMarginL + nPanels * panelW + (nPanels - 1) * panelGap;
  svg.append("text")
    .attr("x", (allPanelsLeft + allPanelsRight) / 2)
    .attr("y", totalH - 4)
    .attr("text-anchor", "middle")
    .attr("class", "axis-label")
    .attr("font-size", "9px")
    .text("Absolute Risk Difference (%, vs Nicotine Reference)");

  // Each panel
  KEY_OUTCOMES.forEach((outcome, pi) => {
    const panelOffsetX = sharedMarginL + pi * (panelW + panelGap);

    const xScale = d3.scaleLinear()
      .domain([-maxAbs, maxAbs])
      .range([0, panelW]);

    const panelG = svg.append("g")
      .attr("transform", `translate(${panelOffsetX},${marginT})`);

    // Panel title
    svg.append("text")
      .attr("x", panelOffsetX + panelW / 2)
      .attr("y", marginT - 8)
      .attr("text-anchor", "middle")
      .attr("font-size", "9.5px")
      .attr("font-weight", "600")
      .attr("fill", "var(--text)")
      .text(outcome.label);

    // Dashed reference line at ARD=0
    panelG.append("line")
      .attr("x1", xScale(0))
      .attr("x2", xScale(0))
      .attr("y1", 0)
      .attr("y2", innerH)
      .attr("stroke", "#888")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "3,3");

    // X axis
    panelG.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(
        d3.axisBottom(xScale)
          .ticks(3)
          .tickFormat((d) => (d > 0 ? "+" : "") + d.toFixed(1) + "%")
      )
      .selectAll("text")
      .attr("class", "axis-text")
      .attr("font-size", "7.5px");

    panelG.select(".domain").remove();

    // Direction labels
    panelG.append("text")
      .attr("x", xScale(0) - 4)
      .attr("y", innerH + 28)
      .attr("text-anchor", "end")
      .attr("font-size", "7.5px")
      .attr("fill", "var(--text-muted)")
      .text("← Nicotine worse");

    panelG.append("text")
      .attr("x", xScale(0) + 4)
      .attr("y", innerH + 28)
      .attr("text-anchor", "start")
      .attr("font-size", "7.5px")
      .attr("fill", "var(--text-muted)")
      .text("Group worse →");

    // Data rows
    allResults[outcome.key].forEach(({ group, n, res }) => {
      const cy = yScale(group) + yScale.bandwidth() / 2;
      const rowG = panelG.append("g");

      const isPos = res.ard >= 0;
      let color;
      if (res.significant) {
        color = isPos ? "#c0392b" : "#2980b9";
      } else {
        color = isPos ? "#e8a099" : "#9ab7d4";
      }

      const clampedLow  = Math.max(-maxAbs, res.ciLow);
      const clampedHigh = Math.min(maxAbs,  res.ciHigh);

      const tipHtml =
        `<strong>${group}</strong><br>` +
        `n = ${n.toLocaleString()}<br>` +
        `Outcome: ${outcome.label}<br>` +
        `ARD = ${res.ard >= 0 ? "+" : ""}${res.ard.toFixed(2)}% ` +
        `(95% CI: ${res.ciLow >= 0 ? "+" : ""}${res.ciLow.toFixed(2)}% to ` +
        `${res.ciHigh >= 0 ? "+" : ""}${res.ciHigh.toFixed(2)}%)<br>` +
        `P = ${res.p < 0.001 ? "<0.001" : res.p.toFixed(3)}<br>` +
        (res.significant
          ? `<span style="color:#e74c3c">★ Significantly different from nicotine</span>`
          : `<span style="color:#aaa">Not significantly different</span>`) +
        (res.zeroCell
          ? `<br><span style="color:#e67e22">⚠ Zero-event cell (CI may be narrow)</span>`
          : "");

      // CI line
      rowG.append("line")
        .attr("x1", xScale(clampedLow))
        .attr("x2", xScale(clampedHigh))
        .attr("y1", cy)
        .attr("y2", cy)
        .attr("stroke", color)
        .attr("stroke-width", 1.5)
        .style("cursor", "pointer")
        .on("mouseover", (event) => showTooltip(event, tipHtml))
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);

      // Circle marker
      const cx = xScale(Math.max(-maxAbs, Math.min(maxAbs, res.ard)));
      rowG.append("circle")
        .attr("cx", cx)
        .attr("cy", cy)
        .attr("r", 3.5)
        .attr("fill", color)
        .style("cursor", "pointer")
        .on("mouseover", (event) => showTooltip(event, tipHtml))
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);
    });
  });
}

// ── Chart 4: Outcome Correlation Matrix ──────────────────────────────────────

export function createOutcomeCorrelationMatrix(container, data, { title, width = 540, height = 540 }) {
  const margin = { top: 80, right: 20, bottom: 20, left: 100 };
  const cellSize = Math.min(
    width  - margin.left - margin.right,
    height - margin.top  - margin.bottom
  ) / OUTCOMES.length;

  const totalW = margin.left + cellSize * OUTCOMES.length + margin.right;
  const totalH = margin.top  + cellSize * OUTCOMES.length + margin.bottom;

  // Compute rate vectors and all pairwise Pearson r values
  const rateVectors = OUTCOMES.map((o) =>
    data.map((d) => (d.n > 0 ? d[o.key] / d.n * 100 : 0))
  );

  const rMatrix = OUTCOMES.map((_, ri) =>
    OUTCOMES.map((_, ci) => pearsonR(rateVectors[ri], rateVectors[ci]))
  );

  const colorScale = d3.scaleDiverging(d3.interpolateRdBu).domain([-1, 0, 1]);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${totalW} ${totalH}`)
    .attr("class", "meta-corr-matrix");

  // Title
  svg.append("text")
    .attr("x", totalW / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("class", "chart-title")
    .text(title);

  // Subtitle
  svg.append("text")
    .attr("x", totalW / 2)
    .attr("y", 36)
    .attr("text-anchor", "middle")
    .attr("font-size", "9px")
    .attr("fill", "var(--text-muted)")
    .text("Pearson r computed across 9 comorbidity group rates (n=9 data points per correlation)");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Row labels (Y axis)
  OUTCOMES.forEach((o, i) => {
    g.append("text")
      .attr("x", -6)
      .attr("y", i * cellSize + cellSize / 2 + 3)
      .attr("text-anchor", "end")
      .attr("font-size", "9px")
      .attr("fill", "var(--text)")
      .text(o.short);
  });

  // Column labels (X axis at top, rotated)
  OUTCOMES.forEach((o, i) => {
    g.append("text")
      .attr("x", i * cellSize + cellSize / 2)
      .attr("y", -6)
      .attr("text-anchor", "start")
      .attr("font-size", "9px")
      .attr("fill", "var(--text)")
      .attr("transform", `rotate(-45, ${i * cellSize + cellSize / 2}, -6)`)
      .text(o.short);
  });

  // Cells
  OUTCOMES.forEach((rowO, ri) => {
    OUTCOMES.forEach((colO, ci) => {
      const r    = rMatrix[ri][ci];
      const fill = colorScale(r);
      const cx   = ci * cellSize;
      const cy   = ri * cellSize;

      const strengthLabel = (() => {
        const absR = Math.abs(r);
        if (absR >= 0.9) return "Very strong";
        if (absR >= 0.7) return "Strong";
        if (absR >= 0.5) return "Moderate";
        return "Weak";
      })();
      const dirLabel = r > 0 ? "positive" : r < 0 ? "negative" : "no";

      const tipHtml =
        `<strong>${rowO.short} × ${colO.short}</strong><br>` +
        `Pearson r = ${r.toFixed(3)}<br>` +
        `${strengthLabel} ${dirLabel} correlation<br>` +
        `(n=9 group rates)`;

      g.append("rect")
        .attr("x", cx)
        .attr("y", cy)
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("fill", fill)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .on("mouseover", (event) => showTooltip(event, tipHtml))
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);

      if (cellSize >= 32) {
        g.append("text")
          .attr("x", cx + cellSize / 2)
          .attr("y", cy + cellSize / 2 + 3)
          .attr("text-anchor", "middle")
          .attr("font-size", "8px")
          .attr("fill", Math.abs(r) > 0.5 ? "#fff" : "#333")
          .text(r.toFixed(2));
      }
    });
  });

  // Color legend bar
  const legendW = 160, legendH = 10;
  const legendX = (totalW - legendW) / 2;
  const legendY = totalH - 18;

  const defs = svg.append("defs");
  const gradId = "corr-legend-grad";
  const grad = defs.append("linearGradient").attr("id", gradId);
  [-1, -0.5, 0, 0.5, 1].forEach((v, i, arr) => {
    grad.append("stop")
      .attr("offset", `${((v + 1) / 2) * 100}%`)
      .attr("stop-color", colorScale(v));
  });

  svg.append("rect")
    .attr("x", legendX)
    .attr("y", legendY)
    .attr("width", legendW)
    .attr("height", legendH)
    .style("fill", `url(#${gradId})`);

  svg.append("text")
    .attr("x", legendX)
    .attr("y", legendY - 3)
    .attr("font-size", "8px")
    .attr("fill", "var(--text-muted)")
    .text("r = −1");
  svg.append("text")
    .attr("x", legendX + legendW / 2)
    .attr("y", legendY - 3)
    .attr("text-anchor", "middle")
    .attr("font-size", "8px")
    .attr("fill", "var(--text-muted)")
    .text("0");
  svg.append("text")
    .attr("x", legendX + legendW)
    .attr("y", legendY - 3)
    .attr("text-anchor", "end")
    .attr("font-size", "8px")
    .attr("fill", "var(--text-muted)")
    .text("+1");
}

// ── Chart 5: Power Bubble Chart ───────────────────────────────────────────────

export function createPowerBubbleChart(container, data, { title, width = 760, height = 440 }) {
  const ref    = data.find((d) => d.group === NICOTINE_KEY);
  const others = data.filter((d) => d.group !== NICOTINE_KEY);

  const margin = { top: 56, right: 40, bottom: 70, left: 70 };
  const innerW = width  - margin.left - margin.right;
  const innerH = height - margin.top  - margin.bottom;

  // Compute nSig (outcomes significantly different from nicotine) per non-nicotine group
  const groupStats = data.map((grp) => {
    const isRef    = grp.group === NICOTINE_KEY;
    const totEvents = OUTCOMES.reduce((s, o) => s + (grp[o.key] ?? 0), 0);
    const burden   = grp.n > 0 ? (totEvents / grp.n) * 100 : 0;
    const readRate = grp.n > 0 ? grp.readmission / grp.n * 100 : 0;

    let nSig = 0;
    let mddVal = null;
    if (!isRef) {
      OUTCOMES.forEach((o) => {
        const res = computeOR(grp[o.key], grp.n, ref[o.key], ref.n);
        if (res && res.significant) nSig++;
      });
      mddVal = mdd80(ref.readmission / ref.n, grp.n, ref.n);
    }

    return { ...grp, isRef, burden, readRate, nSig, mddVal };
  });

  const xScale = d3.scaleLog()
    .domain([d3.min(groupStats, (d) => d.n) * 0.8, d3.max(groupStats, (d) => d.n) * 1.3])
    .range([0, innerW]);

  const yScale = d3.scaleLinear()
    .domain([0, d3.max(groupStats, (d) => d.burden) * 1.15])
    .range([innerH, 0]);

  const readmissionExtent = d3.extent(groupStats, (d) => d.readRate);
  const sizeScale = d3.scaleSqrt()
    .domain([0, Math.max(readmissionExtent[1], 20)])
    .range([5, 24]);

  const sigColorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, 8]);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("class", "meta-power-bubble");

  // Title
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .attr("class", "chart-title")
    .text(title);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Y gridlines
  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerW).tickFormat(""))
    .select(".domain").remove();
  g.selectAll(".grid line")
    .attr("stroke", "#e0e0e0")
    .attr("stroke-dasharray", "3,3");

  // X gridlines
  g.append("g")
    .attr("class", "grid-x")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).ticks(5, ".2~s").tickSize(-innerH).tickFormat(""))
    .select(".domain").remove();
  g.selectAll(".grid-x line")
    .attr("stroke", "#e0e0e0")
    .attr("stroke-dasharray", "3,3");

  // X axis
  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).ticks(5, ".2~s"))
    .selectAll("text")
    .attr("class", "axis-text");

  // Y axis
  g.append("g")
    .call(d3.axisLeft(yScale).ticks(5).tickFormat((d) => d + "%"))
    .selectAll("text")
    .attr("class", "axis-text");

  // X axis label
  g.append("text")
    .attr("x", innerW / 2)
    .attr("y", innerH + 40)
    .attr("text-anchor", "middle")
    .attr("class", "axis-label")
    .text("Group Size (n, log scale)");

  // Y axis label
  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -52)
    .attr("text-anchor", "middle")
    .attr("class", "axis-label")
    .text("Composite Complication Burden (%)");

  // Bubbles
  groupStats.forEach((d) => {
    const cx   = xScale(d.n);
    const cy   = yScale(d.burden);
    const r    = sizeScale(d.readRate);
    const fill = d.isRef ? "#2980b9" : sigColorScale(d.nSig);

    const tipHtml =
      `<strong>${d.group}${d.isRef ? " [Nicotine Reference]" : ""}</strong><br>` +
      `n = ${d.n.toLocaleString()}<br>` +
      `Composite burden: ${d.burden.toFixed(1)}%<br>` +
      `Readmission rate: ${d.readRate.toFixed(2)}%` +
      (!d.isRef
        ? `<br>Outcomes sig. different from nicotine: ${d.nSig}/8` +
          `<br>MDD for readmission (α=.05, power=.80): ±${d.mddVal.toFixed(2)}%`
        : "");

    g.append("circle")
      .attr("cx", cx)
      .attr("cy", cy)
      .attr("r", r)
      .attr("fill", fill)
      .attr("fill-opacity", 0.82)
      .attr("stroke", d.isRef ? "#1a6fa0" : "#666")
      .attr("stroke-width", d.isRef ? 2.5 : 0.5)
      .style("cursor", "pointer")
      .on("mouseover", (event) => showTooltip(event, tipHtml))
      .on("mousemove", moveTooltip)
      .on("mouseout", hideTooltip);

    // Label above bubble (truncate to 22 chars)
    const labelText = d.group.length > 22 ? d.group.slice(0, 22) + "…" : d.group;
    g.append("text")
      .attr("x", cx)
      .attr("y", cy - r - 3)
      .attr("text-anchor", "middle")
      .attr("font-size", "8px")
      .attr("fill", "var(--text)")
      .text(labelText);
  });

  // Bubble size legend (top-right)
  const legendRates = [5, 10, 20];
  const blegX = innerW - 80;
  const blegY = 10;

  g.append("text")
    .attr("x", blegX + 30)
    .attr("y", blegY)
    .attr("text-anchor", "middle")
    .attr("font-size", "8px")
    .attr("fill", "var(--text-muted)")
    .text("Readmission rate");

  let blegOffset = blegY + 8;
  legendRates.forEach((rate) => {
    const r = sizeScale(rate);
    blegOffset += r;
    g.append("circle")
      .attr("cx", blegX + 10)
      .attr("cy", blegOffset)
      .attr("r", r)
      .attr("fill", "none")
      .attr("stroke", "#999")
      .attr("stroke-width", 1);
    g.append("text")
      .attr("x", blegX + 10 + r + 4)
      .attr("y", blegOffset + 3)
      .attr("font-size", "8px")
      .attr("fill", "var(--text-muted)")
      .text(rate + "%");
    blegOffset += r + 4;
  });

  // Bottom footnote
  svg.append("text")
    .attr("x", margin.left)
    .attr("y", height - 8)
    .attr("font-size", "8px")
    .attr("fill", "var(--text-muted)")
    .text("Bubble color: yellow→red = more outcomes significantly different from nicotine. Bubble size = readmission rate. MDD = min. detectable diff. (α=.05, power=.80).");
}
