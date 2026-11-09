<script setup lang="ts">
import {ref} from 'vue';
import {useLocale} from '~/composables/useLocale';
import type {Notice} from '~/lib/notifications-helpers';

const props = withDefaults(defineProps<{notice: Notice; business?: boolean; onRead: (read: boolean) => Promise<void>}>(), {business: false});
const {t: i18nT, localeTag} = useLocale();
const busy = ref(false);
const error = ref('');

async function toggleRead() {
  busy.value = true;
  error.value = '';
  try {
    await props.onRead(!props.notice.read);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'İşlem tamamlanamadı.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <article class="panel stack">
    <div class="row between"><strong>{{ i18nT(notice.kind==='reminder'?'Araç hatırlatması':'Talep güncellemesi') }}</strong><span>{{ i18nT(notice.read?'Okundu':'Okunmadı') }}</span></div>
    <template v-if="notice.kind==='reminder'">
      <h3>{{ notice.title }}</h3>
      <p v-if="notice.vehicleLabel">{{ notice.vehicleLabel }}</p>
      <p>{{ i18nT(notice.phase==='advance'?'Hatırlatma tarihin yaklaşıyor':notice.phase==='mileage'?'Kilometre hedefine ulaşıldı':'Hatırlatma tarihi geldi veya geçti') }}</p>
      <p v-if="notice.dueDate">{{ i18nT('Tarih') }}: {{ notice.dueDate }}</p>
      <p v-if="notice.dueKm!==null&&notice.dueKm!==undefined">{{ i18nT('Kilometre') }}: {{ notice.dueKm.toLocaleString(localeTag) }}</p>
    </template>
    <p v-else>{{ i18nT({requested:'İşletme yanıtı bekleniyor',offered:'Kullanıcı onayı bekleniyor',confirmed:'Kesinleşti',declined:'İşletme reddetti',cancelled:'İptal edildi',completed:'Tamamlandı'}[notice.status??'']??'Belirtilmedi') }}</p>
    <time :datetime="new Date(notice.createdAtMs).toISOString()">{{ new Date(notice.createdAtMs).toLocaleString(localeTag,{timeZone:'Europe/Istanbul'}) }}</time>
    <p class="small muted">{{ i18nT(notice.kind==='reminder'?'Bu bildirim oluşturulduğu andaki bilgidir. Güncel durum için Araçlarım bölümünü aç.':'Bu, olay anındaki durumdur. Güncel bilgi için talebi aç.') }}</p>
    <div class="row"><NuxtLink class="button secondary" :to="notice.kind==='reminder'?'/araclarim':business?'/isletme':'/taleplerim'">{{ i18nT(notice.kind==='reminder'?'Araçlarıma git':'Taleplere git') }}</NuxtLink><button class="text-button" :disabled="busy" @click="toggleRead">{{ i18nT(notice.read?'Okunmadı işaretle':'Okundu işaretle') }}</button></div>
    <p v-if="error" role="alert">{{ i18nT(error) }}</p>
  </article>
</template>
