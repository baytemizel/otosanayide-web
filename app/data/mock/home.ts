// Synthetic content for the Web v2 home page (Figma 107:38 "W-V2 · Ana sayfa · Misafir").
// Every business is "Örnek …", every person a first name + initial. Later each block is fed by the API.
import type {MockReview} from '~/components/v2/V2ReviewCard.vue';

/* Hero + smart search (108:42) */
export const homeHeroTrust = ['Üyelik yok', 'Arama ve yol tarifi ücretsiz', 'Sponsorlu içerik etiketli'];

export type HomeSearchTab = 'hizmet' | 'belirti' | 'arac';
export interface HomeSearchTabInfo {
  id: HomeSearchTab;
  label: string;
  fieldLabel: string;
  placeholder: string;
  popular: string[];
}
export const homeSearchTabs: HomeSearchTabInfo[] = [
  {id: 'hizmet', label: 'Hizmete göre', fieldLabel: 'Ne lazım?', placeholder: 'Örn. fren balatası değişimi', popular: ['Periyodik bakım', 'Fren balatası', 'Seramik kaplama', 'Lastik değişimi', 'Klima bakımı', 'Oto ekspertiz']},
  {id: 'belirti', label: 'Belirtiye göre', fieldLabel: 'Ne fark ettin?', placeholder: 'Örn. frenden ses geliyor', popular: ['Frenden ses geliyor', 'Direksiyon titriyor', 'Klima soğutmuyor', 'Akü çabuk bitiyor', 'Vites geçişi sert']},
  {id: 'arac', label: 'Aracıma göre', fieldLabel: 'Ne lazım?', placeholder: 'Örn. 60.000 km bakımı', popular: ['Periyodik bakım', 'Triger seti', 'Yağ değişimi', 'Muayene öncesi kontrol', 'Kış lastiği']},
];
export const homeVehicles = ['Volkswagen Golf · 2018', 'Renault Clio · 2020', 'Fiat Egea · 2021', 'Togg T10X · 2024'];
export const homeLocations = ['Kadıköy, İstanbul', 'Ataşehir, İstanbul', 'Ümraniye, İstanbul', 'Maltepe, İstanbul', 'Üsküdar, İstanbul'];

export interface HomeCounter {value: number; prefix?: string; label: string; accent?: boolean}
export const homeCounters: HomeCounter[] = [
  {value: 41, label: 'ilde servis ağı', accent: true},
  {value: 20, label: 'hizmet kategorisi'},
  {value: 0, label: 'üyelik zorunluluğu'},
  {value: 100, prefix: '%', label: 'etiketli sponsorlu içerik'},
];

/* Categories bento (109:30) */
export type HomeCategoryIcon = 'wrench' | 'sparkles' | 'brush' | 'tyre' | 'zap' | 'bike';
export interface HomeCategory {name: string; text: string; icon: HomeCategoryIcon; tone: 'sky' | 'lime' | 'orange'}
export const homeFeaturedCategory = {name: 'Mekanik Servis', text: 'Periyodik bakım, motor, fren, şanzıman', badge: 'En çok aranan', photo: '/v2/home/cat-mechanic.jpg'};
export const homeCategories: HomeCategory[] = [
  {name: 'Oto Kuaför', text: 'Yıkama, pasta cila, seramik kaplama', icon: 'sparkles', tone: 'sky'},
  {name: 'Kaporta & Boya', text: 'Göçük, boyasız düzeltme, lokal boya', icon: 'brush', tone: 'orange'},
  {name: 'Lastik & Jant', text: 'Değişim, balans, rot ayarı', icon: 'tyre', tone: 'lime'},
  {name: 'Elektrik & Elektronik', text: 'Akü, arıza tespit, hibrit ve EV', icon: 'zap', tone: 'orange'},
  {name: 'Motosiklet', text: 'Bakım, lastik, aksesuar montajı', icon: 'bike', tone: 'sky'},
];
export const homeMoreCategories = {count: 14, title: 'kategori daha', text: 'Cam, film, klima, ekspertiz ve diğerleri'};

