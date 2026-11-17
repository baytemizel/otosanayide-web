<script setup lang="ts">
import {computed, ref} from 'vue';
import {ArrowRight, Bell, ChevronLeft, ChevronRight, Info} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import RequestBusinessHead from '~/components/v2/requests/RequestBusinessHead.vue';
import RequestSuccessCard from '~/components/v2/requests/RequestSuccessCard.vue';
import {useMockSession} from '~/composables/useMockSession';
import {
  DEFAULT_REQUEST_BUSINESS_ID, appointmentClosedWeekdays, appointmentDefault, appointmentFirstWeek, appointmentSlotTimes,
  appointmentTaken, appointmentWeekCount, formatTry, mockOfferById, mockRequests, offerTotal, requestBusiness,
} from '~/data/mock/requests';

// W16 · Randevu · Zaman seçimi (Figma 126:951). Week strip + time grid; "Randevu talebi gönder" shows a
// mock success state. ?servis=<id> picks the business, ?teklif=<id> fills service, vehicle and amount.
const session = useMockSession();
if (!session.signedIn.value) session.signIn();

useSeoMeta({title: 'Randevu al'});

const route = useRoute();
const router = useRouter();

const business = computed(() => requestBusiness(String(route.query.servis ?? '')) ?? requestBusiness(DEFAULT_REQUEST_BUSINESS_ID)!);
const context = computed(() => {
  const byId = mockOfferById(String(route.query.teklif ?? ''));
  if (byId) return byId;
  for (const request of mockRequests) {
    const offer = request.offers.find((item) => item.businessId === business.value.id);
    if (offer) return {request, offer};
  }
  return undefined;
});
const serviceLabel = computed(() => context.value?.request.service ?? business.value.tags[0] ?? business.value.category);
const vehicleLabel = computed(() => (context.value?.request.vehicle === 'Renault Clio' ? 'Renault Clio · 2021' : 'BMW 320i · 2019'));
const amount = computed(() => (context.value ? formatTry(offerTotal(context.value.offer)) : ''));

/* Calendar (dates are handled in UTC so server and client agree). */
const DAY = 86_400_000;
const firstMonday = Date.parse(`${appointmentFirstWeek}T00:00:00Z`);
const iso = (time: number) => new Date(time).toISOString().slice(0, 10);
const fmt = (date: string, options: Intl.DateTimeFormatOptions) => new Date(`${date}T00:00:00Z`).toLocaleDateString('tr-TR', {timeZone: 'UTC', ...options});

const weekIndex = ref(Math.max(0, Math.floor((Date.parse(`${appointmentDefault.date}T00:00:00Z`) - firstMonday) / (7 * DAY))));
const selectedDate = ref(appointmentDefault.date);
const selectedTime = ref<string | null>(appointmentDefault.time);
const submitted = ref(false);

interface Day { date: string; short: string; num: string; closed: boolean; free: number }
const days = computed<Day[]>(() => Array.from({length: 6}, (_, offset) => {
  const date = iso(firstMonday + (weekIndex.value * 7 + offset) * DAY);
  const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
  const closed = appointmentClosedWeekdays.includes(weekday);
  return {
    date,
    short: fmt(date, {weekday: 'short'}).replace('.', '').toLocaleUpperCase('tr-TR'),
    num: String(Number(date.slice(8, 10))),
    closed,
    free: closed ? 0 : appointmentSlotTimes.length - appointmentTaken(date).length,
  };
}));
const monthTitle = computed(() => {
  const middle = days.value[2]!.date;
  const text = fmt(middle, {month: 'long', year: 'numeric'});
  return text.charAt(0).toLocaleUpperCase('tr-TR') + text.slice(1);
});
const taken = computed(() => new Set(appointmentTaken(selectedDate.value)));
const dayLong = computed(() => {
  const weekday = fmt(selectedDate.value, {weekday: 'long'});
  const dayMonth = fmt(selectedDate.value, {day: 'numeric', month: 'long'});
  return `${weekday} ${dayMonth}`;
});

function pickDay(day: Day) {
  if (day.closed) return;
  selectedDate.value = day.date;
  if (selectedTime.value && appointmentTaken(day.date).includes(selectedTime.value)) selectedTime.value = null;
}
function moveWeek(delta: number) {
  weekIndex.value = Math.min(appointmentWeekCount - 1, Math.max(0, weekIndex.value + delta));
}
function back() {
  if (import.meta.client && window.history.length > 1) router.back();
  else void navigateTo('/taleplerim');
}
function submit() {
  if (!selectedTime.value) return;
  submitted.value = true;
  if (import.meta.client) window.scrollTo({top: 0, behavior: 'smooth'});
}
</script>

