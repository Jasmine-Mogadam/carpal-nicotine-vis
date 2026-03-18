import { unmatchedComplications, matchedComplications, demographics } from "./data.js";

function pct(n, total) {
  return ((n / total) * 100).toFixed(1);
}

function ciStr(or, lo, hi) {
  return `${or.toFixed(1)} (${lo.toFixed(1)}–${hi.toFixed(1)})`;
}

function ectrCell(row) {
  const sup = row.ectr === 10 ? "<sup>a</sup>" : "";
  return `${row.ectr.toLocaleString()}${sup} (${pct(row.ectr, row.ectrN)}%)`;
}

const TABLE_NOTE = `Note. Values in bold are statistically significant. CTR = carpal tunnel release;
CI = confidence interval; ED = emergency department; SSI = surgical site infection;
UTI = urinary tract infection; DVT = deep vein thrombosis; PE = pulmonary embolism;
AKI = acute kidney injury.<br>
<sup>a</sup>Outcomes with an incidence of &lt;10 are rounded up to preserve anonymity.`;

function renderTable1(container) {
  const d = demographics;

  const rows = [
    { label: "N", fn: (c) => c.n.toLocaleString() },
    { label: "Age, mean ± SD, y", fn: (c) => `${c.meanAge} ± ${c.sdAge}` },
    { label: "Sex", header: true },
    { label: "  Male", fn: (c) => `${c.male.toLocaleString()} (${pct(c.male, c.n)}%)` },
    { label: "  Female", fn: (c) => `${c.female.toLocaleString()} (${pct(c.female, c.n)}%)` },
    { label: "  Unknown", fn: (c) => `${c.unknownSex.toLocaleString()} (${pct(c.unknownSex, c.n)}%)` },
    { label: "Race/Ethnicity", header: true },
    { label: "  White", fn: (c) => `${c.white.toLocaleString()} (${pct(c.white, c.n)}%)` },
    { label: "  Black or African American", fn: (c) => `${c.blackAA.toLocaleString()} (${pct(c.blackAA, c.n)}%)` },
    { label: "  Unknown", fn: (c) => `${c.unknownRace.toLocaleString()} (${pct(c.unknownRace, c.n)}%)` },
    { label: "  Hispanic or Latino", fn: (c) => `${c.hispanicLatino.toLocaleString()} (${pct(c.hispanicLatino, c.n)}%)` },
    { label: "  Other Race", fn: (c) => `${c.otherRace.toLocaleString()} (${pct(c.otherRace, c.n)}%)` },
    { label: "  Asian", fn: (c) => `${c.asian.toLocaleString()} (${pct(c.asian, c.n)}%)` },
    { label: "  Native Hawaiian or other", fn: (c) => `${c.nativeHawaiian.toLocaleString()} (${pct(c.nativeHawaiian, c.n)}%)` },
    { label: "  American Indian or Alaskan", fn: (c) => `${c.americanIndian.toLocaleString()} (${pct(c.americanIndian, c.n)}%)` },
    { label: "Comorbidities", header: true },
    { label: "  Diabetes", fn: (c) => `${c.diabetes.toLocaleString()} (${pct(c.diabetes, c.n)}%)` },
    { label: "  Obesity", fn: (c) => `${c.obesity.toLocaleString()} (${pct(c.obesity, c.n)}%)` },
    { label: "  Heart disease", fn: (c) => `${c.heartDisease.toLocaleString()} (${pct(c.heartDisease, c.n)}%)` },
    { label: "  Hypertension", fn: (c) => `${c.hypertension.toLocaleString()} (${pct(c.hypertension, c.n)}%)` },
    { label: "  Renal disease", fn: (c) => `${c.renalDisease.toLocaleString()} (${pct(c.renalDisease, c.n)}%)` },
  ];

  const cohorts = [
    { key: "unmatchedOCTR", label: `OCTR<br>(N = ${d.unmatchedOCTR.n.toLocaleString()})` },
    { key: "unmatchedECTR", label: `ECTR<br>(N = ${d.unmatchedECTR.n.toLocaleString()})` },
    { key: "matchedOCTR",   label: `OCTR<br>(N = ${d.matchedOCTR.n.toLocaleString()})` },
    { key: "matchedECTR",   label: `ECTR<br>(N = ${d.matchedECTR.n.toLocaleString()})` },
  ];

  let html = `
    <div class="raw-table-section" id="raw-table1">
      <h2 class="raw-table-title">Table 1. Patient Demographics and Comorbidities</h2>
      <div class="raw-table-note">Values are N (%) unless otherwise stated. OCTR = open carpal tunnel release; ECTR = endoscopic carpal tunnel release.</div>
      <div class="raw-table-scroll">
        <table class="raw-table">
          <thead>
            <tr>
              <th class="raw-th-label"></th>
              <th colspan="2" class="raw-th-group">Unmatched Cohort</th>
              <th colspan="2" class="raw-th-group raw-th-group-matched">Propensity Score–Matched Cohort</th>
            </tr>
            <tr>
              <th class="raw-th-label">Demographic Variable</th>
              ${cohorts.map((c) => `<th class="raw-th-col">${c.label}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
  `;

  for (const row of rows) {
    if (row.header) {
      html += `<tr><td colspan="5" class="raw-td-section">${row.label}</td></tr>`;
    } else {
      html += `<tr>
        <td class="raw-td-label">${row.label}</td>
        ${cohorts.map((c) => `<td class="raw-td-val">${row.fn(d[c.key])}</td>`).join("")}
      </tr>`;
    }
  }

  html += `</tbody></table></div></div>`;
  container.insertAdjacentHTML("beforeend", html);
}

function renderTable2(container) {
  let html = `
    <div class="raw-table-section" id="raw-table2">
      <h2 class="raw-table-title">Table 2. 90-Day Perioperative Complications — Unmatched Cohort</h2>
      <div class="raw-table-scroll">
        <table class="raw-table">
          <thead>
            <tr>
              <th class="raw-th-label">Complication</th>
              <th class="raw-th-col">OCTR<br>(N = 22,435), N (%)</th>
              <th class="raw-th-col">ECTR<br>(N = 4,947), N (%)</th>
              <th class="raw-th-col">OR (95% CI)</th>
            </tr>
          </thead>
          <tbody>
  `;

  for (const row of unmatchedComplications) {
    const cls = row.significant ? " class=\"raw-tr-sig\"" : "";
    html += `<tr${cls}>
      <td class="raw-td-label">${row.complication}</td>
      <td class="raw-td-val">${row.octr.toLocaleString()} (${pct(row.octr, row.octrN)}%)</td>
      <td class="raw-td-val">${ectrCell(row)}</td>
      <td class="raw-td-val">${ciStr(row.or, row.ciLow, row.ciHigh)}</td>
    </tr>`;
  }

  html += `</tbody></table></div>
    <div class="raw-table-footnote">${TABLE_NOTE}</div>
  </div>`;
  container.insertAdjacentHTML("beforeend", html);
}

function renderTable3(container) {
  let html = `
    <div class="raw-table-section" id="raw-table3">
      <h2 class="raw-table-title">Table 3. 90-Day Perioperative Complications — Propensity Score–Matched Cohort</h2>
      <div class="raw-table-scroll">
        <table class="raw-table">
          <thead>
            <tr>
              <th class="raw-th-label">Complication</th>
              <th class="raw-th-col">OCTR<br>(N = 4,581), N (%)</th>
              <th class="raw-th-col">ECTR<br>(N = 4,581), N (%)</th>
              <th class="raw-th-col">OR (95% CI)</th>
              <th class="raw-th-col">ARD (%)</th>
            </tr>
          </thead>
          <tbody>
  `;

  for (const row of matchedComplications) {
    const cls = row.significant ? " class=\"raw-tr-sig\"" : "";
    html += `<tr${cls}>
      <td class="raw-td-label">${row.complication}</td>
      <td class="raw-td-val">${row.octr.toLocaleString()} (${pct(row.octr, row.octrN)}%)</td>
      <td class="raw-td-val">${ectrCell(row)}</td>
      <td class="raw-td-val">${ciStr(row.or, row.ciLow, row.ciHigh)}</td>
      <td class="raw-td-val">${row.ard > 0 ? "+" : ""}${row.ard.toFixed(1)}</td>
    </tr>`;
  }

  html += `</tbody></table></div>
    <div class="raw-table-footnote">${TABLE_NOTE}</div>
  </div>`;
  container.insertAdjacentHTML("beforeend", html);
}

export function initRawData() {
  const container = document.getElementById("tab-raw");
  renderTable1(container);
  renderTable2(container);
  renderTable3(container);
}
