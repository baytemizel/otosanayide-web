// Synthetic data for the Web v2 request screens (W14 teklif iste, W15 taleplerim, W16 randevu,
// W17 bildirimler, W18 hesabım). Business names start with "Örnek"; people are "Deniz K." style.
// Kept small and typed so each screen can later be wired to the API.
// UI labels here (services, hints, chips, statuses, line items, notification texts) are Turkish source
// texts: the screens show them through `t` and their English is in app/locales/v2-requests.json.
// Business names, people, message bodies and offer notes written "by the business" stay Turkish.
import {type MockBusiness} from './businesses';
import {findBusiness} from './catalog';

/* ------------------------------------------------------------------ businesses */

/** Figma's request screens use the PDR shop from the search mock data. */
export const DEFAULT_REQUEST_BUSINESS_ID = 'ornek-kadikoy-pdr-noktasi';

export function requestBusiness(id?: string | null): MockBusiness | undefined {
  if (!id) return undefined;
  return findBusiness(id);
}

/** Average response time shown on the summary card (hours). */
export const responseHours: Record<string, number> = {
  'ornek-kadikoy-pdr-noktasi': 4,
  'ornek-kaporta-boya': 6,
  'ornek-teknik-garaj': 3,
  'ornek-atasehir-ekspertiz': 5,
};
export const responseHoursFor = (id: string) => responseHours[id] ?? 8;

/* ------------------------------------------------------------------ W14 wizard */

export interface RequestServiceOption { id: string; label: string; hint: string }
export interface RequestVehicle { id: string; label: string; detail: string }
export interface RequestChoice { id: string; label: string }

export const requestServices: RequestServiceOption[] = [
  {id: 'boyasiz-gocuk', label: 'Boyasız göçük', hint: 'Park göçüğü, dolu hasarı'},
  {id: 'kaporta-boya', label: 'Kaporta & boya', hint: 'Çizik, boya, panel değişimi'},
  {id: 'periyodik-bakim', label: 'Periyodik bakım', hint: 'Yağ, filtre, genel kontrol'},
  {id: 'mekanik-ariza', label: 'Mekanik arıza', hint: 'Ses, titreme, performans kaybı'},
  {id: 'oto-elektrik', label: 'Oto elektrik', hint: 'Akü, marş, arıza lambası'},
  {id: 'lastik-rot', label: 'Lastik & rot balans', hint: 'Lastik değişimi, rot ayarı'},
  {id: 'klima', label: 'Klima', hint: 'Gaz dolumu, soğutmama'},
  {id: 'ekspertiz', label: 'Ekspertiz', hint: 'Alım öncesi kontrol, boya ölçümü'},
];

export const requestVehicles: RequestVehicle[] = [
  {id: 'bmw-320i', label: 'BMW 320i · 2019', detail: 'Benzin · Otomatik · 68.400 km'},
  {id: 'renault-clio', label: 'Renault Clio · 2021', detail: 'Dizel · Manuel · 41.200 km'},
];

export const requestTimeOptions: RequestChoice[] = [
  {id: 'bu-hafta', label: 'Bu hafta içinde'},
  {id: 'bugun', label: 'Bugün'},
  {id: 'gelecek-hafta', label: 'Gelecek hafta'},
  {id: 'fark-etmez', label: 'Fark etmez'},
];

export const requestContactOptions: RequestChoice[] = [
  {id: 'uygulama', label: 'Uygulama mesajı'},
  {id: 'telefon', label: 'Telefon'},
  {id: 'e-posta', label: 'E-posta'},
];

export const REQUEST_DESCRIPTION_MAX = 1000;

/** Answers used when the wizard opens straight on a later step (?adim=3). */
export const requestMockAnswers = {
  serviceId: 'boyasiz-gocuk',
  vehicleId: 'bmw-320i',
  description: 'Sol arka kapıda yaklaşık 5 cm göçük var, boya çatlamamış. Park halindeyken oldu.',
  photos: ['/v2/requests/damage-1.jpg', '/v2/requests/damage-2.jpg'],
  timeId: 'bu-hafta',
  contactId: 'uygulama',
};

/* ------------------------------------------------------------------ W15 requests & offers */

export interface OfferLine { item: string; description: string; amount: number }
export interface OfferMessage { from: 'business' | 'member'; text: string; time: string }
export type OfferStatus = 'pending' | 'accepted' | 'rejected';
export interface MockOffer {
  id: string;
  code: string;
  businessId: string;
  validUntil: string;
  lines: OfferLine[];
  note: string;
  status: OfferStatus;
  messages: OfferMessage[];
}
export type RequestStatus = 'awaiting' | 'offers' | 'scheduled' | 'closed';
export interface MockRequest {
  id: string;
  service: string;
  vehicle: string;
  createdText: string;
  status: RequestStatus;
  offers: MockOffer[];
}

