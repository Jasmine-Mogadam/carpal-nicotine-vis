import * as d3 from "d3";
import { showTooltip, moveTooltip, hideTooltip } from "./tooltip.js";

// ── Sex Distribution: 100% stacked bar (4 cohorts × 3 segments) ──────────────

export function createSexDistributionChart(container, demographics, { title, width = 700, height = 360 }) {
  const margin = { top: 70, right: 20, bottom: 80, left: 60 };
  const iW = width - margin.left - margin.right;
  const iH = height - margin.top - margin.bottom;

  const cohorts = [
    { label: "OCTR\n(Unmatched)", data: demographics.unmatchedOCTR, n: demographics.unmatchedOCTR.n },
    { label: "ECTR\n(Unmatched)", data: demographics.unmatchedECTR, n: demographics.unmatchedECTR.n },
    { label: "OCTR\n(Matched)", data: demographics.matchedOCTR, n: demographics.matchedOCTR.n },
    { label: "ECTR\n(Matched)", data: demographics.matchedECTR, n: demographics.matchedECTR.n },
  ];

  const segments = ["male", "female", "unknownSex"];
  const segColors = ["#2980b9", "#e74c3c", "#bdc3c7"];
  const segLabels = ["Male", "Female", "Unknown"];

  const stackedData = cohorts.map((c) => ({
    label: c.label,
    male: (c.data.male / c.n) * 100,
    female: (c.data.female / c.n) * 100,
    unknownSex: (c.data.unknownSex / c.n) * 100,
    _n: c.n,
    _maleCnt: c.data.male,
    _femaleCnt: c.data.female,
    _unknownCnt: c.data.unknownSex,
  }));

  const stack = d3.stack().keys(segments)(stackedData);

  const svg = d3.select(container).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  svg.append("text").attr("x", width / 2).attr("y", 22).attr("text-anchor", "middle").attr("class", "chart-title").text(title);

  // Legend below title
  segments.forEach((_, i) => {
    svg.append("rect").attr("x", margin.left + i * 120).attr("y", 36).attr("width", 12).attr("height", 12).attr("fill", segColors[i]).attr("rx", 2);
    svg.append("text").attr("x", margin.left + i * 120 + 16).attr("y", 46).attr("class", "legend-text").text(segLabels[i]);
  });

  const x = d3.scaleBand().domain(cohorts.map((c) => c.label)).range([0, iW]).padding(0.4);
  const y = d3.scaleLinear().domain([0, 100]).range([iH, 0]);

  // Gridlines
  g.append("g").call(d3.axisLeft(y).ticks(5).tickSize(-iW).tickFormat("")).select(".domain").remove();
  g.selectAll(".tick line").attr("stroke", "#e8e8e8");

  // Axes
  g.append("g").attr("transform", `translate(0,${iH})`)
    .call(d3.axisBottom(x).tickSize(0))
    .selectAll("text").attr("class", "axis-text").each(function (d) {
      const parts = d.split("\n");
      const el = d3.select(this);
      el.text("");
      parts.forEach((p, i) => {
        el.append("tspan").attr("x", 0).attr("dy", i === 0 ? "1.1em" : "1.2em").text(p);
      });
    });

  g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat((d) => d + "%")).selectAll("text").attr("class", "axis-text");

  g.append("text").attr("transform", "rotate(-90)").attr("x", -iH / 2).attr("y", -45).attr("text-anchor", "middle").attr("class", "axis-label").text("Share of Cohort (%)");

  // Vertical divider between unmatched/matched
  g.append("line")
    .attr("x1", (x("OCTR\n(Matched)") || 0) - 16)
    .attr("x2", (x("OCTR\n(Matched)") || 0) - 16)
    .attr("y1", 0).attr("y2", iH)
    .attr("stroke", "#ccc").attr("stroke-dasharray", "4,3").attr("stroke-width", 1);

  // Labels for unmatched / matched sections
  const matchedX = x("OCTR\n(Matched)") ?? 0;
  g.append("text").attr("x", matchedX / 2).attr("y", -8).attr("text-anchor", "middle").attr("font-size", "10px").attr("fill", "var(--text-muted)").text("Unmatched");
  g.append("text").attr("x", matchedX + (iW - matchedX) / 2).attr("y", -8).attr("text-anchor", "middle").attr("font-size", "10px").attr("fill", "var(--text-muted)").text("Propensity-Matched");

  // Stacked bars
  stack.forEach((layer, i) => {
    g.selectAll(null).data(layer).join("rect")
      .attr("x", (d) => x(d.data.label))
      .attr("y", (d) => y(d[1]))
      .attr("width", x.bandwidth())
      .attr("height", (d) => Math.max(0, y(d[0]) - y(d[1])))
      .attr("fill", segColors[i])
      .attr("opacity", 0.85)
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        const pct = (d[1] - d[0]).toFixed(1);
        const cnt = [d.data._maleCnt, d.data._femaleCnt, d.data._unknownCnt][i];
        const cohortLabel = d.data.label.replace(/\n/g, " ");
        showTooltip(event, `<strong>${cohortLabel}</strong>${segLabels[i]}: ${pct}%<br>Count: ${cnt.toLocaleString()} / ${d.data._n.toLocaleString()}`);
      })
      .on("mousemove", moveTooltip)
      .on("mouseout", hideTooltip);
  });

  // Value labels inside bars (only if tall enough)
  stack.forEach((layer, i) => {
    g.selectAll(null).data(layer).join("text")
      .filter((d) => Math.abs(d[1] - d[0]) > 5)
      .attr("x", (d) => x(d.data.label) + x.bandwidth() / 2)
      .attr("y", (d) => y((d[0] + d[1]) / 2) + 4)
      .attr("text-anchor", "middle")
      .attr("font-size", "9px")
      .attr("fill", i === 2 ? "#666" : "#fff")
      .text((d) => (d[1] - d[0]).toFixed(0) + "%");
  });
}

