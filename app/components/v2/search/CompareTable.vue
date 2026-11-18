<script setup lang="ts">
import {computed} from 'vue';
import {Check, MapPin, Plus, ShieldCheck} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import {formatKm, formatRating} from '~/data/mock/businesses';
import {paymentLabels, sameText} from '~/data/mock/search';
import type {CompareColumn} from '~/lib/v2/compare';

// "Karşılaştırma tablosu" (Figma 122:664). Rows are built from the declared facts of each business;
// a missing fact is "Bilinmiyor", never "yok". "EN İYİ" marks the best rating and the shortest distance.
// Live columns come from the profile endpoint; a row the API has no data for reads "Bilgi yok".
const props = defineProps<{items: CompareColumn[]; max: number; live?: boolean}>();

type Answer = 'yes' | 'no' | 'unknown' | 'none';
const placeholders = computed(() => Math.max(0, props.max - props.items.length));
const columns = computed(() => props.items.length + placeholders.value);

const rated = computed(() => props.items.filter((b) => (b.reviews?.count ?? 0) > 0));
const bestRating = computed(() => (props.items.length > 1 && rated.value.length ? Math.max(...rated.value.map((b) => b.reviews!.average)) : null));
const distances = computed(() => props.items.map((b) => b.distanceKm).filter((d): d is number => d !== null));
const bestDistance = computed(() => (props.items.length > 1 && distances.value.length ? Math.min(...distances.value) : null));

// The service and brand rows follow the first business, like the Figma example (Boyasız göçük, BMW).
const ignoredBrands = ['Tüm markalar', 'Marka bilgisi yok'];
const service = computed(() => props.items[0]?.category ?? '');
const brand = computed(() => props.items.flatMap((b) => b.brands).find((b) => !ignoredBrands.includes(b)) ?? '');

const offers = (b: CompareColumn, s: string): Answer => (b.services.some((x) => sameText(x, s)) || sameText(b.category, s) ? 'yes' : 'unknown');
const card = (b: CompareColumn): Answer => (b.card === true ? 'yes' : b.card === false ? 'no' : props.live ? 'none' : 'unknown');
const factRows = computed(() => [
  ...(service.value ? [{label: service.value, answer: (b: CompareColumn) => offers(b, service.value)}] : []),
  ...(brand.value ? [{label: `${brand.value} uzmanlığı (beyan)`, answer: (b: CompareColumn): Answer => (b.brands.some((x) => sameText(x, brand.value)) ? 'yes' : 'unknown')}] : []),
  {label: paymentLabels.kart.row, answer: card},
]);

const offerText = (b: CompareColumn) => [b.quote && 'Teklif', b.appointment && 'Randevu'].filter(Boolean).join(' · ');
const tel = (b: CompareColumn) => `tel:${b.phone.replace(/\s/g, '')}`;
</script>

