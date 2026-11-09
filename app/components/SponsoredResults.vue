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
  <section v-if="visible.length" class="sponsored-results" :aria-label="t('Sponsorlu işletmeler')">
    <div class="row between">
      <h3>{{ t('Sponsorlu işletmeler') }}</h3>
      <span class="badge">{{ t('Reklam') }}</span>
    </div>
    <p class="small muted">{{ t('Ücretli tanıtım alanıdır. Sponsorlu olmak hizmet kalitesi veya tavsiye garantisi değildir.') }}</p>
    <div class="business-grid">
      <MeasuredAd v-for="{business:b,headline,description,metricToken} in visible" :key="b.id" :token="metricToken">
        <NuxtLink class="card-media" :to="`/servis/${b.id}`"><BusinessVisual :business="b"/><span class="image-label">{{ t('Sponsorlu') }}</span></NuxtLink>
        <div class="card-body">
          <h3><NuxtLink :to="`/servis/${b.id}`">{{ b.name }}</NuxtLink></h3>
          <p class="small muted">{{ b.district }}, {{ b.city }}{{ b.distance!==undefined?` · ${b.distance.toFixed(1)} km`:'' }}</p>
          <strong>{{ headline }}</strong>
          <p>{{ description }}</p>
          <NuxtLink class="button secondary compact" :to="`/servis/${b.id}`">{{ t('İşletmeyi incele') }}</NuxtLink>
        </div>
      </MeasuredAd>
    </div>
  </section>
</template>
