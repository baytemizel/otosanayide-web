<script setup lang="ts">
import {computed} from 'vue';
import {categories} from '@otosanayide/core';
import Profile from '~/components/Profile.vue';
import {useLocale} from '~/composables/useLocale';
import {usePageSeo} from '~/composables/usePageSeo';
import {readBusiness} from '~/lib/server-read';
import {businessJsonLd, serializeJsonLd} from '~/lib/structured-data';

const route = useRoute();
const {t: i18nT, locale} = useLocale();
const id = computed(() => String(route.params.id));
const {data} = await useAsyncData(
  () => `business:${id.value}:${locale.value}`,
  () => readBusiness(id.value, locale.value),
);
if (data.value?.status === 'missing') throw createError({statusCode: 404, statusMessage: 'Not Found', fatal: true});

const found = computed(() => (data.value?.status === 'found' ? data.value : null));
const title = computed(() => {
  const b = found.value?.business;
  if (!b) return i18nT('Profil şu anda kullanılamıyor.');
  const category = categories.find(c => c.id === b.categories[0])?.name;
  return [b.name, [b.district, b.city].join(' / '), category ? i18nT(category) : ''].filter(Boolean).join(' · ');
});
const description = computed(() => {
  const b = found.value?.business;
  if (!b) return undefined;
  const services = b.services.slice(0, 4).map(s => i18nT(s)).join(', ');
  return i18nT('{0}, {1} / {2}. Hizmetler: {3}. Telefon, yol tarifi ve yorumlar Otosanayide’de.', {'0': b.name, '1': b.district, '2': b.city, '3': services || '—'});
});
const {canonical} = usePageSeo({title, description, path: () => `/servis/${encodeURIComponent(id.value)}`});
// Sample and unavailable profiles are not offered to search engines.
useSeoMeta({robots: () => (found.value && !found.value.business.sample ? undefined : 'noindex, nofollow')});
useHead({
  script: () => {
    const value = found.value;
    const ld = value ? businessJsonLd(value.business, {url: canonical.value, openingHours: value.extras.openingHours}) : null;
    return ld ? [{key: 'business-ld', type: 'application/ld+json', innerHTML: serializeJsonLd(ld)}] : [];
  },
});
</script>

<template>
  <Profile v-if="found" :business="found.business" :extras="found.extras"/>
  <div v-else id="content" class="ds-container sv-fallback">
    <h1>{{ i18nT("Profil şu anda kullanılamıyor.") }}</h1>
    <p>{{ i18nT("Veri bağlantısı henüz hazır değil.") }}</p>
  </div>
</template>

<style scoped>
.sv-fallback {padding-top: 48px; padding-bottom: 64px; min-height: 65vh;}
.sv-fallback h1 {margin: 0 0 12px; font-size: 38px;}
@media (max-width: 760px) {.sv-fallback h1 {font-size: 28px;}}
</style>
