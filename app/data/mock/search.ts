// Mock search data for the Web v2 search screens (/ara, /karsilastir). Synthetic only: every name starts with
// "Örnek". The real screens will call the search API; until then the page filters this list client-side.
import {mockBusinesses, type MockBusiness} from '~/data/mock/businesses';

export type PaymentMethod = 'kart' | 'taksit' | 'nakit';
export type SearchArea = 'ilce' | 'cevre' | 'konum';
export type SearchSort = 'onerilen' | 'yakin' | 'puan' | 'yorum';

/** Declared facts used by the filters and the comparison table. Missing means unknown, never "no". */
export interface SearchFacts {
  services: string[];
  payments: PaymentMethod[];
  weekendOpen: boolean;
  quote: boolean;
  appointment: boolean;
  hoursKnown: boolean;
}
export type SearchBusiness = MockBusiness & SearchFacts;

export const paymentLabels: Record<PaymentMethod, {option: string; chip: string; row: string}> = {
  kart: {option: 'Kart kabul ediyor', chip: 'Kart', row: 'Kart ile ödeme'},
  taksit: {option: 'Taksit', chip: 'Taksit', row: 'Taksit'},
  nakit: {option: 'Nakit', chip: 'Nakit', row: 'Nakit ödeme'},
};

/** Options shown first in the filter panel (Figma W02); the rest appear under "Tümünü göster". */
export const primaryServices = ['Boyasız göçük', 'Kaporta', 'Lokal boya', 'Tampon onarımı'];
export const primaryBrands = ['BMW', 'Mercedes-Benz', 'Audi'];
export const distanceSteps = [25, 50, 100, 200];

// Facts for the shared mock businesses (businesses.ts), keyed by id.
const sharedFacts: Record<string, SearchFacts> = {
  'ornek-teknik-garaj': {services: ['Periyodik bakım', 'Mekanik onarım'], payments: ['kart', 'taksit', 'nakit'], weekendOpen: true, quote: true, appointment: true, hoursKnown: true},
  'ornek-atasehir-ekspertiz': {services: ['Ekspertiz', 'Boya ölçümü'], payments: ['kart', 'nakit'], weekendOpen: true, quote: true, appointment: true, hoursKnown: true},
  'ornek-kaporta-boya': {services: ['Kaporta', 'Lokal boya', 'Boyasız göçük'], payments: ['kart', 'taksit', 'nakit'], weekendOpen: false, quote: true, appointment: false, hoursKnown: true},
  'ornek-oto-elektrik': {services: ['Oto elektrik', 'Akü'], payments: ['nakit'], weekendOpen: false, quote: false, appointment: true, hoursKnown: true},
  'ornek-lastik-rot': {services: ['Lastik', 'Rot balans'], payments: ['kart', 'nakit'], weekendOpen: true, quote: true, appointment: false, hoursKnown: true},
  'ornek-sanayi-motor': {services: ['Motor revizyon'], payments: [], weekendOpen: false, quote: false, appointment: false, hoursKnown: true},
  'ornek-klima-servis': {services: ['Klima gazı', 'Kompresör'], payments: ['kart'], weekendOpen: true, quote: true, appointment: true, hoursKnown: true},
  'ornek-togg-yetkili': {services: ['Elektrikli araç', 'Batarya kontrolü'], payments: ['kart', 'taksit'], weekendOpen: false, quote: true, appointment: true, hoursKnown: true},
};

const photos = ['/v2/workshop.jpg', '/v2/search/car-bmw.jpg', '/v2/search/car-lift.jpg', '/v2/search/car-white.jpg', null] as const;

