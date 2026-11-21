// Synthetic businesses for the Web v2 screens. Every name starts with "Örnek": no real business data.
// Screen groups keep their extra mock data in their own files and refer to these ids.

export interface MockBusiness {
  id: string;
  name: string;
  category: string;
  tags: string[];
  brands: string[];
  district: string;
  city: string;
  /** Straight-line distance; null when the search had no location. */
  distanceKm: number | null;
  rating: number;
  reviewCount: number;
  open: boolean;
  hoursText: string;
  verified: boolean;
  claimed: boolean;
  sponsored: boolean;
  photo: string | null;
  phone: string;
  address: string;
  /** Position on the mock map, in percent of the map box. */
  map: {x: number; y: number};
}

export const mockBusinesses: MockBusiness[] = [
  {id: 'ornek-teknik-garaj', name: 'Örnek Teknik Garaj', category: 'Mekanik Servis', tags: ['Mekanik Servis', 'Periyodik bakım'], brands: ['BMW', 'Mercedes-Benz'], district: 'Kadıköy', city: 'İstanbul', distanceKm: 1.2, rating: 4.5, reviewCount: 28, open: true, hoursText: 'Açık · 19.00’a kadar', verified: true, claimed: true, sponsored: true, photo: '/v2/workshop.jpg', phone: '+90 216 000 00 01', address: 'Örnek Sanayi Sitesi, A Blok No: 12, Kadıköy', map: {x: 38, y: 42}},
  {id: 'ornek-atasehir-ekspertiz', name: 'Örnek Ataşehir Ekspertiz', category: 'Ekspertiz', tags: ['Ekspertiz', 'Boya ölçümü'], brands: ['Tüm markalar'], district: 'Ataşehir', city: 'İstanbul', distanceKm: 2.4, rating: 4.7, reviewCount: 64, open: true, hoursText: 'Açık · 18.30’a kadar', verified: true, claimed: true, sponsored: false, photo: '/v2/workshop.jpg', phone: '+90 216 000 00 02', address: 'Örnek Oto Sanayi, B Blok No: 4, Ataşehir', map: {x: 62, y: 30}},
  {id: 'ornek-kaporta-boya', name: 'Örnek Kaporta & Boya', category: 'Kaporta & Boya', tags: ['Kaporta & Boya', 'Göçük düzeltme'], brands: ['Renault', 'Fiat', 'Toyota'], district: 'Ümraniye', city: 'İstanbul', distanceKm: 3.1, rating: 4.3, reviewCount: 41, open: true, hoursText: 'Açık · 19.00’a kadar', verified: true, claimed: true, sponsored: false, photo: '/v2/workshop.jpg', phone: '+90 216 000 00 03', address: 'Örnek Sanayi Sitesi, C Blok No: 7, Ümraniye', map: {x: 55, y: 58}},
  {id: 'ornek-oto-elektrik', name: 'Örnek Oto Elektrik', category: 'Oto Elektrik', tags: ['Oto Elektrik', 'Akü'], brands: ['Volkswagen', 'Audi', 'Skoda'], district: 'Kadıköy', city: 'İstanbul', distanceKm: 1.8, rating: 4.6, reviewCount: 19, open: false, hoursText: 'Kapalı · 08.30’da açılır', verified: false, claimed: true, sponsored: false, photo: null, phone: '+90 216 000 00 04', address: 'Örnek Sanayi Sitesi, D Blok No: 3, Kadıköy', map: {x: 30, y: 64}},
  {id: 'ornek-lastik-rot', name: 'Örnek Lastik & Rot', category: 'Lastik & Rot Balans', tags: ['Lastik', 'Rot balans'], brands: ['Tüm markalar'], district: 'Maltepe', city: 'İstanbul', distanceKm: 4.6, rating: 4.4, reviewCount: 52, open: true, hoursText: 'Açık · 20.00’ye kadar', verified: true, claimed: true, sponsored: false, photo: '/v2/workshop.jpg', phone: '+90 216 000 00 05', address: 'Örnek Lastikçiler Sitesi No: 21, Maltepe', map: {x: 72, y: 72}},
  {id: 'ornek-sanayi-motor', name: 'Örnek Sanayi Motor', category: 'Motor Revizyon', tags: ['Motor', 'Şanzıman'], brands: ['Ford', 'Hyundai'], district: 'Kartal', city: 'İstanbul', distanceKm: 6.3, rating: 0, reviewCount: 0, open: true, hoursText: 'Açık · 18.00’e kadar', verified: false, claimed: false, sponsored: false, photo: null, phone: '+90 216 000 00 06', address: 'Örnek Sanayi Sitesi, E Blok No: 9, Kartal', map: {x: 80, y: 46}},
  {id: 'ornek-klima-servis', name: 'Örnek Klima Servis', category: 'Klima', tags: ['Klima gazı', 'Kompresör'], brands: ['Tüm markalar'], district: 'Üsküdar', city: 'İstanbul', distanceKm: 3.9, rating: 4.8, reviewCount: 33, open: true, hoursText: 'Açık · 19.00’a kadar', verified: true, claimed: true, sponsored: false, photo: '/v2/workshop.jpg', phone: '+90 216 000 00 07', address: 'Örnek Sanayi Çarşısı No: 15, Üsküdar', map: {x: 22, y: 28}},
  {id: 'ornek-togg-yetkili', name: 'Örnek Elektrikli Araç Servisi', category: 'Elektrikli Araç', tags: ['Elektrikli araç', 'Batarya kontrolü'], brands: ['Togg', 'Tesla', 'BYD'], district: 'Ataşehir', city: 'İstanbul', distanceKm: 2.9, rating: 4.6, reviewCount: 22, open: true, hoursText: 'Açık · 18.00’e kadar', verified: true, claimed: true, sponsored: false, photo: '/v2/workshop.jpg', phone: '+90 216 000 00 08', address: 'Örnek İş Merkezi No: 2, Ataşehir', map: {x: 66, y: 20}},
];

export function mockBusiness(id: string): MockBusiness | undefined {
  return mockBusinesses.find((business) => business.id === id);
}

/** "4,5" in Turkish, "4.5" in English: pass the page's locale tag (useLocale().localeTag). */
export const formatRating = (value: number, localeTag = 'tr-TR') => value.toLocaleString(localeTag, {minimumFractionDigits: 1, maximumFractionDigits: 1});
/** "1,2 km" in Turkish, "1.2 km" in English; '' without a distance. */
export const formatKm = (value: number | null, localeTag = 'tr-TR') => value === null ? '' : `${value.toLocaleString(localeTag, {minimumFractionDigits: 1, maximumFractionDigits: 1})} km`;
