import * as d3 from "d3";
import { showTooltip, moveTooltip, hideTooltip } from "./tooltip.js";

// Outcome display labels and their data keys
const OUTCOMES = [
  { key: "edVisit",           label: "ED Visit",           short: "ED Visit" },
  { key: "superficialSSI",    label: "Superficial SSI",    short: "Sup. SSI" },
  { key: "deepSSI",           label: "Deep SSI",           short: "Deep SSI" },
  { key: "readmission",       label: "Readmission",        short: "Readmit" },
  { key: "additionalSurgery", label: "Additional Surgery", short: "Add'l Surg" },
  { key: "analgesics",        label: "Analgesics",         short: "Analgesics" },
  { key: "nerveInjury",       label: "Nerve / Vessel Injury", short: "Nerve Inj." },
  { key: "painSite",          label: "Pain at Site",       short: "Pain" },
];

// ── Heatmap: outcome rates (%) by comorbidity group ─────────────────────────
export function createMetacarpalHeatmap(container, data, { title, width = 760, height = 380 }) {
  const margin = { top: 56, right: 20, bottom: 110, left: 200 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // Compute rates
  const rows = data.map((d) => ({
    group: d.group,
    n: d.n,
    rates: OUTCOMES.map((o) => ({
      key: o.key,
      label: o.label,
      short: o.short,
      count: d[o.key] ?? 0,
      rate: d.n > 0 ? ((d[o.key] ?? 0) / d.n) * 100 : 0,
    })),
  }));

  const allRates = rows.flatMap((r) => r.rates.map((x) => x.rate));
  const colorScale = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, d3.max(allRates)]);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("class", "metacarpal-heatmap");

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
    .domain(rows.map((r) => r.group))
    .range([0, innerH])
    .padding(0.05);

  // X axis (rotated)
  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(xScale).tickSize(0))
    .select(".domain").remove();

  g.selectAll(".tick text")
    .attr("class", "axis-text")
    .attr("transform", "rotate(-40)")
    .attr("text-anchor", "end")
    .attr("dx", "-0.4em")
    .attr("dy", "0.2em");

  // Y axis
  g.append("g")
    .call(d3.axisLeft(yScale).tickSize(0))
    .select(".domain").remove();

  g.selectAll(".tick text").attr("class", "axis-text");

  // Cells
  rows.forEach((row) => {
    row.rates.forEach((cell) => {
      g.append("rect")
        .attr("x", xScale(cell.short))
        .attr("y", yScale(row.group))
        .attr("width", xScale.bandwidth())
        .attr("height", yScale.bandwidth())
        .attr("fill", colorScale(cell.rate))
        .attr("rx", 2)
        .style("cursor", "pointer")
        .on("mouseover", (event) =>
          showTooltip(event,
            `<strong>${row.group}</strong><br>` +
            `${cell.label}<br>` +
            `Rate: ${cell.rate.toFixed(2)}%<br>` +
            `Count: ${cell.count.toLocaleString()} / ${row.n.toLocaleString()}`
          )
        )
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);

      // Rate label inside cell if it fits
      if (yScale.bandwidth() > 18 && xScale.bandwidth() > 28) {
        g.append("text")
          .attr("x", xScale(cell.short) + xScale.bandwidth() / 2)
          .attr("y", yScale(row.group) + yScale.bandwidth() / 2 + 4)
          .attr("text-anchor", "middle")
          .attr("font-size", "9px")
          .attr("fill", cell.rate > d3.max(allRates) * 0.6 ? "#fff" : "#333")
          .text(cell.rate.toFixed(1) + "%");
      }
    });
  });

  // Color legend bar
  const legendW = 160, legendH = 10;
  const legendX = margin.left;
  const legendY = height - 22;

  const defs = svg.append("defs");
  const grad = defs.append("linearGradient").attr("id", "heatmap-legend-grad");
  [0, 0.25, 0.5, 0.75, 1].forEach((t) => {
    grad.append("stop").attr("offset", `${t * 100}%`).attr("stop-color", colorScale(t * d3.max(allRates)));
  });

  svg.append("rect")
    .attr("x", legendX).attr("y", legendY)
    .attr("width", legendW).attr("height", legendH)
    .style("fill", "url(#heatmap-legend-grad)");

  svg.append("text").attr("x", legendX).attr("y", legendY - 4)
    .attr("font-size", "10px").attr("fill", "var(--text-muted)").text("0%");
  svg.append("text").attr("x", legendX + legendW).attr("y", legendY - 4)
    .attr("font-size", "10px").attr("text-anchor", "end").attr("fill", "var(--text-muted)")
    .text(d3.max(allRates).toFixed(1) + "%");
  svg.append("text").attr("x", legendX + legendW / 2).attr("y", legendY - 4)
    .attr("font-size", "10px").attr("text-anchor", "middle").attr("fill", "var(--text-muted)")
    .text("Outcome rate");
}

