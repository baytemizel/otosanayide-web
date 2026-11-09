<script setup lang="ts">
import {computed, ref} from 'vue';
import {Bell, Plus} from '@lucide/vue';
import {reminderSchema, type Reminder, type Vehicle} from '@otosanayide/core';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {vDefaultValue} from '~/lib/directives';
import ReminderManagerCard from '~/components/ReminderManagerCard.vue';
import ReminderOptions from '~/components/ReminderOptions.vue';

function payload(r: Reminder) {
  return {vehicleId: r.vehicleId, title: r.title, dueDate: r.dueDate, dueKm: r.dueKm, channels: r.channels, advanceDays: r.advanceDays, completed: r.completed ?? false};
}

const props = defineProps<{vehicle: Vehicle}>();
const {t: i18nT, localeTag: i18nLocaleTag} = useLocale();
const app = useApp();
const editing = ref<string | null>(null);
const busy = ref(false);
const error = ref('');
const showCompleted = ref(false);
const reminders = computed(() => app.data.reminders.filter(r => r.vehicleId === props.vehicle.id));
const active = computed(() => reminders.value.filter(r => !r.completed));
const done = computed(() => reminders.value.filter(r => r.completed));
const edited = computed(() => reminders.value.find(r => r.id === editing.value));
const istanbulToday = () => new Date().toLocaleDateString('sv-SE', {timeZone: 'Europe/Istanbul'});

async function submit(e: Event) {
  e.preventDefault();
  busy.value = true;
  error.value = '';
  try {
    const d = Object.fromEntries(new FormData(e.currentTarget as HTMLFormElement));
    const value = reminderSchema.parse({vehicleId: props.vehicle.id, title: d.title, completed: edited.value?.completed ?? false, channels: [...(d.push ? ['push'] : []), ...(d.email ? ['email'] : [])], advanceDays: d.advanceDays, ...(d.dueDate ? {dueDate: d.dueDate} : {}), ...(d.dueKm ? {dueKm: d.dueKm} : {})});
    if (edited.value) await app.update('reminders', edited.value.id, value);
    else await app.save('reminders', value);
    editing.value = null;
    app.notify('Hatırlatma kaydedildi. Dış takvimdeki kopya otomatik güncellenmez.');
  } catch (e) {
    error.value = e instanceof Error && !e.message.startsWith('[') ? e.message : 'Başlık ile hedef tarih veya kilometreyi kontrol et.';
  } finally {
    busy.value = false;
  }
}

async function toggle(r: Reminder) {
  busy.value = true;
  error.value = '';
  try {
    await app.update('reminders', r.id, {...payload(r), completed: !r.completed});
    app.notify(r.completed ? 'Hatırlatma yeniden etkin.' : 'Hatırlatma tamamlandı. Takvim kopyasını takvim uygulamandan ayrıca kaldırabilirsin.');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Güncellenemedi.';
  } finally {
    busy.value = false;
  }
}

function edit(id: string) {
  error.value = '';
  editing.value = id;
}

function cancel() {
  editing.value = null;
  error.value = '';
}
</script>

<template>
  <aside class="panel reminder-panel">
    <h2 class="row"><Bell :size="22"/>{{ i18nT("Hatırlatmalar ") }}<span class="small muted">{{ active.length+(vehicle.inspectionDueDate?1:0) }}{{ i18nT(" etkin") }}</span></h2>
    <p v-if="error" class="error" role="alert">{{ i18nT(error) }}</p>
    <div v-if="vehicle.inspectionDueDate" class="reminder"><strong>{{ i18nT("Araç muayenesi") }}</strong><small>{{ new Date(vehicle.inspectionDueDate+'T12:00:00').toLocaleDateString(i18nLocaleTag) }}</small><small>{{ vehicle.inspectionDueDate<istanbulToday()?i18nT("Muayene tarihi geçti."):i18nT("Tarihini araç profilinden güncelleyebilirsin.") }}</small></div>
    <template v-if="active.length"><ReminderManagerCard v-for="r in active" :key="r.id" :reminder="r" :vehicle="vehicle" :busy="busy" :editing="editing" :onEdit="edit" :onToggle="toggle"/></template>
    <p v-else class="muted">{{ i18nT("Bir sonraki bakım için tarih veya kilometre hedefi ekleyebilirsin.") }}</p>
    <template v-if="done.length>0">
      <button class="text-button" @click="showCompleted=!showCompleted" :aria-expanded="showCompleted">{{ i18nT("Tamamlananlar (") }}{{ done.length }})</button>
      <template v-if="showCompleted"><ReminderManagerCard v-for="r in done" :key="r.id" :reminder="r" :vehicle="vehicle" :busy="busy" :editing="editing" :onEdit="edit" :onToggle="toggle"/></template>
    </template>
    <button v-if="editing===null" class="button secondary full" @click="edit('new')"><Plus :size="17"/>{{ i18nT("Hatırlatma ekle") }}</button>
    <form v-else :key="editing" class="stack reminder-editor" @submit="submit">
      <h3>{{ edited?i18nT("Hatırlatmayı düzenle"):i18nT("Yeni hatırlatma") }}</h3>
      <label>{{ i18nT("Hatırlatma") }}<input name="title" required minlength="2" maxlength="100" v-default-value="edited?.title" :placeholder="i18nT('Periyodik bakım')"/></label>
      <label>{{ i18nT("Hedef tarih") }}<input type="date" name="dueDate" v-default-value="edited?.dueDate"/></label>
      <label>{{ i18nT("Hedef kilometre") }}<input type="number" name="dueKm" min="0" step="1" v-default-value="edited?.dueKm"/></label>
      <ReminderOptions :reminder="edited"/>
      <button class="button primary" :disabled="busy">{{ i18nT("Hatırlatmayı kaydet") }}</button>
      <button class="button secondary" type="button" :disabled="busy" @click="cancel">{{ i18nT("Vazgeç") }}</button>
    </form>
    <p class="small muted">{{ i18nT("Push/e-posta gönderimi henüz etkin değil. Tamamlama bir bakım kaydı oluşturmaz; yapılan işlemi bakım geçmişine ayrıca ekle.") }}</p>
  </aside>
</template>