/* Belirti Bulucu (109:138) */
export interface HomeSymptom {id: string; label: string; category: string; system: string; parts: string[]}
export const homeSymptoms: HomeSymptom[] = [
  {id: 'fren-sesi', label: 'Frenden ses geliyor', category: 'Mekanik Servis', system: 'Fren sistemi', parts: ['Balata', 'Fren diski']},
  {id: 'ariza-lambasi', label: 'Motor arıza lambası yandı', category: 'Elektrik & Elektronik', system: 'Arıza tespiti', parts: ['Arıza tespit', 'Sensör']},
  {id: 'direksiyon-titreme', label: 'Direksiyon titriyor', category: 'Mekanik Servis', system: 'Yürüyen aksam', parts: ['Rot · balans']},
  {id: 'klima', label: 'Klima soğutmuyor', category: 'Klima', system: 'Klima sistemi', parts: ['Klima gazı', 'Kompresör']},
  {id: 'saga-cekme', label: 'Araç sağa çekiyor', category: 'Lastik & Jant', system: 'Rot ayarı', parts: ['Rot ayarı', 'Lastik basıncı']},
  {id: 'aku', label: 'Akü çabuk bitiyor', category: 'Elektrik & Elektronik', system: 'Şarj sistemi', parts: ['Akü', 'Alternatör']},
  {id: 'egzoz-duman', label: 'Egzozdan duman geliyor', category: 'Mekanik Servis', system: 'Motor', parts: ['Conta', 'Turbo']},
  {id: 'vites', label: 'Vites geçişi sert', category: 'Mekanik Servis', system: 'Şanzıman', parts: ['Debriyaj', 'Şanzıman yağı']},
];
export const homeSymptomDefault = ['fren-sesi', 'direksiyon-titreme'];
export const homeSymptomArea = 'Kadıköy';
export const homeCategoryStats: Record<string, {count: number; nearest: string; open: number}> = {
  'Mekanik Servis': {count: 14, nearest: '1,2 km', open: 9},
  'Elektrik & Elektronik': {count: 8, nearest: '1,8 km', open: 5},
  'Klima': {count: 6, nearest: '3,9 km', open: 4},
  'Lastik & Jant': {count: 11, nearest: '2,1 km', open: 8},
};

/* Keşif · liste + harita (111:104). Ids refer to app/data/mock/businesses.ts. */
export const homeDiscoveryArea = 'Kadıköy';
export const homeDiscoveryFilters = [
  {id: 'open', label: 'Şu an açık'},
  {id: 'verified', label: 'Doğrulanmış'},
  {id: 'rating', label: '4,5 ve üzeri'},
  {id: 'booking', label: 'Randevu alınır'},
  {id: 'photo', label: 'Fotoğraflı'},
] as const;
export type HomeDiscoveryFilter = (typeof homeDiscoveryFilters)[number]['id'];
export const homeDiscoverySorts = [
  {id: 'recommended', label: 'Önerilen sıralama'},
  {id: 'distance', label: 'En yakın'},
  {id: 'rating', label: 'En yüksek puan'},
] as const;
export type HomeDiscoverySort = (typeof homeDiscoverySorts)[number]['id'];
/** Recommended order of the list. */
export const homeDiscoveryOrder = ['ornek-teknik-garaj', 'ornek-togg-yetkili', 'ornek-kaporta-boya', 'ornek-klima-servis', 'ornek-atasehir-ekspertiz', 'ornek-lastik-rot', 'ornek-oto-elektrik', 'ornek-sanayi-motor'];
/** Pin positions on the 600 × 706 mock map, in px (Figma 111:306). */
export const homeMapPins: Record<string, {x: number; y: number}> = {
  'ornek-teknik-garaj': {x: 262, y: 330},
  'ornek-togg-yetkili': {x: 96, y: 138},
  'ornek-kaporta-boya': {x: 420, y: 232},
  'ornek-lastik-rot': {x: 516, y: 402},
  'ornek-atasehir-ekspertiz': {x: 196, y: 536},
  'ornek-klima-servis': {x: 440, y: 556},
  'ornek-oto-elektrik': {x: 110, y: 470},
  'ornek-sanayi-motor': {x: 470, y: 120},
};
/** Card photos used on the home list (Figma shows different shots than the shared mock). */
export const homeListPhotos: Record<string, string> = {
  'ornek-togg-yetkili': '/v2/home/car-ev.jpg',
  'ornek-kaporta-boya': '/v2/home/car-detail.jpg',
};
/** Services that take bookings ("Randevu alınır" filter). */
export const homeBookable = ['ornek-teknik-garaj', 'ornek-togg-yetkili', 'ornek-klima-servis', 'ornek-atasehir-ekspertiz'];

