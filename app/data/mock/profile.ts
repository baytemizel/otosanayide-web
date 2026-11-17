// Profile-only mock data for /servis/[id] (Figma W04, W05, W07, S08). Keyed by the ids in businesses.ts.
// Everything here is synthetic; the base record (name, address, rating, photo, claimed…) stays in businesses.ts.
import type {MockBusiness} from './businesses';

export interface ProfileHoursRow {
  label: string;
  /** JS weekday numbers (0 = Pazar) this row covers, used to mark "bugün". */
  days: number[];
  time: string;
}

export interface ProfileReview {
  id: string;
  author: string;
  initials: string;
  avatarColor: string;
  meta: string;
  rating: number;
  text: string;
  resolved: 'Evet' | 'Kısmen' | 'Hayır' | 'Henüz belli değil';
  photoCount: number;
  ownerReply: string | null;
  helpful: number;
}

export interface ProfilePhoto {
  src: string;
  alt: string;
}

export interface ProfileData {
  services: string[];
  /** Brand expertise declared by the business; null on catalog (unclaimed) profiles. */
  brands: string[] | null;
  /** "owner" = data managed by the business, "catalog" = imported catalog record. */
  source: 'owner' | 'catalog';
  sourceNote: string;
  /** null = hours unknown ("Çalışma saati bilinmiyor"). */
  hours: ProfileHoursRow[] | null;
  coordinateVerified: boolean;
  photos: ProfilePhoto[];
  photoCount: number;
  dimensions: {label: string; score: number}[];
  reviews: ProfileReview[];
  facts: {label: string; value: string}[];
}

export const reviewDimensions = ['Hizmet kalitesi', 'İletişim', 'Fiyat şeffaflığı', 'Ödeme kolaylığı', 'Temizlik'] as const;

export const resolvedOptions = ['Evet', 'Kısmen', 'Hayır', 'Henüz belli değil'] as const;

export const ratingWords = ['', 'Çok kötü', 'Kötü', 'Orta', 'İyi', 'Çok iyi'] as const;

export const visitMonths = ['Kasım 2026', 'Ekim 2026', 'Eylül 2026', 'Ağustos 2026', 'Temmuz 2026', 'Haziran 2026', 'Mayıs 2026', 'Nisan 2026', 'Mart 2026', 'Şubat 2026', 'Ocak 2026', 'Aralık 2025'];

export const reportReasons = ['Çalışma saatleri yanlış', 'Adres veya konum yanlış', 'İşletme kalıcı kapandı', 'Başka bir sorun'] as const;

const standardHours: ProfileHoursRow[] = [
  {label: 'Pazartesi', days: [1], time: '08.30 – 19.00'},
  {label: 'Salı', days: [2], time: '08.30 – 19.00'},
  {label: 'Çarşamba – Cuma', days: [3, 4, 5], time: '08.30 – 19.00'},
  {label: 'Cumartesi', days: [6], time: '09.00 – 17.00'},
  {label: 'Pazar', days: [0], time: 'Kapalı'},
];

const workshopPhotos: ProfilePhoto[] = [
  {src: '/v2/workshop.jpg', alt: 'Atölyede liftte bekleyen araç ve çalışan usta'},
  {src: '/v2/profile/gallery-2.jpg', alt: 'Liftte yükseltilmiş araç ve takım dolapları'},
  {src: '/v2/profile/gallery-3.jpg', alt: 'Bakım alanında detaylı temizliği yapılan araç'},
];

