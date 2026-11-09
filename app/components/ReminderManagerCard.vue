<script setup lang="ts">
import {computed} from 'vue';
import {Check, Pencil, RotateCcw} from '@lucide/vue';
import {reminderStatus, type Reminder, type Vehicle} from '@otosanayide/core';
import {useLocale} from '~/composables/useLocale';
import ReminderActions from '~/components/ReminderActions.vue';

const props = defineProps<{reminder: Reminder; vehicle: Vehicle; busy: boolean; editing: string | null; onEdit: (id: string) => void; onToggle: (reminder: Reminder) => void}>();
const {t: i18nT, localeTag: i18nLocaleTag} = useLocale();
const status = computed(() => reminderStatus(props.reminder, props.vehicle, new Date().toLocaleDateString('sv-SE', {timeZone: 'Europe/Istanbul'})));
</script>

<template>
  <div :class="`reminder ${reminder.completed?'completed':''}`">
    <div class="row between"><strong>{{ reminder.title }}</strong><span v-if="reminder.completed" class="completed-badge"><Check :size="13"/>{{ i18nT("Tamamlandı") }}</span></div>
    <span v-if="reminder.dueKm!==undefined">{{ reminder.dueKm.toLocaleString(i18nLocaleTag) }}{{ i18nT(" km") }}</span>
    <small v-if="reminder.dueDate">{{ new Date(reminder.dueDate+'T12:00:00').toLocaleDateString(i18nLocaleTag) }}</small>
    <small v-if="!reminder.completed">{{ status.overdue?i18nT("Belirlediğin bakım eşiği geldi."):status.remainingKm!==undefined?i18nT("Son kaydedilen kilometreye göre {0} km kaldı.",{"0":status.remainingKm.toLocaleString(i18nLocaleTag)}):i18nT("Belirlediğin tarihte takip et.") }}</small>
    <div class="reminder-controls"><button class="button secondary compact" :disabled="busy||editing!==null" :aria-label="i18nT('{0} düzenle',{'0':reminder.title})" @click="onEdit(reminder.id)"><Pencil :size="14"/>{{ i18nT("Düzenle") }}</button><button class="button secondary compact" :disabled="busy||editing!==null" @click="onToggle(reminder)"><RotateCcw v-if="reminder.completed" :size="14"/><Check v-else :size="14"/> {{ reminder.completed?i18nT("Tekrar etkinleştir"):i18nT("Tamamlandı") }}</button></div>
    <ReminderActions v-if="!reminder.completed" :reminder="reminder" :vehicle="vehicle"/>
  </div>
</template>