<template>
  <div class="randevu">
    <header class="head v2-wrap">
      <p class="t-mono-md t-eyebrow">RANDEVU</p>
      <h1 class="t-h2">{{ submitted ? 'Randevu talebin gönderildi' : 'Randevu zamanı seç' }}</h1>
    </header>

    <div class="body v2-wrap">
      <RequestSuccessCard
        v-if="submitted"
        class="main"
        eyebrow="ONAY BEKLENİYOR"
        :title="`${dayLong} · ${selectedTime}`"
        :text="`${business.name} talebini onayladığında randevun kesinleşir. Onaylanınca bildirim ve takvim daveti gelir.`"
      >
        <template #actions>
          <V2Button to="/taleplerim" size="lg" arrow>Taleplerime dön</V2Button>
          <V2Button variant="outline" @click="submitted = false">Zamanı değiştir</V2Button>
        </template>
      </RequestSuccessCard>

      <form v-else class="main surface cal" @submit.prevent="submit">
        <div class="cal-head">
          <h2 class="t-h4" aria-live="polite">{{ monthTitle }}</h2>
          <span class="spacer"/>
          <button type="button" class="nav-btn" aria-label="Önceki hafta" :disabled="weekIndex === 0" @click="moveWeek(-1)"><ChevronLeft :size="18" aria-hidden="true"/></button>
          <button type="button" class="nav-btn" aria-label="Sonraki hafta" :disabled="weekIndex === appointmentWeekCount - 1" @click="moveWeek(1)"><ChevronRight :size="18" aria-hidden="true"/></button>
        </div>

        <div class="week" role="group" aria-label="Gün seç">
          <button
            v-for="day in days"
            :key="day.date"
            type="button"
            class="day"
            :class="{on: day.date === selectedDate, closed: day.closed}"
            :disabled="day.closed"
            :aria-pressed="day.date === selectedDate"
            :aria-label="`${fmt(day.date, {weekday: 'long', day: 'numeric', month: 'long'})}, ${day.closed ? 'kapalı' : `${day.free} uygun saat`}`"
            @click="pickDay(day)"
          >
            <span class="day-short">{{ day.short }}</span>
            <span class="day-num">{{ day.num }}</span>
            <span class="day-sub">{{ day.closed ? 'Kapalı' : day.date === selectedDate ? `${day.free} saat` : day.free ? 'Uygun' : 'Dolu' }}</span>
          </button>
        </div>

        <p id="slots-title" class="slots-title">{{ dayLong }} · Uygun saatler</p>
        <div class="slots" role="group" aria-labelledby="slots-title">
          <button
            v-for="time in appointmentSlotTimes"
            :key="time"
            type="button"
            class="slot"
            :class="{on: time === selectedTime, taken: taken.has(time)}"
            :disabled="taken.has(time)"
            :aria-pressed="time === selectedTime"
            :aria-label="taken.has(time) ? `${time}, dolu` : time"
            @click="selectedTime = time"
          >{{ time }}</button>
        </div>

        <ul class="legend t-body-sm t-muted" aria-hidden="true">
          <li><span class="swatch on"/>Seçili</li>
          <li><span class="swatch free"/>Uygun</li>
          <li><span class="swatch taken"/>Dolu</li>
        </ul>

        <p class="note"><Info :size="16" aria-hidden="true"/>Bu işletme talep onaylı randevu kullanır: talebin, işletme onayladığında kesinleşir.</p>

        <div class="actions">
          <V2Button variant="outline" @click="back">Geri</V2Button>
          <span class="spacer"/>
          <button type="submit" class="btn btn-primary btn-lg" :disabled="!selectedTime">Randevu talebi gönder<ArrowRight aria-hidden="true"/></button>
        </div>
      </form>

      <aside class="summary surface" aria-label="Randevu özeti">
        <h2 class="t-h4">Özet</h2>
        <RequestBusinessHead :business="business"/>
        <hr class="divider">
        <div class="row"><span class="t-body-sm t-muted">Hizmet</span><span class="t-label-sm">{{ serviceLabel }}</span></div>
        <div class="row"><span class="t-body-sm t-muted">Araç</span><span class="t-label-sm">{{ vehicleLabel }}</span></div>
        <div class="row"><span class="t-body-sm t-muted">Tarih</span><span class="t-label-sm">{{ dayLong }}</span></div>
        <div class="row"><span class="t-body-sm t-muted">Saat</span><span class="t-label-sm">{{ selectedTime ?? '—' }}</span></div>
        <hr class="divider">
        <div v-if="amount" class="row"><span class="t-body-sm t-muted">Tahmini tutar</span><strong class="amount">{{ amount }}</strong></div>
        <div v-else class="row"><span class="t-body-sm t-muted">Tahmini tutar</span><span class="t-label-sm">Ön incelemede netleşir</span></div>
        <p class="bell-note"><Bell :size="16" aria-hidden="true"/>Onaylanınca bildirim ve takvim daveti gelir.</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.head{display:flex;flex-direction:column;gap:12px;padding-top:48px}
