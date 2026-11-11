<script setup lang="ts">
import {computed} from 'vue';
import {Check, Pencil, RotateCcw} from '@lucide/vue';
import {reminderStatus, type Reminder, type Vehicle} from '@otosanayide/core';
import {useLocale} from '~/composables/useLocale';
import ReminderActions from '~/components/ReminderActions.vue';

const props = defineProps<{reminder: Reminder; vehicle: Vehicle; busy: boolean; editing: string | null; onEdit: (id: string) => void; onToggle: (reminder: Reminder) => void}>();
const {t: i18nT, localeTag: i18nLocaleTag} = useLocale();
const status = computed(() => reminderStatus(props.reminder, props.vehicle, new Date().toLocaleDateString('sv-SE', {timeZone: 'Europe/Istanbul'})));
const badge = computed(() => {
  const due = props.reminder.dueDate;
  if (!due) return {text: i18nT('Km'), tone: status.value.overdue ? 'err' : 'neu'};
  const days = Math.round((Date.parse(due) - Date.parse(new Date().toLocaleDateString('sv-SE', {timeZone: 'Europe/Istanbul'}))) / 86400000);
  return {text: days < 0 ? i18nT('Geçti') : days === 0 ? i18nT('Bugün') : i18nT('{0} gün', {'0': days}), tone: days < 0 ? 'err' : days <= 30 ? 'warn' : 'info'};
});
</script>

<template>
  <div :class="`rem ${reminder.completed?'completed':''}`">
    <div class="top">
      <span v-if="reminder.completed" class="ds-badge ok"><Check :size="13"/>{{ i18nT("Tamamlandı") }}</span>
      <span v-else :class="`ds-badge ${badge.tone}`">{{ badge.text }}</span>
      <div class="ds-f1 ds-col">
        <strong class="ds-small name">{{ reminder.title }}</strong>
        <span v-if="reminder.dueKm!==undefined" class="ds-xs ds-muted">{{ reminder.dueKm.toLocaleString(i18nLocaleTag) }}{{ i18nT(" km") }}</span>
        <small v-if="reminder.dueDate" class="ds-xs ds-muted">{{ new Date(reminder.dueDate+'T12:00:00').toLocaleDateString(i18nLocaleTag) }}</small>
      </div>
    </div>
    <small v-if="!reminder.completed" class="ds-xs ds-muted">{{ status.overdue?i18nT("Belirlediğin bakım eşiği geldi."):status.remainingKm!==undefined?i18nT("Son kaydedilen kilometreye göre {0} km kaldı.",{"0":status.remainingKm.toLocaleString(i18nLocaleTag)}):i18nT("Belirlediğin tarihte takip et.") }}</small>
    <div class="ds-row ds-g8 ds-wrap"><button type="button" class="ds-btn s sm" :disabled="busy||editing!==null" :aria-label="i18nT('{0} düzenle',{'0':reminder.title})" @click="onEdit(reminder.id)"><Pencil :size="14"/>{{ i18nT("Düzenle") }}</button><button type="button" class="ds-btn s sm" :disabled="busy||editing!==null" @click="onToggle(reminder)"><RotateCcw v-if="reminder.completed" :size="14"/><Check v-else :size="14"/> {{ reminder.completed?i18nT("Tekrar etkinleştir"):i18nT("Tamamlandı") }}</button></div>
    <ReminderActions v-if="!reminder.completed" :reminder="reminder" :vehicle="vehicle"/>
  </div>
</template>

<style scoped>
.rem {display: flex; flex-direction: column; gap: 8px; padding: 10px; background: #f7f9fa; border-radius: 10px;}
.top {display: flex; align-items: flex-start; gap: 10px;}
.name {overflow-wrap: anywhere;}
.completed .name {color: #586879;}
</style>
