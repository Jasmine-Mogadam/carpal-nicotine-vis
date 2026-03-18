import * as d3 from "d3";

export function createMatchComparisonChart(container, unmatched, matched, { title, width = 700, height = 420 }) {
  const margin = { top: 50, right: 30, bottom: 100, left: 160 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const svg = d3
    .select(container)
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("class", "match-comparison-chart");

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", 24)
    .attr("text-anchor", "middle")
    .attr("class", "chart-title")
    .text(title);

  // Merge data by complication name
  const complications = unmatched.map((d) => d.complication);
  const chartData = complications.map((c) => {
    const u = unmatched.find((d) => d.complication === c);
    const m = matched.find((d) => d.complication === c);
    return {
      complication: c,
      unmatchedOR: u.or,
      unmatchedCILow: u.ciLow,
      unmatchedCIHigh: u.ciHigh,
      matchedOR: m.or,
      matchedCILow: m.ciLow,
      matchedCIHigh: m.ciHigh,
      significant: m.significant,
    };
  });

  const y = d3
    .scaleBand()
    .domain(chartData.map((d) => d.complication))
    .range([0, innerH])
    .padding(0.2);

  const allCIs = chartData.flatMap((d) => [d.unmatchedCILow, d.unmatchedCIHigh, d.matchedCILow, d.matchedCIHigh]);
  const x = d3
    .scaleLog()
    .domain([Math.max(0.3, d3.min(allCIs) * 0.7), Math.min(10, d3.max(allCIs) * 1.3)])
    .range([0, innerW]);

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

  g.append("text")
    .attr("x", innerW / 2)
    .attr("y", innerH + 40)
    .attr("text-anchor", "middle")
    .attr("class", "axis-label")
    .text("Odds Ratio (log scale)");

  // Y axis
  g.append("g")
    .call(d3.axisLeft(y).tickSize(0))
    .select(".domain")
    .remove();
  g.selectAll(".tick text").attr("class", "axis-text");

  // Reference line
  g.append("line")
    .attr("x1", x(1))
    .attr("x2", x(1))
    .attr("y1", 0)
    .attr("y2", innerH)
    .attr("class", "reference-line");

  const offset = y.bandwidth() * 0.2;

  // Unmatched CI lines + points
  g.selectAll(".ci-unmatched")
    .data(chartData)
    .join("line")
    .attr("x1", (d) => x(Math.max(d.unmatchedCILow, x.domain()[0])))
    .attr("x2", (d) => x(Math.min(d.unmatchedCIHigh, x.domain()[1])))
    .attr("y1", (d) => y(d.complication) + y.bandwidth() / 2 - offset)
    .attr("y2", (d) => y(d.complication) + y.bandwidth() / 2 - offset)
    .attr("stroke", "var(--unmatched-color)")
    .attr("stroke-width", 2);

  g.selectAll(".point-unmatched")
    .data(chartData)
    .join("circle")
    .attr("cx", (d) => x(d.unmatchedOR))
    .attr("cy", (d) => y(d.complication) + y.bandwidth() / 2 - offset)
    .attr("r", 5)
    .attr("fill", "var(--unmatched-color)");

  // Matched CI lines + points
  g.selectAll(".ci-matched")
    .data(chartData)
    .join("line")
    .attr("x1", (d) => x(Math.max(d.matchedCILow, x.domain()[0])))
    .attr("x2", (d) => x(Math.min(d.matchedCIHigh, x.domain()[1])))
    .attr("y1", (d) => y(d.complication) + y.bandwidth() / 2 + offset)
    .attr("y2", (d) => y(d.complication) + y.bandwidth() / 2 + offset)
    .attr("stroke", "var(--matched-color)")
    .attr("stroke-width", 2);

  g.selectAll(".point-matched")
    .data(chartData)
    .join("circle")
    .attr("cx", (d) => x(d.matchedOR))
    .attr("cy", (d) => y(d.complication) + y.bandwidth() / 2 + offset)
    .attr("r", 5)
    .attr("fill", "var(--matched-color)");

  // Legend
  const legend = svg.append("g").attr("transform", `translate(${width - 240}, 38)`);

  legend.append("circle").attr("cx", 6).attr("cy", 6).attr("r", 5).attr("fill", "var(--unmatched-color)");
  legend.append("text").attr("x", 16).attr("y", 10).attr("class", "legend-text").text("Unmatched");

  legend.append("circle").attr("cx", 106).attr("cy", 6).attr("r", 5).attr("fill", "var(--matched-color)");
  legend.append("text").attr("x", 116).attr("y", 10).attr("class", "legend-text").text("Propensity-Matched");
}