// ── Race/Ethnicity: grouped bar (matched cohort, % per category) ──────────────

export function createRaceDistributionChart(container, demographics, { title, width = 700, height = 380 }) {
  const margin = { top: 70, right: 20, bottom: 90, left: 60 };
  const iW = width - margin.left - margin.right;
  const iH = height - margin.top - margin.bottom;

  const octrN = demographics.matchedOCTR.n;
  const ectrN = demographics.matchedECTR.n;
  const octrRace = demographics.matchedOCTR;
  const ectrRace = demographics.matchedECTR;

  // Aggregate "Other" = other + nativeHawaiian + americanIndian
  const categories = [
    { key: "white",         label: "White" },
    { key: "blackAA",       label: "Black/AA" },
    { key: "hispanicLatino",label: "Hispanic/Latino" },
    { key: "asian",         label: "Asian" },
    { key: "other",         label: "Other/Unknown" },
  ];

  function getRate(raceObj, key, n) {
    if (key === "other") return ((raceObj.otherRace + raceObj.nativeHawaiian + raceObj.americanIndian + raceObj.unknownRace) / n) * 100;
    return (raceObj[key] / n) * 100;
  }

  const chartData = categories.map((c) => ({
    label: c.label,
    octr: getRate(octrRace, c.key, octrN),
    ectr: getRate(ectrRace, c.key, ectrN),
  }));

  const svg = d3.select(container).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  svg.append("text").attr("x", width / 2).attr("y", 22).attr("text-anchor", "middle").attr("class", "chart-title").text(title);

  // Legend below title
  [["var(--octr-color)", "Open CTR (Matched)"], ["var(--ectr-color)", "Endoscopic CTR (Matched)"]].forEach(([color, label], i) => {
    svg.append("rect").attr("x", margin.left + i * 190).attr("y", 36).attr("width", 12).attr("height", 12).attr("fill", color).attr("rx", 2);
    svg.append("text").attr("x", margin.left + i * 190 + 16).attr("y", 46).attr("class", "legend-text").text(label);
  });

  const x0 = d3.scaleBand().domain(categories.map((c) => c.label)).range([0, iW]).padding(0.3);
  const x1 = d3.scaleBand().domain(["octr", "ectr"]).range([0, x0.bandwidth()]).padding(0.1);
  const maxVal = d3.max(chartData, (d) => Math.max(d.octr, d.ectr));
  const y = d3.scaleLinear().domain([0, maxVal * 1.2]).range([iH, 0]);

  g.append("g").call(d3.axisLeft(y).ticks(5).tickSize(-iW).tickFormat("")).select(".domain").remove();
  g.selectAll(".tick line").attr("stroke", "#e8e8e8");

  g.append("g").attr("transform", `translate(0,${iH})`).call(d3.axisBottom(x0).tickSize(0))
    .selectAll("text").attr("class", "axis-text").attr("transform", "rotate(-20)").attr("text-anchor", "end").attr("dx", "-0.4em").attr("dy", "0.9em");

  g.append("g").call(d3.axisLeft(y).ticks(5).tickFormat((d) => d.toFixed(0) + "%")).selectAll("text").attr("class", "axis-text");

  g.append("text").attr("transform", "rotate(-90)").attr("x", -iH / 2).attr("y", -45).attr("text-anchor", "middle").attr("class", "axis-label").text("Prevalence in Matched Cohort (%)");

  const groups = g.selectAll(".rg").data(chartData).join("g").attr("transform", (d) => `translate(${x0(d.label)},0)`);

  groups.append("rect").attr("x", x1("octr")).attr("y", (d) => y(d.octr))
    .attr("width", x1.bandwidth()).attr("height", (d) => iH - y(d.octr))
    .attr("fill", "var(--octr-color)").attr("rx", 2)
    .style("cursor", "pointer")
    .on("mouseover", (event, d) => showTooltip(event,
      `<strong>${d.label}</strong>Open CTR (Matched): ${d.octr.toFixed(1)}%<br>Endoscopic CTR (Matched): ${d.ectr.toFixed(1)}%<br><span style="color:#aaa;font-size:11px">N = ${octrN.toLocaleString()} each group</span>`))
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  groups.append("rect").attr("x", x1("ectr")).attr("y", (d) => y(d.ectr))
    .attr("width", x1.bandwidth()).attr("height", (d) => iH - y(d.ectr))
    .attr("fill", "var(--ectr-color)").attr("rx", 2)
    .style("cursor", "pointer")
    .on("mouseover", (event, d) => showTooltip(event,
      `<strong>${d.label}</strong>Endoscopic CTR (Matched): ${d.ectr.toFixed(1)}%<br>Open CTR (Matched): ${d.octr.toFixed(1)}%<br><span style="color:#aaa;font-size:11px">N = ${ectrN.toLocaleString()} each group</span>`))
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  // Value labels
  groups.append("text").attr("x", x1("octr") + x1.bandwidth() / 2).attr("y", (d) => y(d.octr) - 4)
    .attr("text-anchor", "middle").attr("font-size", "9px").attr("fill", "var(--octr-color)").text((d) => d.octr.toFixed(0) + "%");

  groups.append("text").attr("x", x1("ectr") + x1.bandwidth() / 2).attr("y", (d) => y(d.ectr) - 4)
    .attr("text-anchor", "middle").attr("font-size", "9px").attr("fill", "var(--ectr-color)").text((d) => d.ectr.toFixed(0) + "%");
}

