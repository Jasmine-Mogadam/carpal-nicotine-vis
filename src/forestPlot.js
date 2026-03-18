import * as d3 from "d3";
import { showTooltip, moveTooltip, hideTooltip } from "./tooltip.js";

export function createForestPlot(container, data, { title, width = 700, height = null }) {
  const margin = { top: 50, right: 40, bottom: 50, left: 160 };
  const rowHeight = 36;
  const calculatedHeight = height || margin.top + margin.bottom + data.length * rowHeight;
  const innerW = width - margin.left - margin.right;
  const innerH = calculatedHeight - margin.top - margin.bottom;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${calculatedHeight}`)
    .attr("class", "forest-plot");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  // Title
  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .attr("class", "chart-title")
    .text(title);

  // X scale — log scale for odds ratios
  const maxCI = d3.max(data, (d) => d.ciHigh);
  const minCI = d3.min(data, (d) => d.ciLow);
  const x = d3
    .scaleLog()
    .domain([Math.max(0.3, minCI * 0.7), Math.min(10, maxCI * 1.3)])
    .range([0, innerW]);

  // Y scale
  const y = d3
    .scaleBand()
    .domain(data.map((d) => d.complication))
    .range([0, innerH])
    .padding(0.3);

  // X axis
  g.append("g")
    .attr("transform", `translate(0,${innerH})`)
    .call(
      d3
        .axisBottom(x)
        .tickValues([0.5, 1, 2, 3, 5])
        .tickFormat(d3.format(".1f"))
    )
    .selectAll("text")
    .attr("class", "axis-text");

  // X axis label
  g.append("text")
    .attr("x", innerW / 2)
    .attr("y", innerH + 40)
    .attr("text-anchor", "middle")
    .attr("class", "axis-label")
    .text("Odds Ratio (log scale)");

  // Y axis — complication labels
  g.append("g")
    .call(d3.axisLeft(y).tickSize(0))
    .select(".domain")
    .remove();

  g.selectAll(".tick text").attr("class", "axis-text");

  // Reference line at OR = 1
  g.append("line")
    .attr("x1", x(1))
    .attr("x2", x(1))
    .attr("y1", 0)
    .attr("y2", innerH)
    .attr("class", "reference-line");

  // "Favors ECTR" / "Favors OCTR" labels
  g.append("text")
    .attr("x", x(1) - 8)
    .attr("y", -8)
    .attr("text-anchor", "end")
    .attr("class", "favor-label")
    .text("\u2190 Favors OCTR");

  g.append("text")
    .attr("x", x(1) + 8)
    .attr("y", -8)
    .attr("text-anchor", "start")
    .attr("class", "favor-label")
    .text("Favors ECTR \u2192");

  function forestTip(d) {
    let html = `<strong>${d.complication}</strong>OR: ${d.or.toFixed(2)} (95% CI: ${d.ciLow.toFixed(2)}–${d.ciHigh.toFixed(2)})`;
    html += d.significant
      ? `<br><span style="color:#ff9999">★ Statistically significant</span>`
      : `<br><span style="color:#aaa">Not significant</span>`;
    return html;
  }

  // CI lines
  g.selectAll(".ci-line")
    .data(data)
    .join("line")
    .attr("class", "ci-line")
    .attr("x1", (d) => x(Math.max(d.ciLow, x.domain()[0])))
    .attr("x2", (d) => x(Math.min(d.ciHigh, x.domain()[1])))
    .attr("y1", (d) => y(d.complication) + y.bandwidth() / 2)
    .attr("y2", (d) => y(d.complication) + y.bandwidth() / 2)
    .attr("stroke", (d) => (d.significant ? "var(--sig-color)" : "var(--nonsig-color)"))
    .attr("stroke-width", 2)
    .style("cursor", "pointer")
    .on("mouseover", (event, d) => showTooltip(event, forestTip(d)))
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  // OR point estimates
  g.selectAll(".or-point")
    .data(data)
    .join("rect")
    .attr("class", "or-point")
    .attr("x", (d) => x(d.or) - 5)
    .attr("y", (d) => y(d.complication) + y.bandwidth() / 2 - 5)
    .attr("width", 10)
    .attr("height", 10)
    .attr("fill", (d) => (d.significant ? "var(--sig-color)" : "var(--nonsig-color)"))
    .attr("transform", (d) => {
      const cx = x(d.or);
      const cy = y(d.complication) + y.bandwidth() / 2;
      return `rotate(45,${cx},${cy})`;
    })
    .style("cursor", "pointer")
    .on("mouseover", (event, d) => showTooltip(event, forestTip(d)))
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip);

  // OR value labels on right side
  g.selectAll(".or-label")
    .data(data)
    .join("text")
    .attr("class", "or-value-label")
    .attr("x", innerW + 8)
    .attr("y", (d) => y(d.complication) + y.bandwidth() / 2)
    .attr("dy", "0.35em")
    .attr("font-size", "11px")
    .attr("fill", (d) => (d.significant ? "var(--sig-color)" : "var(--nonsig-color)"))
    .text((d) => `${d.or.toFixed(1)}`);
}