.body{display:flex;align-items:flex-start;gap:32px;padding-top:36px;padding-bottom:104px}
.main{flex:1 1 0;min-width:0}
.cal{display:flex;flex-direction:column;gap:24px;padding:32px}
.cal-head{display:flex;align-items:center;gap:10px}
.spacer{flex:1}
.nav-btn{width:40px;height:40px;border-radius:999px;background:var(--cream-100);color:var(--ink-800);display:grid;place-items:center}
.nav-btn:disabled{opacity:.4;cursor:default}

.week{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px}
.day{display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 4px;background:var(--white);border:1px solid var(--cream-200);border-radius:20px;color:var(--ink-900);transition:border-color .15s ease,transform .15s ease}
.day:hover:not(:disabled){border-color:var(--ink-300);transform:translateY(-1px)}
.day-short{font-family:var(--font-mono);font-weight:500;font-size:11px;line-height:1.3;letter-spacing:.06em;color:var(--ink-500)}
.day-num{font-family:var(--font-display);font-weight:700;font-size:26px;line-height:1.2;letter-spacing:-.01em}
.day-sub{font-size:12px;line-height:1.45;color:var(--ink-500)}
.day.on{background:var(--ink-900);border-color:var(--ink-900);color:var(--white)}
.day.on .day-short{color:var(--lime-400)}
.day.on .day-sub{color:var(--white)}
.day.closed{background:var(--cream-50);cursor:not-allowed}
.day.closed .day-num{color:var(--ink-300)}

.slots-title{font-weight:600;font-size:17px;line-height:1.2;color:var(--ink-900)}
.slots{display:flex;flex-wrap:wrap;gap:12px}
.slot{width:112px;height:50px;border-radius:16px;background:var(--white);border:1px solid var(--cream-200);font-weight:600;font-size:15px;line-height:1.2;color:var(--ink-900);transition:border-color .15s ease}
.slot:hover:not(:disabled){border-color:var(--ink-900)}
.slot.taken{background:var(--cream-100);border-color:var(--cream-100);color:var(--ink-300);cursor:not-allowed}
.slot.on{background:var(--orange-500);border-color:var(--orange-500)}

.legend{display:flex;gap:18px;font-size:13px}
.legend li{display:flex;align-items:center;gap:6px}
.swatch{width:12px;height:12px;border-radius:999px}
.swatch.on{background:var(--orange-500)}
.swatch.free{background:var(--white);border:1px solid var(--cream-200)}
.swatch.taken{background:var(--cream-100)}

.note{display:flex;align-items:flex-start;gap:10px;padding:14px;background:var(--cream-50);border:1px solid var(--cream-200);border-radius:18px;font-size:13px;line-height:1.45;color:var(--ink-700)}
.note svg{flex:none;color:var(--ink-500);margin-top:1px}
.actions{display:flex;align-items:center}

.summary{width:380px;flex:none;display:flex;flex-direction:column;align-items:flex-start;gap:16px;padding:24px}
.summary .divider{width:100%}
.row{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%}
.row .t-label-sm{text-align:right;color:var(--ink-900)}
.amount{font-weight:700;font-size:20px;line-height:1.2;color:var(--ink-900)}
.bell-note{display:flex;align-items:flex-start;gap:10px;width:100%;padding:14px;background:var(--lime-100);border-radius:18px;font-size:13px;line-height:1.45;color:var(--ink-800)}
.bell-note svg{flex:none;margin-top:1px}

@media (max-width:1100px){
  .body{flex-direction:column;align-items:stretch}
  .summary{width:100%}
}
@media (max-width:760px){
  .head{padding-top:32px}
  .body{padding-top:24px;padding-bottom:64px;gap:20px}
  .cal{padding:20px;gap:20px}
  .week{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
  .slots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
  .slot{width:auto}
  .legend{flex-wrap:wrap}
  .actions .btn-lg{padding:16px 20px;font-size:15px}
}
</style>
