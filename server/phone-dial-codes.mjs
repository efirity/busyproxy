/**
 * ISO 3166-1 alpha-2 → E.164 country calling code (no +).
 * Covers common markets; unknown → null (client leaves field empty).
 */
export const DIAL_BY_COUNTRY = {
  US: "1",
  CA: "1",
  GB: "44",
  IE: "353",
  DE: "49",
  FR: "33",
  ES: "34",
  IT: "39",
  PT: "351",
  NL: "31",
  BE: "32",
  LU: "352",
  CH: "41",
  AT: "43",
  PL: "48",
  CZ: "420",
  SK: "421",
  HU: "36",
  RO: "40",
  BG: "359",
  GR: "30",
  SE: "46",
  NO: "47",
  DK: "45",
  FI: "358",
  EE: "372",
  LV: "371",
  LT: "370",
  MD: "373",
  UA: "380",
  BY: "375",
  RU: "7",
  TR: "90",
  IL: "972",
  AE: "971",
  SA: "966",
  IN: "91",
  PK: "92",
  BD: "880",
  CN: "86",
  HK: "852",
  TW: "886",
  JP: "81",
  KR: "82",
  SG: "65",
  MY: "60",
  TH: "66",
  VN: "84",
  ID: "62",
  PH: "63",
  AU: "61",
  NZ: "64",
  ZA: "27",
  EG: "20",
  NG: "234",
  KE: "254",
  BR: "55",
  AR: "54",
  CL: "56",
  CO: "57",
  MX: "52",
  PE: "51",
};

/**
 * @param {string | null | undefined} countryCode ISO alpha-2
 * @returns {{ dialCode: string, prefix: string } | null}
 */
export function dialFromCountry(countryCode) {
  if (!countryCode) return null;
  const cc = String(countryCode).toUpperCase().trim();
  const digits = DIAL_BY_COUNTRY[cc];
  if (!digits) return null;
  return { countryCode: cc, dialCode: digits, prefix: `+${digits}` };
}
