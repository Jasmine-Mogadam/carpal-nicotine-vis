// Data extracted from Coombs et al. 2026, Tables 1-3
// "Improved Outcomes With Endoscopic Carpal Tunnel Release for Patients With Nicotine Dependence"
//
// Metacarpal comorbidity data extracted from:
//   3.18.26 metacarpal repair outcomes raw data.xlsx
//   Run `npm run extract` to regenerate.

export const unmatchedComplications = [
  { complication: "Median nerve injury", octr: 123, ectr: 10, octrN: 22435, ectrN: 4947, or: 2.7, ciLow: 1.4, ciHigh: 5.2, significant: true },
  { complication: "Admissions", octr: 181, ectr: 12, octrN: 22435, ectrN: 4947, or: 3.3, ciLow: 1.9, ciHigh: 6.0, significant: true },
  { complication: "Postop ED visits", octr: 3047, ectr: 541, octrN: 22435, ectrN: 4947, or: 1.3, ciLow: 1.2, ciHigh: 1.4, significant: true },
  { complication: "Superficial SSI", octr: 898, ectr: 90, octrN: 22435, ectrN: 4947, or: 2.3, ciLow: 1.8, ciHigh: 2.8, significant: true },
  { complication: "Deep SSI", octr: 62, ectr: 10, octrN: 22435, ectrN: 4947, or: 1.4, ciLow: 0.7, ciHigh: 2.7, significant: false },
  { complication: "Sepsis", octr: 129, ectr: 14, octrN: 22435, ectrN: 4947, or: 2.0, ciLow: 1.2, ciHigh: 3.5, significant: true },
  { complication: "UTI", octr: 430, ectr: 85, octrN: 22435, ectrN: 4947, or: 1.1, ciLow: 0.9, ciHigh: 1.4, significant: false },
  { complication: "DVT", octr: 89, ectr: 12, octrN: 22435, ectrN: 4947, or: 1.6, ciLow: 0.9, ciHigh: 3.0, significant: false },
  { complication: "PE", octr: 91, ectr: 12, octrN: 22435, ectrN: 4947, or: 1.7, ciLow: 0.9, ciHigh: 3.1, significant: false },
  { complication: "AKI", octr: 410, ectr: 67, octrN: 22435, ectrN: 4947, or: 1.4, ciLow: 1.1, ciHigh: 1.8, significant: true },
];

export const matchedComplications = [
  { complication: "Median nerve injury", octr: 22, ectr: 10, octrN: 4581, ectrN: 4581, or: 2.2, ciLow: 1.0, ciHigh: 4.6, ard: 0.2, significant: true },
  { complication: "Admissions", octr: 37, ectr: 12, octrN: 4581, ectrN: 4581, or: 3.1, ciLow: 1.6, ciHigh: 5.9, ard: 0.5, significant: true },
  { complication: "Postop ED visits", octr: 651, ectr: 541, octrN: 4581, ectrN: 4581, or: 1.2, ciLow: 1.1, ciHigh: 1.4, ard: 2.3, significant: true },
  { complication: "Superficial SSI", octr: 190, ectr: 90, octrN: 4581, ectrN: 4581, or: 2.2, ciLow: 1.7, ciHigh: 2.8, ard: 2.0, significant: true },
  { complication: "Deep SSI", octr: 19, ectr: 10, octrN: 4581, ectrN: 4581, or: 1.9, ciLow: 0.9, ciHigh: 4.1, ard: 0.2, significant: false },
  { complication: "Sepsis", octr: 17, ectr: 14, octrN: 4581, ectrN: 4581, or: 1.2, ciLow: 0.6, ciHigh: 2.5, ard: 0.0, significant: false },
  { complication: "UTI", octr: 88, ectr: 85, octrN: 4581, ectrN: 4581, or: 1.0, ciLow: 0.8, ciHigh: 1.4, ard: 0.1, significant: false },
  { complication: "DVT", octr: 21, ectr: 12, octrN: 4581, ectrN: 4581, or: 1.8, ciLow: 0.9, ciHigh: 3.6, ard: 0.1, significant: false },
  { complication: "PE", octr: 21, ectr: 12, octrN: 4581, ectrN: 4581, or: 1.8, ciLow: 0.9, ciHigh: 3.6, ard: 0.2, significant: false },
  { complication: "AKI", octr: 66, ectr: 67, octrN: 4581, ectrN: 4581, or: 1.0, ciLow: 0.7, ciHigh: 1.4, ard: -0.1, significant: false },
];