// ── Patient Profile Parallel Comparison ──────────────────────────────────────
// Shows age (mean), sex (% female), and comorbidity rates across all 4 cohorts
// Each metric is normalized 0–100% of its range for comparison

export function createPatientProfileChart(container, demographics, { title, width = 700, height = 400 }) {
  const margin = { top: 70, right: 20, bottom: 80, left: 60 };
  const iW = width - margin.left - margin.right;
  const iH = height - margin.top - margin.bottom;

  const cohorts = [
    {
      label: "OCTR Unmatched",
      color: "#c0392b",
      style: "dashed",
      age: demographics.unmatchedOCTR.meanAge,
      female: (demographics.unmatchedOCTR.female / demographics.unmatchedOCTR.n) * 100,
      diabetes: (demographics.unmatchedOCTR.diabetes / demographics.unmatchedOCTR.n) * 100,
      obesity: (demographics.unmatchedOCTR.obesity / demographics.unmatchedOCTR.n) * 100,
      heartDisease: (demographics.unmatchedOCTR.heartDisease / demographics.unmatchedOCTR.n) * 100,
      hypertension: (demographics.unmatchedOCTR.hypertension / demographics.unmatchedOCTR.n) * 100,
      renalDisease: (demographics.unmatchedOCTR.renalDisease / demographics.unmatchedOCTR.n) * 100,
    },
    {
      label: "ECTR Unmatched",
      color: "#1a6fa8",
      style: "dashed",
      age: demographics.unmatchedECTR.meanAge,
      female: (demographics.unmatchedECTR.female / demographics.unmatchedECTR.n) * 100,
      diabetes: (demographics.unmatchedECTR.diabetes / demographics.unmatchedECTR.n) * 100,
      obesity: (demographics.unmatchedECTR.obesity / demographics.unmatchedECTR.n) * 100,
      heartDisease: (demographics.unmatchedECTR.heartDisease / demographics.unmatchedECTR.n) * 100,
      hypertension: (demographics.unmatchedECTR.hypertension / demographics.unmatchedECTR.n) * 100,
      renalDisease: (demographics.unmatchedECTR.renalDisease / demographics.unmatchedECTR.n) * 100,
    },
    {
      label: "OCTR Matched",
      color: "#c0392b",
      style: "solid",
      age: demographics.matchedOCTR.meanAge,
      female: (demographics.matchedOCTR.female / demographics.matchedOCTR.n) * 100,
      diabetes: (demographics.matchedOCTR.diabetes / demographics.matchedOCTR.n) * 100,
      obesity: (demographics.matchedOCTR.obesity / demographics.matchedOCTR.n) * 100,
      heartDisease: (demographics.matchedOCTR.heartDisease / demographics.matchedOCTR.n) * 100,
      hypertension: (demographics.matchedOCTR.hypertension / demographics.matchedOCTR.n) * 100,
      renalDisease: (demographics.matchedOCTR.renalDisease / demographics.matchedOCTR.n) * 100,
    },
    {
      label: "ECTR Matched",
      color: "#1a6fa8",
      style: "solid",
      age: demographics.matchedECTR.meanAge,
      female: (demographics.matchedECTR.female / demographics.matchedECTR.n) * 100,
      diabetes: (demographics.matchedECTR.diabetes / demographics.matchedECTR.n) * 100,
      obesity: (demographics.matchedECTR.obesity / demographics.matchedECTR.n) * 100,
      heartDisease: (demographics.matchedECTR.heartDisease / demographics.matchedECTR.n) * 100,
      hypertension: (demographics.matchedECTR.hypertension / demographics.matchedECTR.n) * 100,
      renalDisease: (demographics.matchedECTR.renalDisease / demographics.matchedECTR.n) * 100,
    },
  ];

  const metrics = [
    { key: "female", label: "Female (%)" },
    { key: "diabetes", label: "Diabetes (%)" },
    { key: "obesity", label: "Obesity (%)" },
    { key: "heartDisease", label: "Heart Disease (%)" },
    { key: "hypertension", label: "Hypertension (%)" },
    { key: "renalDisease", label: "Renal Disease (%)" },
  ];

  // Per-metric scales (normalize each column independently)
  const yScales = {};
  metrics.forEach((m) => {
    const vals = cohorts.map((c) => c[m.key]);
    const lo = d3.min(vals);
    const hi = d3.max(vals);
    const pad = (hi - lo) * 0.2 || 1;
    yScales[m.key] = d3.scaleLinear().domain([lo - pad, hi + pad]).range([iH, 0]);
  });

  const x = d3.scalePoint().domain(metrics.map((m) => m.key)).range([0, iW]).padding(0.1);

  const svg = d3.select(container).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  svg.append("text").attr("x", width / 2).attr("y", 22).attr("text-anchor", "middle").attr("class", "chart-title").text(title);

  // Legend
  cohorts.forEach((c, i) => {
    const lx = margin.left + i * 155;
    const ly = 36;
    svg.append("line").attr("x1", lx).attr("x2", lx + 18).attr("y1", ly + 6).attr("y2", ly + 6)
      .attr("stroke", c.color).attr("stroke-width", 2).attr("stroke-dasharray", c.style === "dashed" ? "4,3" : "none");
    svg.append("circle").attr("cx", lx + 9).attr("cy", ly + 6).attr("r", 3).attr("fill", c.color);
    svg.append("text").attr("x", lx + 22).attr("y", ly + 10).attr("class", "legend-text").text(c.label);
  });

  // Axis per metric
  metrics.forEach((m) => {
    const mx = x(m.key);
    g.append("g").attr("transform", `translate(${mx},0)`)
      .call(d3.axisLeft(yScales[m.key]).ticks(4).tickFormat((d) => d.toFixed(0)))
      .selectAll("text").attr("class", "axis-text").attr("x", -4);

    g.append("text").attr("x", mx).attr("y", iH + 16).attr("text-anchor", "middle").attr("font-size", "9px").attr("fill", "var(--text-muted)").text(m.label.split(" ")[0]);
    g.append("text").attr("x", mx).attr("y", iH + 28).attr("text-anchor", "middle").attr("font-size", "9px").attr("fill", "var(--text-muted)").text(m.label.split(" ").slice(1).join(" "));
  });

  // Lines
  const line = d3.line().defined((d) => d != null).x((d) => x(d.key)).y((d) => yScales[d.key](d.val));

  cohorts.forEach((c) => {
    const points = metrics.map((m) => ({ key: m.key, val: c[m.key] }));
    g.append("path")
      .datum(points)
      .attr("fill", "none")
      .attr("stroke", c.color)
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", c.style === "dashed" ? "5,4" : "none")
      .attr("opacity", 0.85)
      .attr("d", line);

    g.selectAll(null).data(points).join("circle")
      .attr("cx", (d) => x(d.key)).attr("cy", (d) => yScales[d.key](d.val))
      .attr("r", 4).attr("fill", c.color).attr("stroke", "#fff").attr("stroke-width", 1.5)
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => {
        const metricLabel = metrics.find((m) => m.key === d.key)?.label ?? d.key;
        showTooltip(event, `<strong>${c.label}</strong>${metricLabel}: ${d.val.toFixed(1)}%`);
      })
      .on("mousemove", moveTooltip)
      .on("mouseout", hideTooltip);
  });
}