/* Teklif (112:211) */
export const homeQuoteSteps = [
  {title: 'Aracını seç', text: 'Marka, model, yıl. Garajındaysa tek dokunuş.'},
  {title: 'İşi anlat', text: 'Listeden seç ya da kendi cümlenle yaz, fotoğraf ekle.'},
  {title: 'Teklifleri karşılaştır', text: 'Fiyat, puan, mesafe ve randevu saatini yan yana gör.'},
];
export const homeQuoteRequest = {title: 'Fren balatası değişimi', vehicle: 'Volkswagen Golf · 2018 · Kadıköy'};
export interface HomeQuoteOffer {id: string; name: string; rating: string; distance: string; earliest: string; badge: string; tone: 'sky' | 'lime' | 'orange'; price: string; photo: string}
export const homeQuoteOffers: HomeQuoteOffer[] = [
  {id: 'teknik', name: 'Örnek Teknik Garaj', rating: '4,5', distance: '1,2 km', earliest: 'Yarın 10.30', badge: 'En yakın', tone: 'sky', price: '₺3.450', photo: '/v2/workshop.jpg'},
  {id: 'fren', name: 'Örnek Fren Atölyesi', rating: '4,7', distance: '2,8 km', earliest: 'Bugün 16.00', badge: 'En uygun', tone: 'lime', price: '₺3.250', photo: '/v2/home/cat-mechanic.jpg'},
  {id: 'yetkin', name: 'Örnek Yetkin Oto', rating: '4,9', distance: '5,1 km', earliest: 'Cuma 09.00', badge: 'En yüksek puan', tone: 'orange', price: '₺3.900', photo: '/v2/home/car-detail.jpg'},
];
export const homeQuoteDefaultOffer = 'fren';

/* Garajım (112:321) */
export const homeGarageBullets = ['Muayene, sigorta ve bakım hatırlatmaları', 'Servis geçmişi tek yerde', 'Aracına uygun servis önerileri'];
export const homeGarageVehicle = {plate: '34 ABC 123', name: 'Volkswagen Golf 1.6 TDI', detail: '2018 · Dizel · 86.400 km'};
export interface HomeReminder {id: string; title: string; detail: string; remaining: number; tone: 'orange' | 'amber' | 'green'; on: boolean}
/** `remaining` is the share of the interval left (0–1); the ring fills by it. */
export const homeGarageReminders: HomeReminder[] = [
  {id: 'muayene', title: 'Araç muayenesi', detail: '42 gün kaldı · 29 Aralık', remaining: 0.78, tone: 'orange', on: true},
  {id: 'yag', title: 'Yağ ve filtre bakımı', detail: '1.200 km sonra', remaining: 0.86, tone: 'amber', on: true},
  {id: 'sigorta', title: 'Trafik sigortası', detail: '3 ay kaldı · 18 Şubat', remaining: 0.6, tone: 'green', on: true},
  {id: 'kis-lastigi', title: 'Kış lastiğine geçiş', detail: '24 gün kaldı · 1 Aralık', remaining: 0.3, tone: 'orange', on: false},
];
export const homeGarageTip = {title: 'Muayene öncesi kontrol', text: 'Yakınında 6 servis bu işi yapıyor'};