// Table 1: one object per cohort, all demographic variables flat
export const demographics = {
  unmatchedOCTR: {
    n: 22435, meanAge: 51, sdAge: 12,
    // Sex
    male: 8395, female: 12947, unknownSex: 1093,
    // Race
    white: 16674, blackAA: 2982, unknownRace: 1836, hispanicLatino: 1267, otherRace: 508, asian: 162, nativeHawaiian: 118, americanIndian: 155,
    // Comorbidities
    diabetes: 5122, obesity: 7286, heartDisease: 3559, hypertension: 10998, renalDisease: 2141,
  },
  unmatchedECTR: {
    n: 4947, meanAge: 51, sdAge: 12,
    male: 1814, female: 2950, unknownSex: 183,
    white: 3741, blackAA: 665, unknownRace: 315, hispanicLatino: 263, otherRace: 80, asian: 71, nativeHawaiian: 41, americanIndian: 34,
    diabetes: 1127, obesity: 1636, heartDisease: 725, hypertension: 2383, renalDisease: 420,
  },
  matchedOCTR: {
    n: 4947, meanAge: 51, sdAge: 12,
    male: 1804, female: 2941, unknownSex: 202,
    white: 3804, blackAA: 601, unknownRace: 305, hispanicLatino: 226, otherRace: 84, asian: 84, nativeHawaiian: 37, americanIndian: 32,
    diabetes: 995, obesity: 1484, heartDisease: 656, hypertension: 2251, renalDisease: 349,
  },
  matchedECTR: {
    n: 4947, meanAge: 52, sdAge: 12,
    male: 1814, female: 2950, unknownSex: 183,
    white: 3741, blackAA: 665, unknownRace: 315, hispanicLatino: 263, otherRace: 80, asian: 71, nativeHawaiian: 41, americanIndian: 34,
    diabetes: 1127, obesity: 1636, heartDisease: 725, hypertension: 2383, renalDisease: 420,
  },
};

// ── Metacarpal Repair Surgery Outcomes by Comorbidity ──────────────────────
// Source: 3.18.26 metacarpal repair outcomes raw data.xlsx (regenerate with `npm run extract`)
// Each row = a comorbidity group; values are raw counts over 90-day post-op window.
// Outcome key names match Excel headers (snake_case). "superfiical" typo is in source data.
export const metacarpalComorbidities = [
  { group: "Rheumatoid Arthritis",          n: 1064,  edVisit: 182,  superficialSSI: 0,   deepSSI: 0,  readmission: 112, additionalSurgery: 72,   analgesics: 485,  nerveInjury: 39,  painSite: 37  },
  { group: "Depression / Anxiety",          n: 14659, edVisit: 2764, superficialSSI: 39,  deepSSI: 26, readmission: 1509, additionalSurgery: 1297, analgesics: 6418, nerveInjury: 608, painSite: 571 },
  { group: "Ischemic Heart Disease",        n: 3787,  edVisit: 824,  superficialSSI: 11,  deepSSI: 0,  readmission: 675, additionalSurgery: 229,  analgesics: 1896, nerveInjury: 239, painSite: 115 },
  { group: "Kidney Disease",               n: 3584,  edVisit: 849,  superficialSSI: 15,  deepSSI: 17, readmission: 923, additionalSurgery: 238,  analgesics: 2033, nerveInjury: 206, painSite: 135 },
  { group: "Hypertension",                 n: 16370, edVisit: 2570, superficialSSI: 51,  deepSSI: 31, readmission: 2161, additionalSurgery: 1172, analgesics: 7481, nerveInjury: 1100, painSite: 573 },
  { group: "Smoking / Nicotine Dependence",n: 15158, edVisit: 2820, superficialSSI: 42,  deepSSI: 21, readmission: 1498, additionalSurgery: 1527, analgesics: 6999, nerveInjury: 1170, painSite: 590 },
  { group: "Obesity",                      n: 24888, edVisit: 2928, superficialSSI: 63,  deepSSI: 26, readmission: 1748, additionalSurgery: 1949, analgesics: 9367, nerveInjury: 1336, painSite: 795 },
  { group: "Diabetes",                     n: 6878,  edVisit: 1190, superficialSSI: 23,  deepSSI: 14, readmission: 856, additionalSurgery: 436,  analgesics: 3103, nerveInjury: 407,  painSite: 209 },
  { group: "Age 65+",                      n: 20423, edVisit: 2219, superficialSSI: 30,  deepSSI: 23, readmission: 1853, additionalSurgery: 1055, analgesics: 7128, nerveInjury: 1197, painSite: 395 },
];
