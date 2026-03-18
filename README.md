# Carpal Tunnel Release Outcomes in Nicotine-Dependent Patients

Interactive D3.js dashboard visualizing 90-day perioperative outcomes comparing endoscopic vs open carpal tunnel release in patients with nicotine dependence.

## Data Source

All data was extracted from the published tables in:

> Coombs J, Dussik CM, Phan A, Ferraro J, Wilbur D, Ketonis C. **Improved Outcomes With Endoscopic Carpal Tunnel Release for Patients With Nicotine Dependence.** *HAND.* 2026. DOI: [10.1177/15589447251415393](https://doi.org/10.1177/15589447251415393)

The underlying patient data comes from the **TriNetX** research network — a multinational, multi-institution database collecting de-identified records from 101 health care organizations and over 100 million patients. The database was queried on May 23, 2025 for patients who underwent carpal tunnel release between January 1, 2010 and December 31, 2023 with documented nicotine dependence (ICD-10 F17).

The original PDF of the paper is included in the repository root:
- `coombs-et-al-2026-improved-outcomes-with-endoscopic-carpal-tunnel-release-for-patients-with-nicotine-dependence[92].pdf`

## Data Files

All extracted and cleaned data lives in a single JavaScript module:

- **[`src/data.js`](src/data.js)** — Contains three exported objects:
  - `unmatchedComplications` — Table 2 from the paper: 90-day complication counts, rates, and odds ratios for the full unmatched cohorts (OCTR N=22,435 vs ECTR N=4,947)
  - `matchedComplications` — Table 3 from the paper: same outcomes after propensity score matching (N=4,581 per group), including absolute risk differences
  - `demographics` — Table 1 from the paper: age, sex, race, and comorbidity distributions for both unmatched and matched cohorts

Note: per the paper's de-identification protocol, outcome counts below 10 were rounded up to 10 by the authors.

## Visualizations

The dashboard renders six D3.js charts:

| Chart | File | Description |
|-------|------|-------------|
| Forest Plot | [`src/forestPlot.js`](src/forestPlot.js) | Matched odds ratios with 95% confidence intervals on a log scale. Diamond markers; red = significant (P < .05), gray = not significant. |
| Matched Complication Rates | [`src/barChart.js`](src/barChart.js) | Grouped bar chart comparing OCTR vs ECTR complication percentages after matching. Asterisks mark significant differences. |
| Unmatched vs Matched Comparison | [`src/matchComparison.js`](src/matchComparison.js) | Paired forest plot showing how propensity score matching shifted the odds ratios for each outcome. |
| Absolute Risk Difference + NNT | [`src/riskDifference.js`](src/riskDifference.js) | Horizontal bars showing absolute risk differences with Number Needed to Treat (NNT) annotations — an additional analysis not in the original paper. |
| Comorbidity Prevalence | [`src/demographicsChart.js`](src/demographicsChart.js) | Matched cohort comorbidity profiles (diabetes, obesity, heart disease, hypertension, renal disease). |
| Unmatched Complication Rates | [`src/barChart.js`](src/barChart.js) | Raw complication rates before matching (full cohorts). |

## Statistical Methods Reproduced

The following analyses from the paper were verified reproducible from the published table data:

- **Odds ratios** — computed from 2x2 contingency tables (event counts / group sizes)
- **95% confidence intervals** — Woolf log method
- **Absolute risk differences** — simple rate subtraction between groups
- **P-values** — derivable via chi-square test on the 2x2 tables

## Additional Analysis Included

- **Number Needed to Treat (NNT)** — calculated as `100 / absolute risk difference (%)`, shown alongside the risk difference chart. This was not in the original paper and provides a clinically intuitive measure of effect size.

## Navigation

### Dashboard Tab
A sticky left-side table of contents lists all six charts. Clicking a link smooth-scrolls to that section. The active entry updates automatically as you scroll (IntersectionObserver scroll-spy).

### Custom Analysis Tab
A plug-and-play builder lets you choose:

| Control | Options |
|---------|---------|
| **Chart Type** | Grouped Bar, Scatter Plot, Lollipop, Heatmap |
| **Data Source** | Matched (Table 3), Unmatched (Table 2), Comorbidities (Table 1) |
| **Axes / Metrics** | Dropdowns populated dynamically based on chart type and selected data source |

Available numeric fields vary by source (rates, OR, CI bounds, ARD, NNT, counts). A stats summary table (min/max/mean) appears below the controls after rendering. Source: [`src/customAnalysis.js`](src/customAnalysis.js).

## Running Locally

```bash
npm install
npm run dev
```

## Deploying to Netlify

- **Build command:** `npm run build`
- **Publish directory:** `dist`

Works on the Netlify free tier with no server functions required.

## Project Structure

```
├── index.html              # Main page with chart containers and summary stats
├── src/
│   ├── data.js             # All extracted table data from the paper
│   ├── main.js             # Entry point — chart rendering, tabs, scroll-spy
│   ├── forestPlot.js       # Forest plot (OR + CI)
│   ├── barChart.js         # Grouped bar chart (complication rates)
│   ├── matchComparison.js  # Unmatched vs matched OR comparison
│   ├── riskDifference.js   # Absolute risk difference + NNT
│   ├── demographicsChart.js# Comorbidity prevalence bars
│   ├── customAnalysis.js   # Custom analysis tab (plug-and-play charts)
│   └── style.css           # Dashboard styling and CSS variables
├── vite.config.js          # Vite build config
└── package.json
```

## Tech Stack

- **D3.js v7** — all chart rendering
- **Vite** — dev server and production bundler
- No frameworks, no backend