// The cards drawn in Figma W02/W03/W06, then extra Kadıköy-area records so the default search
// ("Kadıköy’de BMW için boyasız göçük, kart geçsin") returns the 18 results the design shows.
const figmaRecords: SearchBusiness[] = [
  {id: 'ornek-kadikoy-pdr-noktasi', name: 'Örnek Kadıköy PDR Noktası', category: 'Boyasız göçük', tags: ['Boyasız göçük', 'Lokal boya'], brands: ['BMW', 'Audi'], district: 'Kadıköy', city: 'İstanbul', distanceKm: 1.4, rating: 4.8, reviewCount: 49, open: true, hoursText: 'Açık · 19.00’a kadar', verified: true, claimed: true, sponsored: true, photo: '/v2/workshop.jpg', phone: '+90 216 000 01 01', address: 'Örnek Sanayi Sitesi, F Blok No: 1, Kadıköy', map: {x: 47.2, y: 64.9},
    services: ['Boyasız göçük', 'Lokal boya'], payments: ['kart', 'taksit', 'nakit'], weekendOpen: true, quote: true, appointment: true, hoursKnown: true},
  {id: 'ornek-moda-gocuk-atolyesi', name: 'Örnek Moda Göçük Atölyesi', category: 'Boyasız göçük', tags: ['Boyasız göçük', 'Kaporta'], brands: ['BMW'], district: 'Kadıköy', city: 'İstanbul', distanceKm: 2.1, rating: 4.7, reviewCount: 112, open: true, hoursText: 'Açık · 18.00’a kadar', verified: true, claimed: true, sponsored: false, photo: '/v2/search/car-bmw.jpg', phone: '+90 216 000 01 02', address: 'Örnek Çarşı Sokak No: 8, Moda, Kadıköy', map: {x: 16.1, y: 22.9},
    services: ['Boyasız göçük', 'Kaporta'], payments: ['kart', 'nakit'], weekendOpen: false, quote: true, appointment: false, hoursKnown: true},
  {id: 'ornek-fikirtepe-kaporta', name: 'Örnek Fikirtepe Kaporta', category: 'Kaporta', tags: ['Kaporta', 'Lokal boya'], brands: ['Marka bilgisi yok'], district: 'Kadıköy', city: 'İstanbul', distanceKm: 3.0, rating: 0, reviewCount: 0, open: false, hoursText: 'Saat bilgisi yok', verified: false, claimed: false, sponsored: false, photo: null, phone: '+90 216 000 01 03', address: 'Örnek Sanayi Yolu No: 14, Fikirtepe, Kadıköy', map: {x: 9.4, y: 47.9},
    services: ['Kaporta', 'Lokal boya'], payments: [], weekendOpen: false, quote: false, appointment: false, hoursKnown: false},
  {id: 'ornek-goztepe-oto-boya', name: 'Örnek Göztepe Oto Boya', category: 'Lokal boya', tags: ['Lokal boya', 'Tampon onarımı'], brands: ['BMW', 'Volkswagen'], district: 'Kadıköy', city: 'İstanbul', distanceKm: 3.6, rating: 4.5, reviewCount: 23, open: false, hoursText: 'Kapalı · 09.00’da açılır', verified: true, claimed: true, sponsored: false, photo: '/v2/search/car-lift.jpg', phone: '+90 216 000 01 04', address: 'Örnek Boyacılar Sokak No: 3, Göztepe, Kadıköy', map: {x: 86.7, y: 61.8},
    services: ['Lokal boya', 'Tampon onarımı', 'Boyasız göçük'], payments: ['kart', 'nakit'], weekendOpen: true, quote: true, appointment: false, hoursKnown: true},
  {id: 'ornek-suadiye-kaporta', name: 'Örnek Suadiye Kaporta', category: 'Kaporta', tags: ['Kaporta', 'Tampon onarımı'], brands: ['Toyota', 'Hyundai'], district: 'Kadıköy', city: 'İstanbul', distanceKm: 4.2, rating: 4.6, reviewCount: 31, open: true, hoursText: 'Açık · 19.00’a kadar', verified: true, claimed: true, sponsored: false, photo: '/v2/search/car-white.jpg', phone: '+90 216 000 01 05', address: 'Örnek Bağdat Arkası No: 22, Suadiye, Kadıköy', map: {x: 21.3, y: 79.9},
    services: ['Kaporta', 'Tampon onarımı'], payments: ['kart', 'taksit'], weekendOpen: false, quote: true, appointment: true, hoursKnown: true},
];

