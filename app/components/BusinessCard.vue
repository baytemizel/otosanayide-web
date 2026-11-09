<script setup lang="ts">
import {Heart, MapPin, MessageSquare, ShieldCheck} from '@lucide/vue';
import type {Business} from '@otosanayide/core';
import {approximateDistance} from '@otosanayide/core/coverage';
import BusinessVisual from '~/components/BusinessVisual.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';

const props = withDefaults(defineProps<{business: Business; hideFavorite?: boolean}>(), {hideFavorite: false});
const {t: i18nT, locale} = useLocale();
const app = useApp();

function toggle() {
  app.toggleFavorite(props.business.id).catch(e => app.notify(e.message));
}
</script>

<template>
  <article class="business-card">
    <NuxtLink :to="`/servis/${business.id}`" class="card-media"><BusinessVisual :business="business"/><span v-if="business.sample" class="image-label">{{ i18nT("Örnek işletme") }}</span></NuxtLink>
    <div class="card-body">
      <div class="row between">
        <h3><NuxtLink :to="`/servis/${business.id}`">{{ business.name }}</NuxtLink></h3>
        <button v-if="!hideFavorite" class="icon-button" :aria-label="i18nT(app.data.favorites.includes(business.id)?'{0} favorilerden çıkar':'{0} kaydet',{'0':business.name})" @click="toggle"><Heart :size="22" :fill="app.data.favorites.includes(business.id)?'currentColor':'none'"/></button>
      </div>
      <p class="muted row"><MapPin :size="15"/>{{ business.district }}, {{ business.city }}<template v-if="business.distance!==undefined">{{ ` · ${approximateDistance(business.distance,locale)}` }}</template></p>
      <div class="tags"><span v-for="s in business.services.slice(0,3)" :key="s">{{ i18nT(s) }}</span></div>
      <p class="small muted row"><MessageSquare :size="15"/>{{ i18nT("Henüz yorum yok") }}<span v-if="business.ownership==='verified'" :title="i18nT('İşletme sahipliği doğrulandı')"><ShieldCheck :size="17"/></span></p>
    </div>
  </article>
</template>
