import * as d3 from "d3";
import { showTooltip, moveTooltip, hideTooltip } from "./tooltip.js";

export function createDemographicsChart(container, demographics, { title, width = 700, height = 360 }) {
  const margin = { top: 50, right: 30, bottom: 80, left: 60 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("class", "demographics-chart");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .attr("class", "chart-title")
    .text(title);

  // Comorbidity data for matched cohorts
  const matchedOctr = demographics.matchedOCTR;
  const matchedEctr = demographics.matchedECTR;
  const octrN = demographics.matchedOCTR.n;
  const ectrN = demographics.matchedECTR.n;

  const labels = {
    diabetes: "Diabetes",
    obesity: "Obesity",
    heartDisease: "Heart Disease",
    hypertension: "Hypertension",
    renalDisease: "Renal Disease",
  };

  const chartData = Object.keys(labels).map((key) => ({
    label: labels[key],
    octrRate: (matchedOctr[key] / octrN) * 100,
    ectrRate: (matchedEctr[key] / ectrN) * 100,
    octrCount: matchedOctr[key],
    ectrCount: matchedEctr[key],
    octrN,
    ectrN,
  }));

  const x0 = d3
    .scaleBand()
    .domain(chartData.map((d) => d.label))
    .range([0, innerW])
    .padding(0.25);

  const x1 = d3
    .scaleBand()
    .domain(["octr", "ectr"])
    .range([0, x0.bandwidth()])
    .padding(0.08);

  const maxRate = d3.max(chartData, (d) => Math.max(d.octrRate, d.ectrRate));
  const y = d3.scaleLinear().domain([0, maxRate * 1.15]).range([innerH, 0]);

  // Gridlines
  g.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(""))
    .select(".domain")
    .remove();

  g.selectAll(".grid line").attr("stroke", "#e0e0e0").attr("stroke-dasharray", "3,3");

  // X axis
  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x0).tickSize(0))
    .selectAll("text")
    .attr("class", "axis-text")
    .attr("transform", "rotate(-25)")
    .attr("text-anchor", "end")
    .attr("dx", "-0.5em")
    .attr("dy", "0.5em");

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
    .text("Prevalence (%)");

  const groups = g
    .selectAll(".bar-group")
    .data(chartData)
    .join("g")
    .attr("transform", (d) => `translate(${x0(d.label)},0)`);

  groups
    .append("rect")
    .attr("x", x1("octr"))
    .attr("y", (d) => y(d.octrRate))
    .attr("width", x1.bandwidth())
    .attr("height", (d) => innerH - y(d.octrRate))
    .attr("fill", "var(--octr-color)")
    .attr("rx", 2)
    .style("cursor", "pointer")
    .on("mouseover", (event, d) => showTooltip(event,
      `<strong>${d.label}</strong>Open CTR (Matched): ${d.octrRate.toFixed(2)}% (${d.octrCount}/${d.octrN.toLocaleString()})<br>Endoscopic CTR (Matched): ${d.ectrRate.toFixed(2)}% (${d.ectrCount}/${d.ectrN.toLocaleString()})`))
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  groups
    .append("rect")
    .attr("x", x1("ectr"))
    .attr("y", (d) => y(d.ectrRate))
    .attr("width", x1.bandwidth())
    .attr("height", (d) => innerH - y(d.ectrRate))
    .attr("fill", "var(--ectr-color)")
    .attr("rx", 2)
    .style("cursor", "pointer")
    .on("mouseover", (event, d) => showTooltip(event,
      `<strong>${d.label}</strong>Endoscopic CTR (Matched): ${d.ectrRate.toFixed(2)}% (${d.ectrCount}/${d.ectrN.toLocaleString()})<br>Open CTR (Matched): ${d.octrRate.toFixed(2)}% (${d.octrCount}/${d.octrN.toLocaleString()})`))
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  groups
    .append("text")
    .attr("x", x1("octr") + x1.bandwidth() / 2)
    .attr("y", (d) => y(d.octrRate) - 4)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("fill", "var(--octr-color)")
    .text((d) => d.octrRate.toFixed(1) + "%");

  groups
    .append("text")
    .attr("x", x1("ectr") + x1.bandwidth() / 2)
    .attr("y", (d) => y(d.ectrRate) - 4)
    .attr("text-anchor", "middle")
    .attr("font-size", "10px")
    .attr("fill", "var(--ectr-color)")
    .text((d) => d.ectrRate.toFixed(1) + "%");

  // Legend
  const legend = svg.append("g").attr("transform", `translate(${width - 200}, 38)`);

  legend.append("rect").attr("width", 14).attr("height", 14).attr("fill", "var(--octr-color)").attr("rx", 2);
  legend.append("text").attr("x", 20).attr("y", 11).attr("class", "legend-text").text("Open CTR (matched)");

  legend
    .append("rect")
    .attr("x", 110)
    .attr("width", 14)
    .attr("height", 14)
    .attr("fill", "var(--ectr-color)")
    .attr("rx", 2);
  legend.append("text").attr("x", 130).attr("y", 11).attr("class", "legend-text").text("Endoscopic CTR");
}