// [id suffix, name, district, km, rating, reviews, closing time, photo index, extra brand, map x, map y, verified]
type Row = [string, string, string, number, number, number, string, number, string, number, number, boolean];
const pdrRows: Row[] = [
  ['acibadem-gocuk', 'Örnek Acıbadem Göçük Servisi', 'Kadıköy', 2.3, 4.6, 38, '19.00’a', 1, 'Audi', 30, 34, true],
  ['kozyatagi-pdr', 'Örnek Kozyatağı PDR', 'Kadıköy', 2.6, 4.4, 27, '18.30’a', 2, 'Mercedes-Benz', 62, 40, true],
  ['fenerbahce-boya', 'Örnek Fenerbahçe Boya & Göçük', 'Kadıköy', 2.8, 4.7, 64, '20.00’ye', 0, 'Mercedes-Benz', 40, 84, true],
  ['erenkoy-gocuk', 'Örnek Erenköy Göçük Merkezi', 'Kadıköy', 3.2, 4.3, 19, '19.00’a', 3, 'Audi', 71.6, 18.8, false],
  ['hasanpasa-pdr', 'Örnek Hasanpaşa PDR Atölyesi', 'Kadıköy', 3.4, 4.5, 41, '18.00’e', 4, 'Volkswagen', 55, 30, true],
  ['kosuyolu-gocuk', 'Örnek Koşuyolu Göçük', 'Kadıköy', 3.9, 4.2, 12, '18.00’e', 1, 'Audi', 36, 10, false],
  ['icerenkoy-pdr', 'Örnek İçerenköy PDR', 'Ataşehir', 4.4, 4.6, 33, '19.00’a', 2, 'Mercedes-Benz', 78, 86.8, true],
  ['altunizade-gocuk', 'Örnek Altunizade Göçük', 'Üsküdar', 4.8, 4.4, 22, '18.30’a', 0, 'Audi', 24, 6, true],
  ['bostanci-kaporta', 'Örnek Bostancı Kaporta & PDR', 'Kadıköy', 5.1, 4.5, 57, '19.00’a', 3, 'Volkswagen', 92, 76, true],
  ['barbaros-gocuk', 'Örnek Barbaros Göçük Servisi', 'Ataşehir', 5.6, 4.1, 9, '18.00’e', 4, 'Audi', 85, 30, false],
  ['baglarbasi-oto', 'Örnek Bağlarbaşı Oto Boya', 'Üsküdar', 6.0, 4.6, 29, '19.00’a', 1, 'Mercedes-Benz', 12, 14, true],
  ['kucukyali-pdr', 'Örnek Küçükyalı PDR', 'Maltepe', 7.2, 4.3, 16, '18.30’a', 2, 'Audi', 90, 84, true],
  ['idealtepe-gocuk', 'Örnek İdealtepe Göçük', 'Maltepe', 7.9, 4.5, 24, '19.00’a', 0, 'Volkswagen', 60, 92, true],
  ['cengelkoy-boya', 'Örnek Çengelköy Boya', 'Üsküdar', 8.6, 4.2, 11, '18.00’e', 3, 'Mercedes-Benz', 50, 4, false],
  ['dudullu-pdr', 'Örnek Dudullu PDR Noktası', 'Ümraniye', 9.4, 4.4, 18, '18.30’a', 4, 'Audi', 60, 8, true],
  ['kartal-gocuk', 'Örnek Kartal Göçük Atölyesi', 'Kartal', 11.2, 4.6, 47, '19.00’a', 1, 'Mercedes-Benz', 94, 45, true],
];

const pdrRecords: SearchBusiness[] = pdrRows.map(([slug, name, district, km, rating, reviews, until, photo, brand, x, y, verified], index) => ({
  id: `ornek-${slug}`, name, category: 'Boyasız göçük', tags: ['Boyasız göçük', 'Lokal boya'], brands: ['BMW', brand], district, city: 'İstanbul',
  distanceKm: km, rating, reviewCount: reviews, open: true, hoursText: `Açık · ${until} kadar`, verified, claimed: true, sponsored: false,
  photo: photos[photo] ?? null, phone: `+90 216 000 02 ${String(index + 10).padStart(2, '0')}`, address: `Örnek Sanayi Sitesi, G Blok No: ${index + 1}, ${district}`, map: {x, y},
  services: index % 3 === 0 ? ['Boyasız göçük', 'Lokal boya', 'Tampon onarımı'] : ['Boyasız göçük', 'Lokal boya'],
  payments: index % 2 === 0 ? ['kart', 'taksit', 'nakit'] : ['kart', 'nakit'], weekendOpen: index % 2 === 1, quote: true, appointment: index % 3 !== 1, hoursKnown: true,
}));

