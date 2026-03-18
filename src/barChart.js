import * as d3 from "d3";
import { showTooltip, moveTooltip, hideTooltip } from "./tooltip.js";

export function createGroupedBarChart(container, data, { title, width = 700, height = 420 }) {
  const margin = { top: 50, right: 30, bottom: 100, left: 60 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("class", "bar-chart");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Title
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .attr("class", "chart-title")
    .text(title);

  // Compute rates
  const chartData = data.map((d) => ({
    ...d,
    octrRate: (d.octr / d.octrN) * 100,
    ectrRate: (d.ectr / d.ectrN) * 100,
  }));

  function barTip(d, active) {
    const octrLine = `Open CTR: ${d.octrRate.toFixed(2)}% (${d.octr}/${d.octrN.toLocaleString()})`;
    const ectrLine = `Endoscopic CTR: ${d.ectrRate.toFixed(2)}% (${d.ectr}/${d.ectrN.toLocaleString()})`;
    let html = `<strong>${d.complication}</strong>`;
    html += active === "octr"
      ? `<span style="text-decoration:underline">${octrLine}</span><br>${ectrLine}`
      : `${octrLine}<br><span style="text-decoration:underline">${ectrLine}</span>`;
    if (d.or != null) html += `<br>OR: ${d.or.toFixed(1)} (95% CI: ${d.ciLow.toFixed(1)}–${d.ciHigh.toFixed(1)})`;
    if (d.significant) html += `<br><span style="color:#ff9999">★ Statistically significant</span>`;
    return html;
  }

  const x0 = d3
    .scaleBand()
    .domain(chartData.map((d) => d.complication))
    .range([0, innerW])
    .padding(0.25);

  const x1 = d3
    .scaleBand()
    .domain(["octr", "ectr"])
    .range([0, x0.bandwidth()])
    .padding(0.08);

  const maxRate = d3.max(chartData, (d) => Math.max(d.octrRate, d.ectrRate));
  const y = d3.scaleLinear().domain([0, maxRate * 1.15]).range([innerH, 0]);

  // X axis
  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x0).tickSize(0))
    .selectAll("text")
    .attr("class", "axis-text")
    .attr("transform", "rotate(-40)")
    .attr("text-anchor", "end")
    .attr("dx", "-0.5em")
    .attr("dy", "0.5em");

  // Y axis
  g.append("g")
    .call(d3.axisLeft(y).ticks(6).tickFormat((d) => d + "%"))
    .selectAll("text")
    .attr("class", "axis-text");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerH / 2)
    .attr("y", -45)
    .attr("text-anchor", "middle")
    .attr("class", "axis-label")
    .text("Complication Rate (%)");

  // Gridlines
  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat(""))
    .select(".domain")
    .remove();

  g.selectAll(".grid line").attr("stroke", "#e0e0e0").attr("stroke-dasharray", "3,3");

  // Bars
  const groups = g
    .selectAll(".bar-group")
    .data(chartData)
    .join("g")
    .attr("transform", (d) => `translate(${x0(d.complication)},0)`);

  // OCTR bars
  groups
    .append("rect")
    .attr("x", x1("octr"))
    .attr("y", (d) => y(d.octrRate))
    .attr("width", x1.bandwidth())
    .attr("height", (d) => innerH - y(d.octrRate))
    .attr("fill", "var(--octr-color)")
    .attr("rx", 2)
    .style("cursor", "pointer")
    .on("mouseover", (event, d) => showTooltip(event, barTip(d, "octr")))
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  // ECTR bars
  groups
    .append("rect")
    .attr("x", x1("ectr"))
    .attr("y", (d) => y(d.ectrRate))
    .attr("width", x1.bandwidth())
    .attr("height", (d) => innerH - y(d.ectrRate))
    .attr("fill", "var(--ectr-color)")
    .attr("rx", 2)
    .style("cursor", "pointer")
    .on("mouseover", (event, d) => showTooltip(event, barTip(d, "ectr")))
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  // Value labels on bars
  groups
    .append("text")
    .attr("x", x1("octr") + x1.bandwidth() / 2)
    .attr("y", (d) => y(d.octrRate) - 4)
    .attr("text-anchor", "middle")
    .attr("font-size", "9px")
    .attr("fill", "var(--octr-color)")
    .text((d) => d.octrRate.toFixed(1) + "%");

  groups
    .append("text")
    .attr("x", x1("ectr") + x1.bandwidth() / 2)
    .attr("y", (d) => y(d.ectrRate) - 4)
    .attr("text-anchor", "middle")
    .attr("font-size", "9px")
    .attr("fill", "var(--ectr-color)")
    .text((d) => d.ectrRate.toFixed(1) + "%");

  // Significance markers
  groups
    .filter((d) => d.significant)
    .append("text")
    .attr("x", x0.bandwidth() / 2)
    .attr("y", (d) => y(Math.max(d.octrRate, d.ectrRate)) - 14)
    .attr("text-anchor", "middle")
    .attr("font-size", "13px")
    .attr("fill", "var(--sig-color)")
    .text("*");

  // Legend (stacked vertically to avoid clipping)
  const legend = svg.append("g").attr("transform", `translate(${width - 150}, 14)`);

  legend.append("rect").attr("width", 14).attr("height", 14).attr("fill", "var(--octr-color)").attr("rx", 2);
  legend.append("text").attr("x", 20).attr("y", 11).attr("class", "legend-text").text("Open CTR");

  legend
    .append("rect")
    .attr("y", 20)
    .attr("width", 14)
    .attr("height", 14)
    .attr("fill", "var(--ectr-color)")
    .attr("rx", 2);
  legend.append("text").attr("x", 20).attr("y", 31).attr("class", "legend-text").text("Endoscopic CTR");
}
