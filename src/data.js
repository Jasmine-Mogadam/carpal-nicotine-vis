// Data extracted from Coombs et al. 2026, Tables 1-3
// "Improved Outcomes With Endoscopic Carpal Tunnel Release for Patients With Nicotine Dependence"

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

export const demographics = {
  unmatched: {
    octr: { n: 22435, meanAge: 51, sdAge: 12 },
    ectr: { n: 4947, meanAge: 51, sdAge: 12 },
  },
  matched: {
    octr: { n: 4947, meanAge: 51, sdAge: 12 },
    ectr: { n: 4947, meanAge: 52, sdAge: 12 },
  },
  sex: {
    unmatched: {
      octr: { male: 8395, female: 12947, unknown: 1093 },
      ectr: { male: 1814, female: 2950, unknown: 183 },
    },
    matched: {
      octr: { male: 1804, female: 2941, unknown: 202 },
      ectr: { male: 1814, female: 2950, unknown: 183 },
    },
  },
  comorbidities: {
    unmatched: {
      octr: { diabetes: 5122, obesity: 7286, heartDisease: 3559, hypertension: 10998, renalDisease: 2141 },
      ectr: { diabetes: 1127, obesity: 1636, heartDisease: 725, hypertension: 2383, renalDisease: 420 },
    },
    matched: {
      octr: { diabetes: 995, obesity: 1484, heartDisease: 656, hypertension: 2251, renalDisease: 349 },
      ectr: { diabetes: 1127, obesity: 1636, heartDisease: 725, hypertension: 2383, renalDisease: 420 },
    },
  },
};
