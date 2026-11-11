<script setup lang="ts">
import {computed} from 'vue';
import {ArrowRight, BadgeCheck, CreditCard, Heart, MapPin, MessageSquare, Navigation, Phone} from '@lucide/vue';
import type {Business} from '@otosanayide/core';
import {contactOptions} from '@otosanayide/core/contact';
import {approximateDistance} from '@otosanayide/core/coverage';
import {mapsDirectionsUrl} from '@otosanayide/core/location';
import type {BusinessExtras} from '~/lib/search-response';
import BusinessVisual from '~/components/BusinessVisual.vue';
import OpenStatus from '~/components/OpenStatus.vue';
import {useApp} from '~/composables/useApp';
import {useComparison} from '~/composables/useComparison';
import {useLocale} from '~/composables/useLocale';

const props = withDefaults(defineProps<{business: Business; hideFavorite?: boolean; extras?: BusinessExtras}>(), {hideFavorite: false, extras: () => ({})});
const {t: i18nT, locale, localeTag} = useLocale();
const app = useApp();
const comparison = useComparison();
const compared = computed(() => comparison.has(props.business.id));
function toggleCompare(e: Event) {
  const refused = !comparison.toggle(props.business);
  // The box must show the shared state, not the click that was refused.
  (e.target as HTMLInputElement).checked = comparison.has(props.business.id);
  if (refused) app.notify('En fazla üç işletme karşılaştırabilirsin.');
}

const call = computed(() => contactOptions(props.business.phone)?.call);
const directions = computed(() => {
  const {coordinateStatus, latitude, longitude} = props.business;
  return coordinateStatus === 'verified' && latitude !== undefined && longitude !== undefined ? mapsDirectionsUrl({latitude, longitude}) : undefined;
});

function toggle() {
  app.toggleFavorite(props.business.id).catch(e => app.notify(e.message));
}
</script>

<template>
  <article class="business-card biz">
    <NuxtLink :to="`/servis/${business.id}`" class="card-media biz-media"><BusinessVisual :business="business"/><span v-if="business.sample" class="ds-badge neu biz-flag">{{ i18nT("Örnek işletme") }}</span></NuxtLink>
    <button v-if="!hideFavorite" type="button" class="ds-iconbtn biz-fav" :aria-label="i18nT(app.data.favorites.includes(business.id)?'{0} favorilerden çıkar':'{0} kaydet',{'0':business.name})" @click="toggle"><Heart :size="17" :fill="app.data.favorites.includes(business.id)?'currentColor':'none'"/></button>
    <div class="biz-body">
      <div class="biz-head">
        <h3><NuxtLink :to="`/servis/${business.id}`">{{ business.name }}</NuxtLink></h3>
        <span v-if="business.ownership==='verified'" class="ds-badge ok" :title="i18nT('İşletme sahipliği doğrulandı')"><BadgeCheck :size="13"/>{{ i18nT("Doğrulanmış") }}</span>
        <span v-else-if="business.ownership==='unclaimed'" class="ds-badge neu">{{ i18nT("Sahiplenilmedi") }}</span>
      </div>
      <p class="biz-line"><MapPin :size="15"/><span>{{ business.district }}, {{ business.city }}<template v-if="business.distance!==undefined"> · {{ i18nT('{0} kuş uçuşu',{'0':approximateDistance(business.distance,locale)??''}) }}</template></span></p>
      <div class="biz-status">
        <span v-if="extras.reviewSummary" class="biz-line"><MessageSquare :size="15"/>{{ extras.reviewSummary.count ? i18nT('{0} · {1} yorum', {'0': extras.reviewSummary.average!.toLocaleString(localeTag, {minimumFractionDigits: 1, maximumFractionDigits: 1}), '1': extras.reviewSummary.count}) : i18nT("Henüz yorum yok") }}</span>
        <OpenStatus class="biz-hours" :openingHours="extras.openingHours" :hours="business.hours"/>
      </div>
      <div class="biz-tags">
        <span v-for="s in business.services.slice(0,3)" :key="s" class="ds-chip">{{ i18nT(s) }}</span>
        <span v-if="business.brands[0]" class="ds-chip rows-only">{{ business.brands[0] }}</span>
        <span v-if="business.cardPayment===true" class="ds-chip rows-only"><CreditCard :size="14"/>{{ i18nT("Kart: Evet") }}</span>
      </div>
      <div class="ds-divider biz-rule"/>
      <div class="biz-foot">
        <label class="biz-compare"><input type="checkbox" class="ds-check" :checked="compared" :aria-label="i18nT('{0} karşılaştırmaya ekle', {'0': business.name})" @change="toggleCompare"/>{{ i18nT("Karşılaştır") }}</label>
        <div class="biz-actions">
          <a v-if="call" class="ds-btn s sm rows-only" :href="call"><Phone :size="15"/>{{ i18nT("Ara") }}</a>
          <span v-else class="ds-btn s sm ds-passive rows-only" aria-disabled="true" :title="i18nT('Telefon bilgisi yok')"><Phone :size="15"/>{{ i18nT("Ara") }}</span>
          <a v-if="directions" class="ds-btn s sm rows-only" :href="directions" target="_blank" rel="noopener noreferrer"><Navigation :size="15"/>{{ i18nT("Yol tarifi") }}</a>
          <span v-else class="ds-btn s sm ds-passive rows-only" aria-disabled="true" :title="i18nT('Konum doğrulanmadı')"><Navigation :size="15"/>{{ i18nT("Yol tarifi") }}</span>
          <NuxtLink class="ds-btn g sm rows-only" :to="`/servis/${business.id}`">{{ i18nT("Profili aç") }}<ArrowRight :size="15"/></NuxtLink>
          <NuxtLink class="biz-more grid-only" :to="`/servis/${business.id}`">{{ i18nT("Detayları gör") }}<ArrowRight :size="16"/></NuxtLink>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped>