export const requestStatusLabel: Record<RequestStatus, string> = {
  awaiting: 'Yanıt bekleniyor',
  offers: 'Karar bekleniyor',
  scheduled: 'Randevu talep edildi',
  closed: 'Tamamlandı',
};

export const offerTotal = (offer: MockOffer) => offer.lines.reduce((sum, line) => sum + line.amount, 0);
export const formatTry = (value: number, tag = 'tr-TR') => `₺${value.toLocaleString(tag, {maximumFractionDigits: 0})}`;

export const mockRequests: MockRequest[] = [
  {
    id: 'TL-2026-0418',
    service: 'Boyasız göçük',
    vehicle: 'BMW 320i',
    createdText: '17 Kasım 2026',
    status: 'offers',
    offers: [
      {
        id: 'T-2026-1182', code: 'T-2026-1182', businessId: 'ornek-kadikoy-pdr-noktasi', validUntil: '24 Kasım 2026', status: 'pending',
        note: 'Ön inceleme sonrası değişebilir. Dahil olmayan işler ayrıca onayına sunulur.',
        lines: [
          {item: 'İşçilik', description: 'Boyasız göçük düzeltme (1 panel)', amount: 2400},
          {item: 'Parça', description: '—', amount: 0},
          {item: 'KDV', description: '%20', amount: 480},
        ],
        messages: [
          {from: 'business', text: 'Fotoğrafa göre boyasız düzeltilebilir. Cuma 10.00 uygun mu?', time: '14.40'},
          {from: 'member', text: 'Cuma olur. Kartla ödeyebilir miyim?', time: '14.52'},
          {from: 'business', text: 'Evet, kart geçerli.', time: '14.55'},
        ],
      },
      {
        id: 'T-2026-1187', code: 'T-2026-1187', businessId: 'ornek-kaporta-boya', validUntil: '25 Kasım 2026', status: 'pending',
        note: 'Boya gerekirse ayrıca fiyat verilir. Ön inceleme ücretsizdir.',
        lines: [
          {item: 'İşçilik', description: 'Göçük düzeltme ve lokal rötuş', amount: 2900},
          {item: 'Parça', description: 'Rötuş boyası', amount: 350},
          {item: 'KDV', description: '%20', amount: 650},
        ],
        messages: [
          {from: 'business', text: 'Fotoğraflar net. Rötuş gerekebilir, yerinde bakalım.', time: '16.05'},
        ],
      },
      {
        id: 'T-2026-1190', code: 'T-2026-1190', businessId: 'ornek-teknik-garaj', validUntil: '23 Kasım 2026', status: 'pending',
        note: 'Göçük için anlaşmalı PDR ustamız gelir; süre 1 gün.',
        lines: [
          {item: 'İşçilik', description: 'Boyasız göçük düzeltme (1 panel)', amount: 2650},
          {item: 'Parça', description: '—', amount: 0},
          {item: 'KDV', description: '%20', amount: 530},
        ],
        messages: [],
      },
    ],
  },
  {
    id: 'TL-2026-0402',
    service: 'Periyodik bakım',
    vehicle: 'Renault Clio',
    createdText: '12 Kasım 2026',
    status: 'scheduled',
    offers: [
      {
        id: 'T-2026-1121', code: 'T-2026-1121', businessId: 'ornek-teknik-garaj', validUntil: '19 Kasım 2026', status: 'accepted',
        note: 'Yağ ve filtreler orijinal muadil. Ek iş çıkarsa önce sana sorulur.',
        lines: [
          {item: 'İşçilik', description: 'Periyodik bakım (yağ, filtreler, kontrol)', amount: 1200},
          {item: 'Parça', description: 'Motor yağı 5W-30, yağ/hava/polen filtresi', amount: 2300},
          {item: 'KDV', description: '%20', amount: 700},
        ],
        messages: [
          {from: 'business', text: 'Randevu talebin bize ulaştı, 20 Kasım 09.30 onaylandı.', time: '10.12'},
        ],
      },
    ],
  },
  {
    id: 'TL-2026-0425',
    service: 'Klima',
    vehicle: 'BMW 320i',
    createdText: 'Bugün',
    status: 'awaiting',
    offers: [],
  },
];

export const mockRequestById = (id?: string | null) => mockRequests.find((request) => request.id === id);
export const mockOfferById = (id?: string | null) => {
  for (const request of mockRequests) {
    const offer = request.offers.find((item) => item.id === id);
    if (offer) return {request, offer};
  }
  return undefined;
};

