<script setup lang="ts">
import {computed, ref, useId} from 'vue';
import {Calendar, Download, X} from '@lucide/vue';
import {reminderSchema, type Reminder, type Vehicle} from '@otosanayide/core';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {vDefaultValue} from '~/lib/directives';
import ReminderManagerCard from '~/components/ReminderManagerCard.vue';
import ReminderOptions from '~/components/ReminderOptions.vue';
import ReminderActions from '~/components/ReminderActions.vue';

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
const titleId = useId();
const inspectionBadge = computed(() => {
  const days = Math.round((Date.parse(props.vehicle.inspectionDueDate ?? '') - Date.parse(istanbulToday())) / 86400000);
  return days < 0 ? i18nT('Geçti') : days === 0 ? i18nT('Bugün') : i18nT('{0} gün', {'0': days});
});
// Modal focus handling: move focus in on open, give it back on close, keep Tab inside.
let returnFocus: HTMLElement | null = null;
const vDialogFocus = {
  mounted: (el: HTMLElement) => {
    returnFocus = document.activeElement as HTMLElement | null;
    el.focus();
  },
  unmounted: () => returnFocus?.focus(),
};
function trap(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (!busy.value) cancel();
    return;
  }
  if (e.key !== 'Tab') return;
  const root = e.currentTarget as HTMLElement;
  const items = Array.from(root.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])'));
  const first = items[0], last = items[items.length - 1];
  if (!first || !last) return;
  if (e.shiftKey && (document.activeElement === first || document.activeElement === root)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

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
  <aside class="ds-card ds-pad ds-col ds-g12">
    <div class="ds-row ds-sb ds-g8">
      <h2 class="title">{{ i18nT("Hatırlatmalar ") }}<span class="ds-xs ds-muted count">{{ active.length+(vehicle.inspectionDueDate?1:0) }}{{ i18nT(" etkin") }}</span></h2>
      <button type="button" class="new" :disabled="editing!==null" :aria-label="i18nT('Hatırlatma ekle')" @click="edit('new')">{{ i18nT("Yeni") }}</button>
    </div>
    <p v-if="error&&editing===null" class="ds-note err" role="alert">{{ i18nT(error) }}</p>
    <div v-if="vehicle.inspectionDueDate" class="rem">
      <span :class="`ds-badge ${vehicle.inspectionDueDate<istanbulToday()?'err':'info'}`">{{ inspectionBadge }}</span>
      <div class="ds-f1 ds-col">
        <strong class="ds-small">{{ i18nT("Araç muayenesi") }}</strong>
        <small class="ds-xs ds-muted">{{ new Date(vehicle.inspectionDueDate+'T12:00:00').toLocaleDateString(i18nLocaleTag) }}</small>
        <small class="ds-xs ds-muted">{{ vehicle.inspectionDueDate<istanbulToday()?i18nT("Muayene tarihi geçti."):i18nT("Tarihini araç profilinden güncelleyebilirsin.") }}</small>
      </div>
    </div>
    <template v-if="active.length"><ReminderManagerCard v-for="r in active" :key="r.id" :reminder="r" :vehicle="vehicle" :busy="busy" :editing="editing" :onEdit="edit" :onToggle="toggle"/></template>
    <p v-else class="ds-small ds-muted">{{ i18nT("Bir sonraki bakım için tarih veya kilometre hedefi ekleyebilirsin.") }}</p>
    <template v-if="done.length>0">
      <button type="button" class="ds-btn g sm more" @click="showCompleted=!showCompleted" :aria-expanded="showCompleted">{{ i18nT("Tamamlananlar (") }}{{ done.length }})</button>
      <template v-if="showCompleted"><ReminderManagerCard v-for="r in done" :key="r.id" :reminder="r" :vehicle="vehicle" :busy="busy" :editing="editing" :onEdit="edit" :onToggle="toggle"/></template>
    </template>
    <p class="ds-xs ds-muted">{{ i18nT("Push/e-posta gönderimi henüz etkin değil. Tamamlama bir bakım kaydı oluşturmaz; yapılan işlemi bakım geçmişine ayrıca ekle.") }}</p>
    <div v-if="editing!==null" class="ds-modal-scrim">
      <div class="ds-modal dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId" tabindex="-1" v-dialog-focus @keydown="trap">
        <div class="dialog-head">
          <h3 :id="titleId" class="dialog-title">{{ edited?i18nT("Hatırlatmayı düzenle"):i18nT("Hatırlatma oluştur") }}</h3>
          <button type="button" class="ds-iconbtn" :aria-label="i18nT('Vazgeç')" :disabled="busy" @click="cancel"><X :size="18"/></button>
        </div>
        <form :key="editing" @submit="submit">
          <div class="dialog-body ds-col ds-g16">
            <div class="f"><span class="ds-label">{{ i18nT("Araç") }}</span><div class="ds-field fixed">{{ vehicle.brand }} {{ vehicle.model }} · {{ vehicle.year }}</div></div>
            <div class="grid2">
              <label class="f"><span class="ds-label">{{ i18nT("Konu") }}</span><input class="ds-field" name="title" required minlength="2" maxlength="100" v-default-value="edited?.title" :placeholder="i18nT('Periyodik bakım')"/></label>
              <label class="f"><span class="ds-label">{{ i18nT("Hedef tarih") }}</span><input class="ds-field" type="date" name="dueDate" v-default-value="edited?.dueDate"/></label>
              <label class="f"><span class="ds-label">{{ i18nT("Hedef kilometre") }}</span><input class="ds-field" type="number" name="dueKm" min="0" step="1" v-default-value="edited?.dueKm"/></label>
            </div>
            <ReminderOptions :reminder="edited"/>
            <div class="ds-note info"><Calendar :size="16" class="ds-i"/><div class="ds-col"><strong>{{ i18nT("Takvime ekle (.ics)") }}</strong><span>{{ i18nT("Google, Outlook veya Apple Takvim’e aktarılır. Takvim kopyası otomatik güncellenmez.") }}</span></div></div>
            <p v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</p>
          </div>
          <div class="dialog-foot">
            <ReminderActions v-if="edited?.dueDate" :reminder="edited" :vehicle="vehicle" footer/>
            <button v-else type="button" class="ds-btn s" disabled :title="i18nT('Takvime eklemek için hedef tarih gerekli.')"><Download :size="16"/>{{ i18nT(".ics indir") }}</button>
            <div class="ds-row ds-g10">
              <button class="ds-btn g" type="button" :disabled="busy" @click="cancel">{{ i18nT("Vazgeç") }}</button>
              <button class="ds-btn p" :disabled="busy">{{ i18nT("Kaydet") }}</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </aside>