// One record outside İstanbul so the S02 "Yakındaki ili gör" path (Hakkari → Van) lands on a result.
const vanRecord: SearchBusiness = {id: 'ornek-van-oto-sanayi', name: 'Örnek Van Oto Sanayi', category: 'Boyasız göçük', tags: ['Boyasız göçük', 'Kaporta'], brands: ['BMW', 'Ford'], district: 'İpekyolu', city: 'Van', distanceKm: 1620, rating: 4.4, reviewCount: 14, open: true, hoursText: 'Açık · 18.00’e kadar', verified: true, claimed: true, sponsored: false, photo: '/v2/search/car-lift.jpg', phone: '+90 432 000 00 01', address: 'Örnek Sanayi Sitesi No: 5, İpekyolu, Van', map: {x: 50, y: 50},
  services: ['Boyasız göçük', 'Kaporta'], payments: ['kart', 'nakit'], weekendOpen: true, quote: true, appointment: true, hoursKnown: true};

const sharedRecords: SearchBusiness[] = mockBusinesses.map((business) => ({
  ...business,
  ...(sharedFacts[business.id] ?? {services: business.tags, payments: [], weekendOpen: false, quote: false, appointment: false, hoursKnown: true}),
}));

/** Every business the mock search knows. Figma records come first (they are the /karsilastir fallback). */
export const searchBusinesses: SearchBusiness[] = [...figmaRecords, ...pdrRecords, ...sharedRecords, vanRecord];

export function searchBusiness(id: string): SearchBusiness | undefined {
  return searchBusinesses.find((business) => business.id === id);
}

