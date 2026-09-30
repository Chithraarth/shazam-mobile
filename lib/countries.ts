import { allCountries } from "country-telephone-data";

export type Country = {
  iso2: string;
  name: string;
  dialCode: string;
};

function flagEmoji(iso2: string): string {
  return iso2
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

export const countries: Country[] = allCountries.map((c) => ({
  iso2: c.iso2.toUpperCase(),
  name: c.name.replace(/\s*\([^)]*\)\s*$/, "").trim(),
  dialCode: c.dialCode,
}));

export function countryFlag(iso2: string): string {
  return flagEmoji(iso2);
}

export function findCountry(iso2: string): Country | undefined {
  return countries.find((c) => c.iso2 === iso2.toUpperCase());
}

export const DEFAULT_COUNTRY_ISO2 = "US";
