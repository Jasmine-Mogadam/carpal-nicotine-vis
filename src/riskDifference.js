import * as d3 from "d3";
import { showTooltip, moveTooltip, hideTooltip } from "./tooltip.js";

export function createRiskDifferenceChart(container, data, { title, width = 700, height = 420 }) {
  const margin = { top: 50, right: 80, bottom: 100, left: 160 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // Filter to matched data with ARD
  const chartData = data.filter((d) => d.ard !== undefined);

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("class", "risk-diff-chart");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .attr("class", "chart-title")
    .text(title);

  const y = d3
    .scaleBand()
    .domain(chartData.map((d) => d.complication))
    .range([0, innerH])
    .padding(0.3);

  const maxArd = d3.max(chartData, (d) => Math.abs(d.ard));
  const x = d3
    .scaleLinear()
    .domain([-maxArd * 1.2, maxArd * 1.2])
    .range([0, innerW]);

  // X axis
  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(d3.axisBottom(x).ticks(7).tickFormat((d) => d + "%"))
    .selectAll("text")
    .attr("class", "axis-text");

  g.append("text")
    .attr("x", innerW / 2)
    .attr("y", innerH + 40)
    .attr("text-anchor", "middle")
    .attr("class", "axis-label")
    .text("Absolute Risk Difference (%)");

  // Y axis
  g.append("g")
    .call(d3.axisLeft(y).tickSize(0))
    .select(".domain")
    .remove();

  g.selectAll(".tick text").attr("class", "axis-text");

  // Reference line at 0
  g.append("line")
    .attr("x1", x(0))
    .attr("x2", x(0))
    .attr("y1", 0)
    .attr("y2", innerH)
    .attr("class", "reference-line");

  // Bars
  g.selectAll(".ard-bar")
    .data(chartData)
    .join("rect")
    .attr("class", "ard-bar")
    .attr("x", (d) => (d.ard >= 0 ? x(0) : x(d.ard)))
    .attr("y", (d) => y(d.complication))
    .attr("width", (d) => Math.abs(x(d.ard) - x(0)))
    .attr("height", y.bandwidth())
    .attr("fill", (d) => (d.significant ? "var(--sig-color)" : "var(--nonsig-color)"))
    .attr("opacity", 0.8)
    .attr("rx", 3)
    .style("cursor", "pointer")
    .on("mouseover", (event, d) => {
      const nnt = d.ard === 0 ? "∞" : Math.round(100 / Math.abs(d.ard));
      const dir = d.ard > 0 ? "higher with Open CTR" : d.ard < 0 ? "higher with Endoscopic CTR" : "no difference";
      let html = `<strong>${d.complication}</strong>ARD: ${d.ard > 0 ? "+" : ""}${d.ard.toFixed(2)}% (${dir})<br>NNT: ${nnt}`;
      html += d.significant
        ? `<br><span style="color:#ff9999">★ Statistically significant</span>`
        : `<br><span style="color:#aaa">Not significant</span>`;
      showTooltip(event, html);
    })
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  // NNT labels on right
  g.selectAll(".nnt-label")
    .data(chartData)
    .join("text")
    .attr("class", "nnt-label")
    .attr("x", innerW + 8)
    .attr("y", (d) => y(d.complication) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("font-size", "10px")
    .attr("fill", (d) => (d.significant ? "var(--sig-color)" : "#999"))
    .text((d) => {
      if (d.ard === 0) return "NNT: \u221E";
      const nnt = Math.round(100 / Math.abs(d.ard));
      return `NNT: ${nnt}`;
    });

  // Favor labels
  g.append("text")
    .attr("x", x(0) - 8)
    .attr("y", -8)
    .attr("text-anchor", "end")
    .attr("class", "favor-label")
    .text("\u2190 Favors OCTR");

  g.append("text")
    .attr("x", x(0) + 8)
    .attr("y", -8)
    .attr("text-anchor", "start")
    .attr("class", "favor-label")
    .text("Higher risk with OCTR \u2192");
}