/* ------------------------------------------------------------------ W16 appointment */

export const appointmentSlotTimes = ['09.00', '09.30', '10.00', '10.30', '11.00', '11.30', '13.00', '13.30', '14.00', '15.00', '16.00', '16.30'];
/** First bookable week (Monday) and how many weeks can be browsed. */
export const appointmentFirstWeek = '2026-11-23';
export const appointmentWeekCount = 3;
/** 0 = Sunday … 6 = Saturday. Sunday is never shown; Saturday is closed for the mock business. */
export const appointmentClosedWeekdays = [6];
/** Taken slots per day (ISO date). Days not listed fall back to a deterministic pattern. */
export const appointmentTakenSlots: Record<string, string[]> = {
  '2026-11-23': ['09.00', '13.00', '15.00'],
  '2026-11-24': ['10.00', '10.30', '14.00', '16.30'],
  '2026-11-25': ['09.30', '11.30', '16.00'],
  '2026-11-26': ['11.00', '13.30'],
  '2026-11-27': ['09.00', '09.30', '10.00', '16.00'],
};
export const appointmentDefault = {date: '2026-11-25', time: '10.00'};

export function appointmentTaken(iso: string): string[] {
  const listed = appointmentTakenSlots[iso];
  if (listed) return listed;
  const seed = Number(iso.slice(8, 10));
  return appointmentSlotTimes.filter((_, index) => (index * 7 + seed) % 5 === 0);
}

/* ------------------------------------------------------------------ W17 notifications */

export type NotificationKind = 'talep' | 'yorum' | 'garaj';
export type NotificationIcon = 'file' | 'calendar' | 'bell' | 'message' | 'shield';
export interface MockNotification {
  id: string;
  kind: NotificationKind;
  icon: NotificationIcon;
  tone: 'orange' | 'lime' | 'sky' | 'cream';
  title: string;
  text: string;
  time: string;
  unread: boolean;
  to: string;
}

export const notificationFilters: {id: 'tumu' | NotificationKind; label: string}[] = [
  {id: 'tumu', label: 'Tümü'},
  {id: 'talep', label: 'Talepler'},
  {id: 'yorum', label: 'Yorumlar'},
  {id: 'garaj', label: 'Garaj'},
];

export const mockNotifications: MockNotification[] = [
  {id: 'n1', kind: 'talep', icon: 'file', tone: 'orange', title: 'Teklif hazır', text: 'Örnek Kadıköy PDR Noktası ön teklif gönderdi · ₺2.880', time: '12 dk', unread: true, to: '/taleplerim?talep=TL-2026-0418'},
  {id: 'n2', kind: 'talep', icon: 'calendar', tone: 'lime', title: 'Randevu onaylandı', text: '25 Kasım 10.00 · Örnek Kadıköy PDR Noktası', time: '1 sa', unread: true, to: '/taleplerim?talep=TL-2026-0418'},
  {id: 'n3', kind: 'garaj', icon: 'bell', tone: 'sky', title: 'Bakım yaklaşıyor', text: 'BMW 320i periyodik bakım · 14 gün kaldı', time: 'Bugün 09.00', unread: false, to: '/hatirlatmalar'},
  {id: 'n4', kind: 'yorum', icon: 'message', tone: 'cream', title: 'Yorumun yayında', text: 'Örnek Teknik Garaj için yorumun yayınlandı', time: 'Dün', unread: false, to: '/yorumlarim'},
  {id: 'n5', kind: 'yorum', icon: 'shield', tone: 'cream', title: 'Bildirim sonucu', text: 'Bildirdiğin yorum incelendi: kurallara aykırı bulunmadı', time: '3 gün', unread: false, to: '/yorumlarim'},
];

/* ------------------------------------------------------------------ W18 account settings */

export interface AccountPreference { id: string; title: string; text: string; on: boolean }

export const mockAccountPreferences: AccountPreference[] = [
  {id: 'talep', title: 'Talep güncellemeleri', text: 'Uygulama içi + push', on: true},
  {id: 'bakim-eposta', title: 'Bakım hatırlatmaları e-postası', text: 'Doğrulanmış adres', on: true},
  {id: 'duyuru', title: 'Ürün duyuruları', text: 'Pazarlama iletisi · varsayılan kapalı', on: false},
];

export const mockDataExport = {lastRequest: '28 Eki', status: 'ready' as 'ready' | 'preparing'};
export const ACCOUNT_DELETE_GRACE_DAYS = 30;
