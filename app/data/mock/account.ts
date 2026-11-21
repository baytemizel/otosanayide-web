// Mock data for the account pages that the Figma account menu links to but that have no Web v2 frame
// of their own (/yorumlarim, /basvurularim). Synthetic.
// Dates are ISO days formatted in the page's language; status labels and claim notes are Turkish source text
// translated at render (K223). Business names and review texts stay as written.

export interface MockOwnReview {
  id: string;
  businessId: string;
  business: string;
  rating: number;
  text: string;
  /** ISO day (YYYY-MM-DD). */
  date: string;
  status: 'yayinda' | 'incelemede' | 'reddedildi';
  reply?: string;
}

export const mockOwnReviews: MockOwnReview[] = [
  {id: 'y1', businessId: 'ornek-teknik-garaj', business: 'Örnek Teknik Garaj', rating: 5, text: 'Periyodik bakımı söz verdikleri saatte bitirdiler, değişen parçaları tek tek gösterdiler.', date: '2026-11-12', status: 'yayinda', reply: 'Teşekkürler Deniz Bey, bir sonraki bakımda görüşmek üzere.'},
  {id: 'y2', businessId: 'ornek-klima-servis', business: 'Örnek Klima Servis', rating: 4, text: 'Klima gazı dolumu hızlıydı; fiyat tekliftekiyle aynı çıktı.', date: '2026-11-03', status: 'incelemede'},
  {id: 'y3', businessId: 'ornek-lastik-rot', business: 'Örnek Lastik & Rot', rating: 3, text: 'Rot balans iyi ama bekleme süresi uzundu.', date: '2026-10-21', status: 'yayinda'},
];

export interface MockClaim {
  id: string;
  businessId: string;
  business: string;
  /** ISO day (YYYY-MM-DD). */
  date: string;
  status: 'inceleniyor' | 'belge-bekleniyor' | 'onaylandi';
  note: string;
}

export const mockClaims: MockClaim[] = [
  {id: 'B-2026-0112', businessId: 'ornek-sanayi-motor', business: 'Örnek Sanayi Motor', date: '2026-11-15', status: 'belge-bekleniyor', note: 'Vergi levhası veya oda kaydı belgesi bekleniyor.'},
  {id: 'B-2026-0098', businessId: 'ornek-oto-elektrik', business: 'Örnek Oto Elektrik', date: '2026-11-02', status: 'inceleniyor', note: 'Belgelerin ekibimizde; ortalama inceleme süresi 2 iş günü.'},
];

export const reviewStatusLabel = {yayinda: 'Yayında', incelemede: 'İncelemede', reddedildi: 'Yayımlanmadı'} as const;
export const claimStatusLabel = {inceleniyor: 'İnceleniyor', 'belge-bekleniyor': 'Belge bekleniyor', onaylandi: 'Onaylandı'} as const;
