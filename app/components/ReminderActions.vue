<script setup lang="ts">
import {ref} from 'vue';
import {Calendar, Download} from '@lucide/vue';
import type {Reminder, Vehicle} from '@otosanayide/core';
import {reminderCalendar} from '@otosanayide/core/calendar';
import {useLocale} from '~/composables/useLocale';

const props = withDefaults(defineProps<{reminder: Reminder; vehicle: Vehicle; footer?: boolean}>(), {footer: false});
const {t: i18nT, locale} = useLocale();
const message = ref('');

function download() {
  try {
    const url = URL.createObjectURL(new Blob([reminderCalendar(props.reminder, props.vehicle, new Date(), locale.value)], {type: 'text/calendar;charset=utf-8'}));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'otosanayide-bakim.ics';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    message.value = 'Takvim dosyası hazırlandı. Takvim uygulamanda açıp eklemeyi onayla; henüz takvimine yazılmadı.';
  } catch (e) {
    message.value = (e as Error).message;
  }
}
</script>

<template>
  <span v-if="footer" class="ds-col ds-g4">
    <button type="button" class="ds-btn s" @click="download"><Download :size="16"/>{{ i18nT(".ics indir") }}</button>
    <small v-if="message" role="status" class="ds-xs ds-muted">{{ i18nT(message) }}</small>
  </span>
  <div v-else class="ds-col ds-g6">
    <small class="ds-xs ds-muted">{{ reminder.channels?.includes('push')?i18nT("Push tercihi kaydedildi · gönderim kapalı. "):'' }}{{ reminder.channels?.includes('email')?i18nT("E-posta tercihi kaydedildi · gönderim kapalı."):'' }}</small>
    <template v-if="reminder.dueDate"><button type="button" class="ds-btn s sm add" @click="download"><Calendar :size="14"/>{{ i18nT("Takvime ekle (.ics)") }}</button><small class="ds-xs ds-muted">{{ i18nT("Google Takvim, Microsoft Outlook veya Apple Takvim’e aktar. ") }}{{ reminder.advanceDays??1 }}{{ i18nT(" gün önce uyarı istenir; takvim uygulamanın bildirim ayarları geçerlidir. Değişiklikler otomatik eşitlenmez.") }}</small></template>
    <small v-else class="ds-xs ds-muted">{{ i18nT("Takvime eklemek için hedef tarih de belirtmelisin.") }}</small>
    <small v-if="message" role="status" class="ds-xs ds-muted">{{ i18nT(message) }}</small>
  </div>
</template>

<style scoped>
.add {align-self: flex-start;}
</style>