// All 81 provinces for the province picker; spelled like `cities` from @otosanayide/core where they overlap.
export const allProvinces = ['Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Aksaray', 'Amasya', 'Ankara', 'Antalya', 'Ardahan', 'Artvin', 'Aydın', 'Balıkesir', 'Bartın', 'Batman', 'Bayburt', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale', 'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Düzce', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum', 'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkâri', 'Hatay', 'Iğdır', 'Isparta', 'İstanbul', 'İzmir', 'Kahramanmaraş', 'Karabük', 'Karaman', 'Kars', 'Kastamonu', 'Kayseri', 'Kırıkkale', 'Kırklareli', 'Kırşehir', 'Kilis', 'Kocaeli', 'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Mardin', 'Mersin', 'Muğla', 'Muş', 'Nevşehir', 'Niğde', 'Ordu', 'Osmaniye', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas', 'Şanlıurfa', 'Şırnak', 'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Uşak', 'Van', 'Yalova', 'Yozgat', 'Zonguldak'];

/** District picker options per province (mock subset). Other provinces only offer "Tüm ilçeler". */
export const districtsByProvince: Record<string, string[]> = {
  'İstanbul': ['Ataşehir', 'Beşiktaş', 'Beyoğlu', 'Kadıköy', 'Kartal', 'Maltepe', 'Pendik', 'Sarıyer', 'Şişli', 'Ümraniye', 'Üsküdar'],
  'Van': ['Edremit', 'İpekyolu', 'Tuşba'],
};

/** Nearest covered province offered by S02 (mock). */
export const nearbyProvince: Record<string, string> = {
  hakkari: 'Van', bayburt: 'Erzurum', artvin: 'Rize', gümüşhane: 'Trabzon', ardahan: 'Erzurum', kars: 'Erzurum', ığdır: 'Van', bingöl: 'Muş', tunceli: 'Malatya',
  elazığ: 'Malatya', adıyaman: 'Malatya', kilis: 'Gaziantep', osmaniye: 'Adana', niğde: 'Konya', aksaray: 'Konya', karaman: 'Konya', nevşehir: 'Kayseri',
  sivas: 'Kayseri', yozgat: 'Kayseri', kırşehir: 'Ankara', kırıkkale: 'Ankara', çankırı: 'Ankara', çorum: 'Samsun', amasya: 'Samsun', tokat: 'Samsun',
  sinop: 'Samsun', kastamonu: 'Bolu', karabük: 'Bolu', bartın: 'Bolu', zonguldak: 'Düzce', bilecik: 'Eskişehir', kütahya: 'Eskişehir', uşak: 'Manisa',
  burdur: 'Antalya', isparta: 'Antalya', çanakkale: 'Balıkesir', edirne: 'Tekirdağ', kırklareli: 'Tekirdağ', yalova: 'Bursa', giresun: 'Ordu', erzincan: 'Erzurum',
};

/** Symptom words ("belirti") mapped to the services that usually fix them (mock). */
const symptomServices: Record<string, string[]> = {
  göçük: ['Boyasız göçük', 'Kaporta'], çizik: ['Lokal boya'], boya: ['Lokal boya'], tampon: ['Tampon onarımı'], klima: ['Klima gazı', 'Kompresör'],
  akü: ['Akü', 'Oto elektrik'], marş: ['Akü', 'Oto elektrik'], elektrik: ['Oto elektrik'], titreme: ['Rot balans', 'Lastik'], direksiyon: ['Rot balans'],
  lastik: ['Lastik'], motor: ['Motor revizyon', 'Mekanik onarım'], duman: ['Motor revizyon'], bakım: ['Periyodik bakım'], şanzıman: ['Motor revizyon'],
};

export const trLower = (value: string) => value.toLocaleLowerCase('tr-TR');
export const sameText = (a: string, b: string) => trLower(a.trim()) === trLower(b.trim());

export interface SearchFilters {
  q: string;
  il: string;
  ilce: string;
  area: SearchArea;
  km: number;
  services: string[];
  brands: string[];
  payments: PaymentMethod[];
  symptom: string;
  text: string;
  openNow: boolean;
  weekend: boolean;
  verifiedOnly: boolean;
  sort: SearchSort;
}

export const emptyFilters = (il = 'İstanbul'): SearchFilters => ({q: '', il, ilce: '', area: 'ilce', km: 50, services: [], brands: [], payments: [], symptom: '', text: '', openNow: false, weekend: false, verifiedOnly: false, sort: 'onerilen'});

/** The search drawn in Figma W02/W03, used when /ara is opened without any parameters. */
export const demoFilters = (): SearchFilters => ({
  ...emptyFilters(), q: 'Kadıköy’de BMW için boyasız göçük, kart geçsin', ilce: 'Kadıköy', area: 'cevre', services: ['Boyasız göçük'], brands: ['BMW'], payments: ['kart'], openNow: true,
});

function offersService(business: SearchBusiness, service: string) {
  return business.services.some((s) => sameText(s, service)) || sameText(business.category, service) || business.tags.some((t) => sameText(t, service));
}

function matchesSymptom(business: SearchBusiness, symptom: string) {
  const words = trLower(symptom).split(/[^\p{L}\p{N}]+/u).filter((word) => word.length > 2);
  const mapped = words.flatMap((word) => Object.entries(symptomServices).filter(([key]) => word.includes(key)).flatMap(([, services]) => services));
  if (mapped.length) return mapped.some((service) => offersService(business, service));
  const haystack = trLower([business.category, ...business.tags, ...business.services].join(' '));
  return words.some((word) => haystack.includes(word));
}

/** Location scope only (il, ilçe, area, distance). Facet counts are computed inside this scope. */
export function inScope(business: SearchBusiness, f: SearchFilters) {
  if (f.area === 'konum') return (business.distanceKm ?? Infinity) <= f.km;
  if (f.area === 'cevre' && sameText(f.il, 'İstanbul')) return (business.distanceKm ?? Infinity) <= f.km;
  if (!sameText(business.city, f.il)) return false;
  return f.area !== 'ilce' || !f.ilce || sameText(business.district, f.ilce);
}

export function matchesFilters(business: SearchBusiness, f: SearchFilters, skip?: 'services' | 'brands' | 'payments') {
  if (!inScope(business, f)) return false;
  if (skip !== 'services' && f.services.length && !f.services.some((service) => offersService(business, service))) return false;
  if (skip !== 'brands' && f.brands.length && !f.brands.some((brand) => business.brands.some((b) => sameText(b, brand)))) return false;
  if (skip !== 'payments' && f.payments.length && !f.payments.some((payment) => business.payments.includes(payment))) return false;
  if (f.symptom && !matchesSymptom(business, f.symptom)) return false;
  if (f.text) {
    const haystack = trLower([business.name, business.category, ...business.tags, ...business.services].join(' '));
    if (!haystack.includes(trLower(f.text))) return false;
  }
  if (f.openNow && !(business.open && business.hoursKnown)) return false;
  if (f.weekend && !business.weekendOpen) return false;
  if (f.verifiedOnly && !business.verified) return false;
  return true;
}

export function sortBusinesses(list: SearchBusiness[], sort: SearchSort) {
  const sorted = [...list];
  if (sort === 'yakin') return sorted.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  if (sort === 'puan') return sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
  if (sort === 'yorum') return sorted.sort((a, b) => b.reviewCount - a.reviewCount);
  // "Önerilen": sponsored first (always labelled), then claimed profiles, then distance.
  return sorted.sort((a, b) => Number(b.sponsored) - Number(a.sponsored) || Number(b.claimed) - Number(a.claimed) || (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
}

export const sortLabels: Record<SearchSort, string> = {onerilen: 'Önerilen sıralama', yakin: 'En yakın', puan: 'En yüksek puan', yorum: 'En çok yorum'};

/** Every service / brand the mock data declares, for the "Tümünü göster" lists. */
export const allServices = [...new Set([...primaryServices, ...searchBusinesses.flatMap((b) => b.services)])];
export const allBrands = [...new Set([...primaryBrands, ...searchBusinesses.flatMap((b) => b.brands)])].filter((b) => b !== 'Tüm markalar' && b !== 'Marka bilgisi yok');

/**
 * Mock "natural language" reading of the search box: picks out district/province, services, brands
 * and payment words. Whatever it cannot read is kept as a plain text filter.
 */
export function readQuery(text: string, base: SearchFilters): SearchFilters {
  const lower = trLower(text);
  // Word-start match, so "Van" does not match inside another word.
  const has = (term: string) => new RegExp(`(^|[^\\p{L}])${trLower(term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u').test(lower);
  const next: SearchFilters = {...base, q: text, services: [], brands: [], payments: [], symptom: '', text: ''};
  // A district name also sets its province ("Üsküdar’da" → İstanbul / Üsküdar).
  const districtHit = Object.entries(districtsByProvince).flatMap(([il, list]) => list.map((ilce) => ({il, ilce}))).find((d) => has(d.ilce));
  const province = allProvinces.find((p) => has(p)) ?? districtHit?.il;
  if (province) next.il = province;
  const district = districtHit && districtHit.il === next.il ? districtHit.ilce : undefined;
  next.ilce = district ?? (province ? '' : base.ilce);
  const synonyms: Record<string, string> = {
    pdr: 'Boyasız göçük', göçük: 'Boyasız göçük', tampon: 'Tampon onarımı', klima: 'Klima gazı', akü: 'Akü', lastik: 'Lastik',
    rot: 'Rot balans', ekspertiz: 'Ekspertiz', bakım: 'Periyodik bakım', elektrik: 'Oto elektrik', motor: 'Motor revizyon',
  };
  next.services = [...new Set([...allServices.filter((s) => lower.includes(trLower(s))), ...Object.entries(synonyms).filter(([k]) => has(k)).map(([, s]) => s)])];
  if (next.services.includes('Boyasız göçük') && !lower.replace('boyasız', '').includes('boya')) next.services = next.services.filter((s) => s !== 'Lokal boya');
  next.brands = allBrands.filter((b) => has(b) || (b === 'Mercedes-Benz' && has('mercedes')));
  next.payments = (['kart', 'taksit', 'nakit'] as PaymentMethod[]).filter((p) => lower.includes(p));
  if (!district && !province && !next.services.length && !next.brands.length && !next.payments.length) next.text = text.trim();
  return next;
}

/** Turkish locative suffix with apostrophe: İstanbul’da, Ankara’da, Kadıköy’de, Bayburt’ta. */
export function locative(name: string) {
  const lower = trLower(name);
  const vowel = [...lower].reverse().find((c) => 'aeıioöuüâ'.includes(c)) ?? 'a';
  const back = 'aıouâ'.includes(vowel);
  const hard = 'fstkçşhp'.includes(lower.at(-1) ?? '');
  return `${name}’${hard ? 't' : 'd'}${back ? 'a' : 'e'}`;
}