/* Yorumlar (113:253) */
export const homeReviews: MockReview[] = [
  {id: 'r1', label: 'Teklifle geldi', rating: 5, text: 'Frenden gelen sesi tarif ettim, iki servis aynı gün teklif verdi. Fiyatı önceden bildiğim için içim rahat gitti.', business: 'Örnek Teknik Garaj', author: 'Elif A.', initials: 'EA', meta: 'Kadıköy · Volkswagen Golf', avatarColor: 'var(--sky-200)'},
  {id: 'r2', label: 'Fotoğraflı yorum', rating: 5, text: 'Seramik kaplama için üç yeri karşılaştırdım. Fotoğraflı yorumlar karar vermemi çok kolaylaştırdı.', business: 'Örnek Ümraniye Detay Atölyesi', author: 'Mert K.', initials: 'MK', meta: 'Ümraniye · BMW 3 Serisi', withPhoto: true, avatarColor: 'var(--orange-100)'},
  {id: 'r3', label: 'Garajım', rating: 5, text: 'Muayene hatırlatması gelmese tarihi kaçıracaktım. Öncesinde yakınımdaki serviste kontrol yaptırdım.', business: 'Örnek Elektrikli Araç Merkezi', author: 'Zeynep T.', initials: 'ZT', meta: 'Maltepe · Togg T10X', avatarColor: 'var(--lime-100)'},
  {id: 'r4', label: 'Üyeliksiz', rating: 5, text: 'Üye olmadan arayıp yol tarifi alabildim. Yolda kalınca en çok buna ihtiyacın oluyor.', business: 'Örnek Kartal Klima Atölyesi', author: 'Burak D.', initials: 'BD', meta: 'Kartal · Renault Clio', avatarColor: 'var(--cream-100)'},
  {id: 'r5', label: 'Üyeliksiz', rating: 4, text: 'Akü sorunu için gittim, önce ölçüm yaptılar ve gereksiz değişim önermediler. Süreci adım adım anlattılar.', business: 'Örnek Oto Elektrik', author: 'Selin Y.', initials: 'SY', meta: 'Kadıköy · Fiat Egea', avatarColor: 'var(--sky-200)'},
  {id: 'r6', label: 'Fotoğraflı yorum', rating: 5, text: 'Belirti Bulucu doğru kategoriye yönlendirdi; rot balans ayarından sonra direksiyondaki titreme geçti.', business: 'Örnek Lastik & Rot', author: 'Can Ö.', initials: 'CÖ', meta: 'Maltepe · Toyota Corolla', withPhoto: true, avatarColor: 'var(--orange-100)'},
  {id: 'r7', label: 'Teklifle geldi', rating: 5, text: 'İkinci el araç almadan önce ekspertiz yaptırdım. Rapor açık ve anlaşılırdı, boya ölçümünü birlikte inceledik.', business: 'Örnek Ataşehir Ekspertiz', author: 'Deniz K.', initials: 'DK', meta: 'Ataşehir · Hyundai i20', avatarColor: 'var(--lime-100)'},
  {id: 'r8', label: 'Garajım', rating: 4, text: 'Klima gazı dolumu kısa sürdü. Randevu saatine uydular, beklemeden araç teslim edildi.', business: 'Örnek Klima Servis', author: 'Ayşe B.', initials: 'AB', meta: 'Üsküdar · Opel Corsa', avatarColor: 'var(--cream-100)'},
  {id: 'r9', label: 'Fotoğraflı yorum', rating: 5, text: 'Kapıdaki göçük için boyasız düzeltme yaptılar. Önce ve sonra fotoğraflarını paylaştılar.', business: 'Örnek Kaporta & Boya', author: 'Emre S.', initials: 'ES', meta: 'Ümraniye · Renault Megane', withPhoto: true, avatarColor: 'var(--sky-200)'},
  {id: 'r10', label: 'Teklifle geldi', rating: 5, text: 'Karşılaştırma ekranında üç servisi yan yana görmek işimi çok kolaylaştırdı.', business: 'Örnek Teknik Garaj', author: 'Gizem L.', initials: 'GL', meta: 'Kadıköy · Peugeot 2008', avatarColor: 'var(--orange-100)'},
  {id: 'r11', label: 'Üyeliksiz', rating: 4, text: 'Şanzıman yağı değişimi için gittim; işlem öncesi fiyatı net söylediler, sürpriz çıkmadı.', business: 'Örnek Sanayi Motor', author: 'Kerem A.', initials: 'KA', meta: 'Kartal · Ford Focus', avatarColor: 'var(--lime-100)'},
  {id: 'r12', label: 'Garajım', rating: 5, text: 'Elektrikli aracım için batarya kontrolünü bilen bir yer bulmak zordu. Burada hızlıca buldum.', business: 'Örnek Elektrikli Araç Servisi', author: 'Nazlı E.', initials: 'NE', meta: 'Ataşehir · BYD Atto 3', avatarColor: 'var(--cream-100)'},
];

