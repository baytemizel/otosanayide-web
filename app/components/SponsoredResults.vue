<script setup lang="ts">
import {computed,ref} from 'vue';
import type {SponsoredItem} from '@otosanayide/core/sponsored';
import BusinessVisual from '~/components/BusinessVisual.vue';
import MeasuredAd from '~/components/MeasuredAd.vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';

const props=defineProps<{items:SponsoredItem[]}>();

const {t}=useLocale();
const clock=ref(Date.now());

useClientEffect(()=>[props.items,clock.value],()=>{
  const future=props.items.map(v=>v.expiresAtMs).filter(v=>v>Date.now());
  if(!future.length)return;
  const timer=setTimeout(()=>{clock.value=Date.now();},Math.min(2147483647,Math.max(1,Math.min(...future)-Date.now()+10)));
  return()=>clearTimeout(timer);
});

const visible=computed(()=>props.items.filter(v=>v.expiresAtMs>Math.max(clock.value,Date.now())));
</script>

<template>
  <section v-if="visible.length" class="spon" :aria-label="t('Sponsorlu işletmeler')">
    <div class="ds-row ds-sb ds-g12">
      <h3>{{ t('Sponsorlu işletmeler') }}</h3>
      <span class="ds-badge sp">{{ t('Reklam') }}</span>
    </div>
    <p class="ds-small ds-muted">{{ t('Ücretli tanıtım alanıdır. Sponsorlu olmak hizmet kalitesi veya tavsiye garantisi değildir.') }}</p>
    <div class="spon-grid">
      <MeasuredAd v-for="{business:b,headline,description,metricToken} in visible" :key="b.id" :token="metricToken" class="spon-card">
        <NuxtLink class="card-media spon-media" :to="`/servis/${b.id}`"><BusinessVisual :business="b"/><span class="ds-badge sp spon-flag">{{ t('Sponsorlu') }}</span></NuxtLink>
        <div class="spon-body">
          <h3><NuxtLink :to="`/servis/${b.id}`">{{ b.name }}</NuxtLink></h3>
          <p class="ds-small ds-muted">{{ b.district }}, {{ b.city }}{{ b.distance!==undefined?` · ${b.distance.toFixed(1)} km`:'' }}</p>
          <strong>{{ headline }}</strong>
          <p class="ds-small">{{ description }}</p>
          <NuxtLink class="ds-btn s sm" :to="`/servis/${b.id}`">{{ t('İşletmeyi incele') }}</NuxtLink>
        </div>
      </MeasuredAd>
    </div>
  </section>
</template>

<style scoped>
.spon {display: flex; flex-direction: column; gap: 10px;}
.spon h3, .spon p {margin: 0;}
.spon-grid {display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 24px; margin-top: 6px;}
.spon-card {border-color: #dfe5eb; border-radius: 14px;}
.spon-media {height: 190px;}
.spon-flag {position: absolute; left: 12px; top: 12px;}
.spon-media :deep(.visual-initials) {display: none;}
.spon-body {display: flex; flex-direction: column; align-items: flex-start; gap: 8px; padding: 20px; overflow-wrap: anywhere;}
.spon-body h3 {font-size: 18px; line-height: 1.3;}
@media (max-width: 480px) {
  .spon-grid {grid-template-columns: minmax(0, 1fr);}
}
</style>
