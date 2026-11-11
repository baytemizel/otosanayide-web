<script setup lang="ts">
import {ref} from 'vue';
import {Bell, Inbox} from '@lucide/vue';
import {useLocale} from '~/composables/useLocale';
import type {Notice} from '~/lib/notifications-helpers';

const props = defineProps<{notice: Notice; onRead: (read: boolean) => Promise<void>}>();
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
  <article class="notice-row" :class="{unread: !notice.read}">
    <span class="notice-icon"><Bell v-if="notice.kind==='reminder'" :size="19"/><Inbox v-else :size="19"/></span>
    <div class="ds-f1 ds-col ds-g4">
      <div class="ds-row ds-g8 ds-wrap">
        <strong class="notice-title">{{ notice.kind==='reminder' ? notice.title : i18nT('Talep güncellemesi') }}</strong>
        <span v-if="!notice.read" class="notice-dot" aria-hidden="true"/>
        <span class="sr-only">{{ i18nT(notice.read?'Okundu':'Okunmadı') }}</span>
      </div>
      <template v-if="notice.kind==='reminder'">
        <p class="ds-small ds-muted">{{ i18nT('Araç hatırlatması') }}<template v-if="notice.vehicleLabel"> · {{ notice.vehicleLabel }}</template></p>
        <p class="ds-small ds-muted">{{ i18nT(notice.phase==='advance'?'Hatırlatma tarihin yaklaşıyor':notice.phase==='mileage'?'Kilometre hedefine ulaşıldı':'Hatırlatma tarihi geldi veya geçti') }}</p>
        <p v-if="notice.dueDate" class="ds-small ds-muted">{{ i18nT('Tarih') }}: {{ notice.dueDate }}</p>
        <p v-if="notice.dueKm!==null&&notice.dueKm!==undefined" class="ds-small ds-muted">{{ i18nT('Kilometre') }}: {{ notice.dueKm.toLocaleString(localeTag) }}</p>
      </template>
      <p v-else class="ds-small ds-muted">{{ i18nT({requested:'İşletme yanıtı bekleniyor',offered:'Kullanıcı onayı bekleniyor',confirmed:'Kesinleşti',declined:'İşletme reddetti',cancelled:'İptal edildi',completed:'Tamamlandı'}[notice.status??'']??'Belirtilmedi') }}</p>
      <p class="ds-xs ds-muted">{{ i18nT(notice.kind==='reminder'?'Bu bildirim oluşturulduğu andaki bilgidir. Güncel durum için Araçlarım bölümünü aç.':'Bu, olay anındaki durumdur. Güncel bilgi için talebi aç.') }}</p>
      <div class="ds-row ds-g8 ds-wrap notice-actions">
        <NuxtLink class="ds-btn s sm" :to="notice.kind==='reminder'?'/araclarim':'/taleplerim'">{{ i18nT(notice.kind==='reminder'?'Araçlarıma git':'Taleplere git') }}</NuxtLink>
        <button type="button" class="ds-btn g sm" :disabled="busy" @click="toggleRead">{{ i18nT(notice.read?'Okunmadı işaretle':'Okundu işaretle') }}</button>
      </div>
      <p v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</p>
    </div>
    <time class="ds-xs ds-muted notice-time" :datetime="new Date(notice.createdAtMs).toISOString()">{{ new Date(notice.createdAtMs).toLocaleString(localeTag,{timeZone:'Europe/Istanbul'}) }}</time>
  </article>
</template>

<style scoped>
.notice-row {display: flex; align-items: flex-start; gap: 16px; padding: 18px 20px; border-bottom: 1px solid #edf0f3;}
.notice-row:last-child {border-bottom: 0;}
.notice-row.unread {background: #fffaf6;}
.notice-icon {display: grid; place-items: center; flex: none; width: 42px; height: 42px; border-radius: 21px; background: #f4f6f8; color: #10243a;}
.notice-title {font-size: 15px; line-height: 22.5px;}
.notice-dot {width: 8px; height: 8px; border-radius: 4px; background: #c4460b;}
.notice-actions {margin-top: 8px;}
.notice-time {flex: none;}
p {margin: 0;}
@media (max-width: 760px) {
  .notice-row {flex-wrap: wrap; padding: 16px;}
  .notice-time {order: 3; width: 100%; padding-left: 58px;}
}
</style>