.biz {position: relative; display: flex; flex-direction: column; min-width: 0; border-color: #dfe5eb; border-radius: 14px;}
.biz-media {height: 190px; flex: none;}
.biz-media :deep(.visual-initials) {display: none;}
.biz-media :deep(.visual-symbol) {width: 56px; height: 56px; margin: 0 0 22px; background: none;}
.biz-media :deep(.visual-caption) {left: 12px; right: 12px; bottom: 44px; justify-content: center; gap: 4px; font-size: 12px; opacity: .85;}
.biz-media :deep(.visual-caption strong) {font-size: 12px; font-weight: 400;}
.biz-media :deep(.visual-caption strong)::after {content: ' ·';}
.biz-media :deep(.visual-caption span) {font-size: 12px;}
.biz-flag {position: absolute; left: 12px; top: 12px;}
.biz-fav {position: absolute; top: 12px; right: 12px; width: 36px; height: 36px; border: 0; border-radius: 18px; box-shadow: 0 2px 4px rgba(16, 36, 58, .15);}
.biz-body {display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 0; padding: 20px;}
.biz-head {display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;}
.biz-head h3 {margin: 0; flex: 1; min-width: 0; font-size: 18px; line-height: 1.3; overflow-wrap: anywhere;}
.biz-line {display: flex; align-items: center; gap: 6px; margin: 0; font-size: 13px; color: #586879;}
.biz-line svg {flex: none;}
.biz-status {display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;}
.biz-hours {flex: 0 1 auto; max-width: 100%; height: auto; min-height: 24px; padding: 3px 9px; white-space: normal;}
.biz-tags {display: flex; flex-wrap: wrap; gap: 6px;}
.biz-tags .ds-chip {max-width: 100%; overflow: hidden;}
.biz-rule {margin-top: auto;}
.biz-foot {display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;}
.biz-compare {display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: #10243a;}
.biz-actions {display: flex; align-items: center; gap: 8px; flex-wrap: wrap;}
.biz-more {display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 700; color: #10243a; text-decoration: none;}
.rows-only {display: none;}

@media (min-width: 761px) {
  .ds-biz-rows .biz {flex-direction: row; gap: 20px; padding: 16px;}
  .ds-biz-rows .biz-media {flex: 0 0 240px; height: 170px; border-radius: 12px;}
  .ds-biz-rows .biz-body {padding: 0; gap: 8px;}
  .ds-biz-rows .biz-head {flex-direction: column-reverse; gap: 8px; padding-right: 48px;}
  .ds-biz-rows .biz-head h3 {font-size: 19px;}
  .ds-biz-rows .biz-fav {top: 16px; right: 16px; border: 1px solid #dfe5eb; border-radius: 10px; box-shadow: none;}
  .ds-biz-rows .biz-status {justify-content: flex-start; gap: 16px;}
  .ds-biz-rows .biz-rule {display: none;}
  .ds-biz-rows .biz-foot {flex-direction: row-reverse; margin-top: auto;}
  .ds-biz-rows .rows-only {display: inline-flex;}
  .ds-biz-rows .grid-only {display: none;}
}
</style>
