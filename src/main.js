import { unmatchedComplications, matchedComplications, demographics, metacarpalComorbidities } from "./data.js";
import { createForestPlot } from "./forestPlot.js";
import { createGroupedBarChart } from "./barChart.js";
import { createRiskDifferenceChart } from "./riskDifference.js";
import { createDemographicsChart } from "./demographicsChart.js";
import { createMatchComparisonChart } from "./matchComparison.js";
import { createSexDistributionChart, createRaceDistributionChart, createPatientProfileChart } from "./demographicsExpanded.js";
import { createMetacarpalHeatmap, createMetacarpalOutcomesChart } from "./metacarpalChart.js";
import { createMetacarpalForestVsNicotine, createMetacarpalPValueHeatmap, createMetacarpalARDChart, createOutcomeCorrelationMatrix, createPowerBubbleChart } from "./metacarpalAnalysis.js";
import { initCustomAnalysis } from "./customAnalysis.js";
import { initRawData } from "./rawData.js";
import { addExportButton } from "./exportPng.js";
import "./style.css";

// ── Dashboard charts ─────────────────────────────────────────────────────────

const forestMatchedEl = document.getElementById("forest-matched");
createForestPlot(forestMatchedEl, matchedComplications, {
  title: "Forest Plot: Matched Odds Ratios (OCTR vs ECTR, 90-Day Outcomes)",
});
addExportButton(forestMatchedEl, "forest-plot-matched.png");

const barMatchedEl = document.getElementById("bar-matched");
createGroupedBarChart(barMatchedEl, matchedComplications, {
  title: "90-Day Complication Rates After Propensity Score Matching",
});
addExportButton(barMatchedEl, "complication-rates-matched.png");

const matchComparisonEl = document.getElementById("match-comparison");
createMatchComparisonChart(
  matchComparisonEl,
  unmatchedComplications,
  matchedComplications,
  { title: "Effect of Propensity Score Matching on Odds Ratios" }
);
addExportButton(matchComparisonEl, "match-comparison.png");

const riskDiffEl = document.getElementById("risk-diff");
createRiskDifferenceChart(riskDiffEl, matchedComplications, {
  title: "Absolute Risk Difference & Number Needed to Treat (Matched)",
});
addExportButton(riskDiffEl, "risk-difference-nnt.png");

const demographicsEl = document.getElementById("demographics");
createDemographicsChart(demographicsEl, demographics, {
  title: "Comorbidity Prevalence in Matched Cohorts",
});
addExportButton(demographicsEl, "comorbidity-prevalence.png");

const sexDistEl = document.getElementById("sex-dist");
createSexDistributionChart(sexDistEl, demographics, {
  title: "Sex Distribution Across Cohorts (Unmatched & Propensity-Matched)",
});
addExportButton(sexDistEl, "sex-distribution.png");

const raceDistEl = document.getElementById("race-dist");
createRaceDistributionChart(raceDistEl, demographics, {
  title: "Race/Ethnicity Distribution in Matched Cohorts",
});
addExportButton(raceDistEl, "race-distribution.png");

const patientProfileEl = document.getElementById("patient-profile");
createPatientProfileChart(patientProfileEl, demographics, {
  title: "Patient Profile: Female Sex & Comorbidity Rates Across All Cohorts",
});
addExportButton(patientProfileEl, "patient-profile.png");

const barUnmatchedEl = document.getElementById("bar-unmatched");
createGroupedBarChart(barUnmatchedEl, unmatchedComplications, {
  title: "90-Day Complication Rates Before Matching (Unmatched)",
});
addExportButton(barUnmatchedEl, "complication-rates-unmatched.png");

const metacarpalHeatmapEl = document.getElementById("metacarpal-heatmap");
createMetacarpalHeatmap(metacarpalHeatmapEl, metacarpalComorbidities, {
  title: "Metacarpal Repair: Post-Op Outcome Rates by Comorbidity Group (%)",
});
addExportButton(metacarpalHeatmapEl, "metacarpal-heatmap.png");

const metacarpalOutcomesEl = document.getElementById("metacarpal-outcomes");
createMetacarpalOutcomesChart(metacarpalOutcomesEl, metacarpalComorbidities, {
  title: "Metacarpal Repair: Key Clinical Outcome Rates by Comorbidity Group",
});
addExportButton(metacarpalOutcomesEl, "metacarpal-outcomes.png");

const metaForestNicotineEl = document.getElementById("meta-forest-nicotine");
createMetacarpalForestVsNicotine(metaForestNicotineEl, metacarpalComorbidities, {
  title: "Metacarpal Repair: Odds Ratios vs Smoking/Nicotine Reference",
});
addExportButton(metaForestNicotineEl, "meta-forest-vs-nicotine.png");

const metaPValueEl = document.getElementById("meta-pvalue-heatmap");
createMetacarpalPValueHeatmap(metaPValueEl, metacarpalComorbidities, {
  title: "Metacarpal Repair: Chi-Square Significance vs Nicotine Reference",
});
addExportButton(metaPValueEl, "meta-pvalue-heatmap.png");

const metaARDEl = document.getElementById("meta-ard-chart");
createMetacarpalARDChart(metaARDEl, metacarpalComorbidities, {
  title: "Metacarpal Repair: Absolute Risk Difference vs Nicotine Baseline",
});
addExportButton(metaARDEl, "meta-ard-chart.png");

const metaCorrEl = document.getElementById("meta-corr-matrix");
createOutcomeCorrelationMatrix(metaCorrEl, metacarpalComorbidities, {
  title: "Outcome Correlation Matrix (Metacarpal Repair)",
});
addExportButton(metaCorrEl, "meta-outcome-correlations.png");

const metaPowerEl = document.getElementById("meta-power-bubble");
createPowerBubbleChart(metaPowerEl, metacarpalComorbidities, {
  title: "Metacarpal Repair: Group Size vs Complication Burden",
});
addExportButton(metaPowerEl, "meta-power-bubble.png");

// ── Tab switching ─────────────────────────────────────────────────────────────

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(`tab-${target}`).classList.add("active");
  });
});

// ── TOC scroll-spy ────────────────────────────────────────────────────────────

const tocLinks = document.querySelectorAll(".toc-link");
const sections = [...document.querySelectorAll("#tab-dashboard section, #sec-summary, #sec-sex-dist, #sec-race-dist, #sec-patient-profile, #sec-metacarpal-heatmap, #sec-metacarpal-outcomes, #sec-meta-forest-nicotine, #sec-meta-pvalue, #sec-meta-ard, #sec-meta-corr, #sec-meta-power")];

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        tocLinks.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === `#${id}`);
        });
      }
    });
  },
  { rootMargin: "-20% 0px -70% 0px", threshold: 0 }
);

sections.forEach((s) => { if (s) observer.observe(s); });

// ── Custom analysis ───────────────────────────────────────────────────────────

initCustomAnalysis();

// ── Raw data tables ───────────────────────────────────────────────────────────

initRawData();