// ── Bar chart: key clinical outcomes by comorbidity group ───────────────────
export function createMetacarpalOutcomesChart(container, data, { title, width = 760, height = 380 }) {
  const margin = { top: 56, right: 30, bottom: 120, left: 60 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // Show only the most clinically relevant non-analgesic outcomes
  const focusOutcomes = OUTCOMES.filter((o) =>
    ["edVisit", "readmission", "additionalSurgery", "nerveInjury", "painSite"].includes(o.key)
  );

  const groups = data.map((d) => d.group);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("class", "metacarpal-outcomes-chart");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 26)
    .attr("text-anchor", "middle")
    .attr("class", "chart-title")
    .text(title);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x0 = d3.scaleBand().domain(groups).range([0, innerW]).padding(0.25);
  const x1 = d3.scaleBand().domain(focusOutcomes.map((o) => o.key)).range([0, x0.bandwidth()]).padding(0.06);

  const maxRate = d3.max(data, (d) =>
    d3.max(focusOutcomes, (o) => d.n > 0 ? (d[o.key] / d.n) * 100 : 0)
  );
  const y = d3.scaleLinear().domain([0, maxRate * 1.15]).range([innerH, 0]);

  const color = d3.scaleOrdinal()
    .domain(focusOutcomes.map((o) => o.key))
    .range(["#2980b9", "#e74c3c", "#27ae60", "#8e44ad", "#f39c12"]);

  // Gridlines
  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(""))
    .select(".domain").remove();
  g.selectAll(".grid line").attr("stroke", "#e0e0e0").attr("stroke-dasharray", "3,3");

  // X axis
  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x0).tickSize(0))
    .selectAll("text")
    .attr("class", "axis-text")
    .attr("transform", "rotate(-35)")
    .attr("text-anchor", "end")
    .attr("dx", "-0.4em")
    .attr("dy", "0.2em");

  // Y axis
  g.append("g")
    .call(d3.axisLeft(y).ticks(5).tickFormat((d) => d + "%"))
    .selectAll("text")
    .attr("class", "axis-text");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .attr("class", "axis-label")
    .text("Outcome Rate (%)");

  // Bars
  data.forEach((d) => {
    const xGroup = g.append("g").attr("transform", `translate(${x0(d.group)},0)`);
    focusOutcomes.forEach((o) => {
      const rate = d.n > 0 ? (d[o.key] / d.n) * 100 : 0;
      xGroup.append("rect")
        .attr("x", x1(o.key))
        .attr("y", y(rate))
        .attr("width", x1.bandwidth())
        .attr("height", innerH - y(rate))
        .attr("fill", color(o.key))
        .attr("rx", 2)
        .style("cursor", "pointer")
        .on("mouseover", (event) =>
          showTooltip(event,
            `<strong>${d.group}</strong><br>` +
            `${o.label}: ${rate.toFixed(2)}%<br>` +
            `Count: ${(d[o.key] ?? 0).toLocaleString()} / ${d.n.toLocaleString()}`
          )
        )
        .on("mousemove", moveTooltip)
        .on("mouseout", hideTooltip);
    });
  });

  // Legend
  const legendY = height - 30;
  const legendSpacing = (width - margin.left - margin.right) / focusOutcomes.length;

  focusOutcomes.forEach((o, i) => {
    const lx = margin.left + i * legendSpacing;
    svg.append("rect").attr("x", lx).attr("y", legendY).attr("width", 12).attr("height", 12)
      .attr("fill", color(o.key)).attr("rx", 2);
    svg.append("text").attr("x", lx + 16).attr("y", legendY + 10)
      .attr("font-size", "10px").attr("fill", "var(--text)").text(o.label);
  });
}