/* Rehber + mini test (113:386) */
export interface HomeGuide {id: string; number: string; readTime: string; topic: string; title: string; tone: 'sky' | 'orange' | 'lime'; to: string}
export const homeGuides: HomeGuide[] = [
  {id: 'ekspertiz', number: '01', readTime: '3 dk okuma', topic: 'Ekspertiz', title: 'Ekspertizde nelere bakılır?', tone: 'sky', to: '/rehber/ekspertiz'},
  {id: 'bakim', number: '02', readTime: '2 dk okuma', topic: 'Bakım', title: 'Periyodik bakım ne zaman yapılır?', tone: 'orange', to: '/rehber/periyodik-bakim'},
  {id: 'yorumlar', number: '03', readTime: '2 dk okuma', topic: 'Yorumlar', title: 'Yorumları nasıl okumalı?', tone: 'lime', to: '/rehber/yorumlar'},
];
export const homeGuidesAllTo = '/rehber';
export interface HomeQuizQuestion {question: string; options: string[]; correct: number; guide: string}
/** Five quick questions; the guide of the first wrong answer (or the first guide) is suggested at the end. */
export const homeQuiz: HomeQuizQuestion[] = [
  {question: 'Motor yağı ne sıklıkla değişmeli?', options: ['Her 5.000 km’de', 'Üreticinin önerdiği aralıkta', 'Yalnızca uyarı lambası yanınca'], correct: 1, guide: 'bakim'},
  {question: 'İkinci el araç alırken ilk adım ne olmalı?', options: ['Bağımsız ekspertiz', 'Yalnızca test sürüşü', 'Satıcının beyanı'], correct: 0, guide: 'ekspertiz'},
  {question: 'Bir servisin yorumlarında en çok neye bakmalı?', options: ['Yalnızca yıldız sayısı', 'En eski yorumlar', 'Güncel ve ayrıntılı yorumlar'], correct: 2, guide: 'yorumlar'},
  {question: 'Lastik basıncı ne zaman ölçülmeli?', options: ['Lastikler soğukken', 'Uzun yoldan hemen sonra', 'Yılda bir kez'], correct: 0, guide: 'bakim'},
  {question: 'Boya ölçümü ekspertizde neyi gösterir?', options: ['Motor sağlığını', 'Boyalı ya da değişen parçaları', 'Yakıt tüketimini'], correct: 1, guide: 'ekspertiz'},
];

/* İşletmeler için (113:463) */
export const homeBusinessPanel = {
  views: 128,
  change: '+%18',
  bars: [
    {day: 'Pt', height: 34}, {day: 'Sa', height: 52}, {day: 'Ça', height: 40}, {day: 'Pe', height: 66},
    {day: 'Cu', height: 58}, {day: 'Ct', height: 84}, {day: 'Pz', height: 72},
  ],
  peak: 5,
  stats: ['14 arama', '9 yol tarifi', '3 teklif'],
};
