<script setup lang="ts">
import {computed} from 'vue';
import {featureAvailable} from '@otosanayide/core';
import RequestForm from '~/components/RequestForm.vue';
import {useLocale} from '~/composables/useLocale';
import {readBusiness, type BusinessRead} from '~/lib/server-read';

const route = useRoute();
const {t: i18nT, locale} = useLocale();
const kind = computed(() => (route.query.kind === 'appointments' ? 'appointments' : 'quotes'));
const businessId = computed(() => (typeof route.query.business === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(route.query.business) ? route.query.business : ''));
const {data} = await useAsyncData<BusinessRead>(
  () => `request-business:${businessId.value}:${locale.value}`,
  () => (businessId.value ? readBusiness(businessId.value, locale.value) : Promise.resolve({status: 'missing'} as const)),
);
const business = computed(() => {
  const value = data.value;
  return value?.status === 'found' && featureAvailable(value.business, kind.value) ? value.business : null;
});
</script>

<template>
  <div v-if="data?.status === 'unavailable'" class="container page">
    <h1>{{ i18nT("Talep şu anda açılamıyor.") }}</h1>
    <p>{{ i18nT("Lütfen daha sonra tekrar dene.") }}</p>
  </div>
  <RequestForm v-else-if="business" :business="business" :kind="kind"/>
  <div v-else class="container page">
    <h1>{{ i18nT("Bu işletme şu anda talep kabul etmiyor.") }}</h1>
    <p>{{ i18nT("Teklif ve randevu yalnızca bu hizmeti etkinleştiren doğrulanmış işletmelerde kullanılabilir.") }}</p>
    <a class="button primary" href="/">{{ i18nT("İşletmeleri keşfet") }}</a>
  </div>
</template>
