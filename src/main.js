import { unmatchedComplications, matchedComplications, demographics } from "./data.js";
import { createForestPlot } from "./forestPlot.js";
import { createGroupedBarChart } from "./barChart.js";
import { createRiskDifferenceChart } from "./riskDifference.js";
import { createDemographicsChart } from "./demographicsChart.js";
import { createMatchComparisonChart } from "./matchComparison.js";
import "./style.css";

// 1. Forest plot — matched odds ratios
createForestPlot(document.getElementById("forest-matched"), matchedComplications, {
  title: "Forest Plot: Matched Odds Ratios (OCTR vs ECTR, 90-Day Outcomes)",
});

// 2. Grouped bar — complication rates (matched)
createGroupedBarChart(document.getElementById("bar-matched"), matchedComplications, {
  title: "90-Day Complication Rates After Propensity Score Matching",
});

// 3. Unmatched vs matched OR comparison
createMatchComparisonChart(
  document.getElementById("match-comparison"),
  unmatchedComplications,
  matchedComplications,
  { title: "Effect of Propensity Score Matching on Odds Ratios" }
);

// 4. Absolute risk difference + NNT
createRiskDifferenceChart(document.getElementById("risk-diff"), matchedComplications, {
  title: "Absolute Risk Difference & Number Needed to Treat (Matched)",
});

// 5. Comorbidity profile (matched cohorts)
createDemographicsChart(document.getElementById("demographics"), demographics, {
  title: "Comorbidity Prevalence in Matched Cohorts",
});

// 6. Unmatched complication rates
createGroupedBarChart(document.getElementById("bar-unmatched"), unmatchedComplications, {
  title: "90-Day Complication Rates Before Matching (Unmatched)",
});
