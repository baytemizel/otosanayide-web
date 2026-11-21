<script setup lang="ts">
import {computed} from 'vue';
import {ArrowRight, CalendarCheck, Info, RotateCcw} from '@lucide/vue';
import {useLocale} from '~/composables/useLocale';
import {formatMoney, type OfferCardView, type OfferStatus} from '~/lib/v2/requests';

// "Ön teklif" card (W15): line items, estimated total, decision buttons.
// Interaction note 07: the chosen offer stands out with an orange frame (`highlighted`).
// Live mode: `busy` disables the buttons while a decision is sent, `undoable` is off (the API has
// no undo), an appointment offer shows the proposed time instead of line items.
const props = withDefaults(defineProps<{
  offer: OfferCardView;
  status: OfferStatus;
  highlighted?: boolean;
  busy?: boolean;
  undoable?: boolean;
  bookingTo?: string | null;
  /** Shown when the offer is rejected; empty: the demo sentence "Bu teklifi reddettin…". */
  rejectedText?: string;
}>(), {highlighted: false, busy: false, undoable: true, bookingTo: undefined, rejectedText: ''});
const emit = defineEmits<{accept: []; reject: []; undo: []}>();
const {t, localeTag} = useLocale();
const appointment = computed(() => props.offer.kind === 'appointment');
const total = computed(() => formatMoney(props.offer.lines.reduce((sum, line) => sum + line.amount, 0), localeTag.value));
const rejected = computed(() => props.rejectedText || t('Bu teklifi reddettin. İşletmeye bildirim gitti.'));
/** "Önerilen saat: {time} · Türkiye saati" split around {time}, so the time can be bold. */
const slotParts = computed(() => t('Önerilen saat: {time} · Türkiye saati').split('{time}'));
const booking = computed(() => (props.bookingTo === undefined ? `/randevu?servis=${props.offer.businessId}&teklif=${props.offer.id}` : props.bookingTo));
</script>

<template>
  <section class="quote" :class="{highlighted, rejected: status === 'rejected'}" aria-labelledby="quote-title">
    <div class="top">
      <h2 id="quote-title" class="t-h4">{{ t('Ön teklif') }}</h2>
      <p class="t-body-sm t-muted">{{ t('Geçerlilik: {date}', {date: offer.validUntil}) }}</p>
    </div>
    <p v-if="appointment && offer.startsAtText" class="slot"><CalendarCheck :size="18" aria-hidden="true"/>{{ slotParts[0] }}<strong>{{ offer.startsAtText }}</strong>{{ slotParts[1] }}</p>
    <table v-if="offer.lines.length" class="lines">
      <thead>
        <tr class="t-mono-sm t-muted"><th scope="col" class="c-item">{{ t('KALEM') }}</th><th scope="col">{{ t('AÇIKLAMA') }}</th><th scope="col" class="c-amount">{{ t('TUTAR') }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="line in offer.lines" :key="line.item">
          <th scope="row" class="c-item t-label-md">{{ line.item }}</th>
          <td class="t-body-sm desc">{{ line.description }}</td>
          <td class="c-amount amount">{{ formatMoney(line.amount, localeTag) }}</td>
        </tr>
      </tbody>
    </table>
    <div v-if="offer.lines.length" class="total">
      <span class="t-label-md">{{ t('Toplam (tahmini)') }}</span>
      <strong class="total-value">{{ total }}</strong>
    </div>
    <p class="note"><Info :size="16" aria-hidden="true"/>{{ offer.note }}</p>
    <p v-for="line in offer.notes ?? []" :key="line" class="note extra">{{ line }}</p>
    <div class="actions">
      <template v-if="status === 'pending'">
        <button type="button" class="btn btn-primary" :disabled="busy || offer.expired" @click="emit('accept')">{{ appointment ? t('Saati kabul et') : bookingTo === null ? t('Teklifi kabul et') : t('Kabul et, randevu al') }}<ArrowRight aria-hidden="true"/></button>
        <button type="button" class="btn btn-outline" :disabled="busy" @click="emit('reject')">{{ t('Reddet') }}</button>
      </template>
      <template v-else-if="status === 'accepted'">
        <NuxtLink v-if="booking && !appointment" :to="booking" class="btn btn-primary">{{ t('Randevu zamanı seç') }}<ArrowRight aria-hidden="true"/></NuxtLink>
        <p v-else class="t-body-sm t-muted">{{ appointment ? t('Randevun kesinleşti. Bu ekranda ödeme alınmaz.') : t('Teklifi kabul ettin. İşletme seninle bu talep üzerinden iletişime geçer.') }}</p>
      </template>
      <template v-else>
        <p class="t-body-sm t-muted">{{ rejected }}</p>
        <button v-if="undoable" type="button" class="btn btn-outline btn-sm" @click="emit('undo')"><RotateCcw aria-hidden="true"/>{{ t('Geri al') }}</button>
      </template>
    </div>
  </section>
</template>

<style scoped>
.quote{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:14px;padding:28px;background:var(--white);border:1px solid var(--cream-200);border-radius:28px;transition:border-color .15s ease,box-shadow .15s ease}
.quote.highlighted{border:2px solid var(--orange-500);padding:27px;box-shadow:0 0 0 4px rgba(243,107,33,.12)}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:6px}
.lines{width:100%;border-collapse:collapse}
.lines th,.lines td{padding:10px 0;text-align:left;vertical-align:middle}
.lines thead th{font-weight:500;padding-bottom:24px;border-bottom:1px solid var(--cream-200)}
.lines tbody tr:first-child th,.lines tbody tr:first-child td{padding-top:24px}
.lines tbody th,.lines tbody td{padding-bottom:24px}
.lines tbody tr:last-child th,.lines tbody tr:last-child td{padding-bottom:10px}
.c-item{width:96px;padding-right:16px!important;color:var(--ink-900)}
.desc{color:var(--ink-700);padding-right:16px!important}
.c-amount{text-align:right!important;white-space:nowrap}
.amount{font-weight:700;font-size:15px;line-height:1.2;color:var(--ink-900)}
.total{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 18px;background:var(--cream-50);border:1px solid var(--cream-200);border-radius:18px;color:var(--ink-900)}
.total-value{font-weight:700;font-size:26px;line-height:1.2}
.note{display:flex;align-items:flex-start;gap:8px;font-size:13px;line-height:1.45;color:var(--ink-500);max-width:464px}
.note svg{flex:none;margin-top:1px}
.note.extra{padding-left:24px}
.slot{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:16px 18px;background:var(--cream-50);border:1px solid var(--cream-200);border-radius:18px;font-size:15px;color:var(--ink-800)}
.slot svg{color:var(--green-500)}
.actions{display:flex;flex-wrap:wrap;align-items:center;gap:12px;padding-top:8px}
.rejected .total-value{text-decoration:line-through;color:var(--ink-500)}
@media (max-width:760px){
  .quote{padding:22px}
  .quote.highlighted{padding:21px}
  .c-item{width:72px}
  .total-value{font-size:22px}
}
</style>