<template>
  <div class="scroller">
    <table class="compare" :style="{'--cols': columns}">
      <caption class="sr-only">İşletme karşılaştırması</caption>
      <colgroup><col class="label-col"><col v-for="n in columns" :key="n"></colgroup>
      <thead>
        <tr>
          <td class="label head-label"><span class="t-mono-sm t-muted">Özellik</span></td>
          <th v-for="b in items" :key="b.id" scope="col" class="cell head">
            <img v-if="b.photo" :src="b.photo" alt="" class="photo">
            <span v-else class="photo empty"><MapPin :size="24" aria-hidden="true"/><span class="t-mono-sm t-muted">Fotoğraf yok</span></span>
            <span class="name">{{ b.name }}</span>
            <V2Button variant="outline" :to="`/servis/${b.id}`" arrow>Profili aç</V2Button>
          </th>
          <td v-for="n in placeholders" :key="`add-${n}`" class="cell head">
            <NuxtLink to="/ara" class="photo add"><Plus :size="24" aria-hidden="true"/><span class="t-label-sm">İşletme ekle</span></NuxtLink>
          </td>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row" class="label">Puan</th>
          <td v-for="b in items" :key="b.id" class="cell">
            <span v-if="!b.reviews" class="value none">Bilgi yok</span>
            <span v-else-if="b.reviews.count" class="value">★ {{ formatRating(b.reviews.average) }} ({{ b.reviews.count }})<span v-if="bestRating === b.reviews.average" class="best">En iyi</span></span>
            <span v-else class="value none">Henüz yorum yok</span>
          </td>
          <td v-for="n in placeholders" :key="`p-${n}`" class="cell"/>
        </tr>
        <tr>
          <th scope="row" class="label">Mesafe (kuş uçuşu)</th>
          <td v-for="b in items" :key="b.id" class="cell">
            <span v-if="b.distanceKm === null" class="value none">Bilgi yok</span>
            <span v-else class="value">{{ formatKm(b.distanceKm) }}<span v-if="bestDistance === b.distanceKm" class="best">En iyi</span></span>
          </td>
          <td v-for="n in placeholders" :key="`p-${n}`" class="cell"/>
        </tr>
        <tr>
          <th scope="row" class="label">Sahiplik</th>
          <td v-for="b in items" :key="b.id" class="cell">
            <span v-if="b.ownership === 'verified'" class="own lime"><ShieldCheck :size="14" aria-hidden="true"/>Doğrulanmış</span>
            <span v-else-if="b.ownership === 'claimed'" class="own">Sahiplenilmiş</span>
            <span v-else class="own">Sahiplenilmedi</span>
          </td>
          <td v-for="n in placeholders" :key="`p-${n}`" class="cell"/>
        </tr>
        <tr v-for="row in factRows" :key="row.label">
          <th scope="row" class="label">{{ row.label }}</th>
          <td v-for="b in items" :key="b.id" class="cell">
            <span v-if="row.answer(b) === 'yes'" class="value"><span class="mark yes"><Check :size="12" :stroke-width="3" aria-hidden="true"/></span>Evet</span>
            <span v-else-if="row.answer(b) === 'no'" class="value"><span class="mark" aria-hidden="true">–</span>Hayır</span>
            <span v-else-if="row.answer(b) === 'none'" class="value none">Bilgi yok</span>
            <span v-else class="value none"><span class="mark" aria-hidden="true">?</span>Bilinmiyor</span>
          </td>
          <td v-for="n in placeholders" :key="`p-${n}`" class="cell"/>
        </tr>
        <tr>
          <th scope="row" class="label">Şu an</th>
          <td v-for="b in items" :key="b.id" class="cell">
            <span v-if="b.hours.known" class="value"><span v-if="b.hours.open !== null" class="dot" :class="{closed: !b.hours.open}" aria-hidden="true"/>{{ b.hours.text }}</span>
            <span v-else class="value none">Saat bilgisi yok</span>
          </td>
          <td v-for="n in placeholders" :key="`p-${n}`" class="cell"/>
        </tr>
        <tr>
          <th scope="row" class="label">Teklif / randevu</th>
          <td v-for="b in items" :key="b.id" class="cell">
            <span v-if="offerText(b)" class="value">{{ offerText(b) }}</span>
            <span v-else class="value none" aria-label="Yok">—</span>
          </td>
          <td v-for="n in placeholders" :key="`p-${n}`" class="cell"/>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td class="label"/>
          <td v-for="b in items" :key="b.id" class="cell foot">
            <V2Button v-if="b.quote" :to="`/talep?isletme=${b.id}`" arrow>Teklif iste</V2Button>
            <V2Button v-else-if="b.phone" variant="outline" :href="tel(b)" arrow>Ara</V2Button>
            <V2Button v-else variant="outline" :to="`/servis/${b.id}`" arrow>Profili aç</V2Button>
          </td>
          <td v-for="n in placeholders" :key="`p-${n}`" class="cell foot"/>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<style scoped>
.scroller{overflow-x:auto;background:var(--white);border:1px solid var(--cream-200);border-radius:28px}
.compare{width:100%;min-width:880px;border-collapse:collapse;table-layout:fixed}
.label-col{width:220px}
.label{padding:18px 0 18px 28px;text-align:left;font-weight:600;font-size:14px;line-height:1.45;color:var(--ink-700);vertical-align:middle;white-space:nowrap}
.cell{padding:18px 0 18px 24px;text-align:left;vertical-align:middle;font-weight:400}
.cell:last-child{padding-right:24px}
thead .label,thead .cell{padding-top:24px;padding-bottom:24px;vertical-align:bottom}
.head-label{line-height:1}
.head{font:inherit}
.head > *{display:block}
.head > * + *{margin-top:14px}
.head :deep(.btn){display:inline-flex}
.photo{width:100%;height:150px;border-radius:20px;object-fit:cover}
.photo.empty,.photo.add{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;background:var(--cream-100);color:var(--ink-500)}
.photo.add{background:var(--cream-50);border:1.5px dashed var(--cream-200);color:var(--ink-700)}
.photo.add:hover{border-color:var(--ink-300)}
.name{font-family:var(--font-display);font-weight:700;font-size:20px;line-height:1.2;letter-spacing:-.01em;color:var(--ink-900);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
tr{background:var(--white)}
tbody tr:nth-child(odd){background:var(--cream-50)}
.value{display:inline-flex;align-items:center;gap:8px;font-weight:600;font-size:15px;line-height:1.2;color:var(--ink-900)}
.value.none{font-weight:400;line-height:1.5;color:var(--ink-500)}
.best{padding:3px 8px;border-radius:999px;background:var(--lime-400);font-family:var(--font-mono);font-weight:700;font-size:10px;line-height:1.3;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-900)}
.own{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;background:var(--cream-100);font-weight:600;font-size:13px;line-height:1.2;color:var(--ink-800)}
.own.lime{padding-left:9px;background:var(--lime-100)}
.own.lime :deep(svg){color:var(--green-500)}
.mark{display:grid;place-items:center;flex:none;width:22px;height:22px;border-radius:999px;background:var(--cream-100);font-family:var(--font-mono);font-weight:700;font-size:11px;color:var(--ink-500)}
.mark.yes{background:var(--lime-400);color:var(--ink-900)}
.dot{width:7px;height:7px;border-radius:999px;background:var(--green-500)}
.dot.closed{background:var(--red-500)}
.foot{padding-top:22px;padding-bottom:24px}
@media (max-width:760px){
  .compare{min-width:660px}
  .label-col{width:136px}
  .label{position:sticky;left:0;z-index:1;padding-left:16px;background:inherit;white-space:normal}
  .cell{padding-left:16px}
}
</style>
