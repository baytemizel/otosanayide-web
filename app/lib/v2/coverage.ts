import {z} from 'zod';
import {categories, cities as bundledCities} from '@otosanayide/core';
import {areaReference, referenceDistricts, type AreaPoint} from '@otosanayide/core/coverage';

/**
 * Service coverage for the live screens: provinces in service, their districts with approximate
 * administrative centres, and the counts of the home counter strip. Live mode reads the public
 * `GET /api/coverage` (v2-05); until it answers, or when it fails, the list bundled in packages/core is used.
 * The centres are administrative reference points, never proof of a workshop's location.
 */
export interface Coverage {
  source: 'api' | 'bundled';
  cityCount: number;
  categoryCount: number;
  /** Provinces in service, in the order the source gives. */
  cities: string[];
  /** District names and centres by province (names exactly as the source spells the province). */
  districts: Record<string, {name: string; center: AreaPoint | null}[]>;
}

function bundled(): Coverage {
  const districts: Coverage['districts'] = {};
  for (const city of bundledCities) districts[city] = referenceDistricts(city).map((name) => ({name, center: areaReference(city, name)}));
  return {source: 'bundled', cityCount: bundledCities.length, categoryCount: categories.length, cities: [...bundledCities], districts};
}

export const bundledCoverage: Coverage = bundled();

// Turkey's bounding box, as packages/core checks its own reference points.
const lat = z.number().finite().min(35).max(43);
const lng = z.number().finite().min(25).max(45);
const coverageSchema = z.object({
  cityCount: z.number().int().nonnegative().max(81),
  categoryCount: z.number().int().nonnegative().max(500),
  cities: z.array(z.object({
    city: z.string().min(1).max(80),
    districts: z.array(z.object({
      name: z.string().min(1).max(80),
      center: z.object({lat: z.number(), lng: z.number()}).passthrough().nullable().optional(),
    }).passthrough()).max(200),
  }).passthrough()).max(81),
}).passthrough();

/** `GET /api/coverage` → Coverage. Throws on a body that is not the documented shape. */
export function decodeCoverage(raw: unknown): Coverage {
  const parsed = coverageSchema.parse(raw);
  const districts: Coverage['districts'] = {};
  for (const entry of parsed.cities) {
    districts[entry.city] = entry.districts.map((d) => {
      const ok = d.center && lat.safeParse(d.center.lat).success && lng.safeParse(d.center.lng).success;
      return {name: d.name, center: ok ? {latitude: d.center!.lat, longitude: d.center!.lng} : null};
    });
  }
  return {source: 'api', cityCount: parsed.cityCount, categoryCount: parsed.categoryCount, cities: parsed.cities.map((c) => c.city), districts};
}

const fold = (s: string) => s.toLocaleLowerCase('tr').replaceAll('ı', 'i').normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/** The province as this coverage spells it ("hakkari" → "Hakkâri"), or undefined when it is not in service. */
export function coverageCity(coverage: Coverage, il: string) {
  const key = fold(il);
  return coverage.cities.find((city) => fold(city) === key);
}

/** District names of a covered province (empty for a province outside coverage). */
export function coverageDistricts(coverage: Coverage, il: string) {
  const city = coverageCity(coverage, il);
  return city ? (coverage.districts[city] ?? []).map((d) => d.name) : [];
}

/**
 * Approximate centre for a "çevresi" search: the district centre of this coverage, else the bundled
 * reference for the district, else the bundled province centre (the API returns district centres only).
 */
export function coverageCenter(coverage: Coverage, il: string, ilce = ''): AreaPoint | null {
  const city = coverageCity(coverage, il) ?? il;
  if (ilce) {
    const hit = (coverage.districts[city] ?? []).find((d) => fold(d.name) === fold(ilce));
    if (hit?.center) return hit.center;
    const reference = areaReference(city, ilce);
    if (reference) return reference;
  }
  return areaReference(city);
}