const sampleReviews: ProfileReview[] = [
  {id: 'r1', author: 'Selin A.', initials: 'SA', avatarColor: 'var(--sky-200)', meta: 'Ekim 2026 · BMW 3 Serisi', rating: 5, text: 'Kapıdaki göçük iz bırakmadan çıktı. Fiyatı işe başlamadan söylediler, teslimde değişmedi. Kartla ödedim.', resolved: 'Evet', photoCount: 2, ownerReply: 'Teşekkürler Selin Hanım, tekrar bekleriz.', helpful: 12},
  {id: 'r2', author: 'Mert Y.', initials: 'MY', avatarColor: 'var(--orange-100)', meta: 'Eylül 2026 · Audi A4', rating: 4, text: 'Randevu saatine uydular, bekleme alanı temizdi. Kart geçti; iş bir saat uzadı ama önceden haber verdiler.', resolved: 'Evet', photoCount: 0, ownerReply: null, helpful: 12},
  {id: 'r3', author: 'Deniz K.', initials: 'DK', avatarColor: 'var(--lime-100)', meta: 'Ağustos 2026 · Volkswagen Passat', rating: 5, text: 'Ön tampondaki çiziği aynı gün hallettiler. Renk tonu birebir tuttu, fatura kesildi.', resolved: 'Evet', photoCount: 1, ownerReply: null, helpful: 7},
  {id: 'r4', author: 'Ece T.', initials: 'ET', avatarColor: 'var(--cream-100)', meta: 'Temmuz 2026 · Mercedes-Benz C 200', rating: 4, text: 'İş temiz ama yoğun bir gündü, teslim iki saat gecikti. Bilgilendirme mesajı geldi.', resolved: 'Kısmen', photoCount: 0, ownerReply: 'Gecikme için kusura bakmayın Ece Hanım, bilgilendirmeyi artırıyoruz.', helpful: 3},
];

const profiles: Record<string, Partial<ProfileData>> = {
  'ornek-teknik-garaj': {
    services: ['Boyasız göçük', 'Kaporta', 'Lokal boya', 'Tampon onarımı', 'Dolu hasarı'],
    brands: ['BMW', 'Mercedes-Benz', 'Audi', 'Volkswagen'],
    photoCount: 24,
    dimensions: [
      {label: 'Hizmet kalitesi', score: 4.9},
      {label: 'İletişim', score: 4.7},
      {label: 'Fiyat şeffaflığı', score: 4.6},
      {label: 'Ödeme kolaylığı', score: 4.8},
      {label: 'Temizlik', score: 4.5},
    ],
    reviews: sampleReviews,
    facts: [
      {label: 'Ortalama yanıt', value: '4 saat'},
      {label: 'Ödeme', value: 'Kart · Nakit'},
      {label: 'Olanaklar', value: 'Bekleme alanı · WC'},
    ],
  },
  'ornek-sanayi-motor': {
    services: ['Motor revizyonu', 'Şanzıman onarımı', 'Triger seti değişimi', 'Conta değişimi'],
    brands: null,
    source: 'catalog',
    sourceNote: 'Bilgiler katalog kaynağından alınmıştır · Son güncelleme: Ekim 2026',
    hours: null,
    coordinateVerified: false,
    reviews: [],
  },
  'ornek-oto-elektrik': {
    services: ['Akü değişimi', 'Marş motoru', 'Alternatör onarımı', 'Arıza tespiti'],
    coordinateVerified: false,
    reviews: sampleReviews.slice(1, 3),
    facts: [
      {label: 'Ortalama yanıt', value: '1 gün'},
      {label: 'Ödeme', value: 'Kart · Nakit'},
      {label: 'Olanaklar', value: 'Bekleme alanı'},
    ],
  },
};

function defaultDimensions(rating: number) {
  const offsets = [0.2, 0.1, -0.1, 0.1, -0.2];
  return reviewDimensions.map((label, i) => ({label, score: Math.min(5, Math.max(1, Math.round((rating + offsets[i]!) * 10) / 10))}));
}

/** Profile data for a business; unknown ids fall back to sensible defaults built from the base record. */
export function mockProfile(business: MockBusiness): ProfileData {
  const own = profiles[business.id] ?? {};
  const photos = business.photo ? [{...workshopPhotos[0]!, src: business.photo}, ...workshopPhotos.slice(1)] : [];
  return {
    services: [...business.tags, 'Arıza tespiti', 'Periyodik kontrol'],
    brands: business.claimed ? business.brands : null,
    source: business.claimed ? 'owner' : 'catalog',
    sourceNote: business.claimed ? 'Marka uzmanlığı işletme beyanıdır; yetkili servis anlamına gelmez.' : 'Bilgiler katalog kaynağından alınmıştır · Son güncelleme: Ekim 2026',
    hours: standardHours,
    coordinateVerified: business.verified,
    photos,
    photoCount: photos.length ? 12 : 0,
    dimensions: defaultDimensions(business.rating),
    reviews: business.reviewCount > 0 ? sampleReviews.slice(0, 3) : [],
    facts: [
      {label: 'Ortalama yanıt', value: '6 saat'},
      {label: 'Ödeme', value: 'Kart · Nakit'},
      {label: 'Olanaklar', value: 'Bekleme alanı · WC'},
    ],
    ...own,
  };
}
