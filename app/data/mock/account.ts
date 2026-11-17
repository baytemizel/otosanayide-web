// Mock data for the account pages that the Figma account menu links to but that have no Web v2 frame
// of their own (/yorumlarim, /basvurularim). Synthetic.

export interface MockOwnReview {
  id: string;
  businessId: string;
  business: string;
  rating: number;
  text: string;
  date: string;
  status: 'yayinda' | 'incelemede' | 'reddedildi';
  reply?: string;
}

export const mockOwnReviews: MockOwnReview[] = [
  {id: 'y1', businessId: 'ornek-teknik-garaj', business: 'Örnek Teknik Garaj', rating: 5, text: 'Periyodik bakımı söz verdikleri saatte bitirdiler, değişen parçaları tek tek gösterdiler.', date: '12 Kasım 2026', status: 'yayinda', reply: 'Teşekkürler Deniz Bey, bir sonraki bakımda görüşmek üzere.'},
  {id: 'y2', businessId: 'ornek-klima-servis', business: 'Örnek Klima Servis', rating: 4, text: 'Klima gazı dolumu hızlıydı; fiyat tekliftekiyle aynı çıktı.', date: '3 Kasım 2026', status: 'incelemede'},
  {id: 'y3', businessId: 'ornek-lastik-rot', business: 'Örnek Lastik & Rot', rating: 3, text: 'Rot balans iyi ama bekleme süresi uzundu.', date: '21 Ekim 2026', status: 'yayinda'},
];

export interface MockClaim {
  id: string;
  businessId: string;
  business: string;
  date: string;
  status: 'inceleniyor' | 'belge-bekleniyor' | 'onaylandi';
  note: string;
}

export const mockClaims: MockClaim[] = [
  {id: 'B-2026-0112', businessId: 'ornek-sanayi-motor', business: 'Örnek Sanayi Motor', date: '15 Kasım 2026', status: 'belge-bekleniyor', note: 'Vergi levhası veya oda kaydı belgesi bekleniyor.'},
  {id: 'B-2026-0098', businessId: 'ornek-oto-elektrik', business: 'Örnek Oto Elektrik', date: '2 Kasım 2026', status: 'inceleniyor', note: 'Belgelerin ekibimizde; ortalama inceleme süresi 2 iş günü.'},
];

export const reviewStatusLabel = {yayinda: 'Yayında', incelemede: 'İncelemede', reddedildi: 'Yayımlanmadı'} as const;
export const claimStatusLabel = {inceleniyor: 'İnceleniyor', 'belge-bekleniyor': 'Belge bekleniyor', onaylandi: 'Onaylandı'} as const;