</template>

<style scoped>
p, h2, h3 {margin: 0;}
.title {font-family: Arimo, Arial, Helvetica, sans-serif; letter-spacing: 0; font-size: 19px; line-height: 24.7px;}
.count {font-weight: 400; white-space: nowrap;}
.new {padding: 0; border: 0; background: none; color: #c4460b; font-size: 13px; font-weight: 700; cursor: pointer;}
.new[disabled] {opacity: .55; cursor: not-allowed;}
.more {align-self: flex-start;}
.rem {display: flex; align-items: flex-start; gap: 10px; padding: 10px; background: #f7f9fa; border-radius: 10px;}
.dialog {max-width: 600px; outline: none;}
.dialog-head {display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 22px 28px; border-bottom: 1px solid #edf0f3;}
.dialog-title {font-size: 19px; line-height: 24.7px; font-weight: 700;}
.dialog-body {padding: 24px 28px;}
.dialog-foot {display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 16px 28px; border-top: 1px solid #edf0f3;}
.grid2 {display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;}
.f {display: block; min-width: 0;}
.f .ds-label {display: block;}
.f .ds-field {font-size: 15px;}
.fixed {overflow-wrap: anywhere;}
@media (max-width: 480px) {
  .dialog-head, .dialog-body, .dialog-foot {padding-left: 16px; padding-right: 16px;}
  .grid2 {grid-template-columns: minmax(0, 1fr);}
}
</style>
