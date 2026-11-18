<script setup lang="ts">
import {computed, reactive, ref, watch} from 'vue';
import {ArrowRight, Bell, Calendar, ChevronDown, Lock, Mail, Smartphone} from '@lucide/vue';
import V2Modal from '~/components/v2/V2Modal.vue';
import {mockReminderTopics, mockNotifyOptions, vehicleTitle, type MockVehicle} from '~/data/mock/garage';
import {mockMember} from '~/data/mock/session';
import {addDays, maskEmail, parseWhole, type ReminderDraft} from '~/lib/v2/garage';

// W12 · Hatırlatma oluştur (Figma 125:277). Demo: saves into the in-memory reminder list and builds a
// simple .ics in the browser. Live (reminderSchema): one notice day (advanceDays), push / e-mail
// preference (channels), a date and/or a km target; the .ics comes from packages/core/calendar via
// `calendar`. Saving a preference is not delivery: the delivery service is not switched on yet (K036).
const props = withDefaults(defineProps<{
  open: boolean;
  vehicles: MockVehicle[];
  vehicleId: string;
  live?: boolean;
  today?: string;
  /** Live: the member's e-mail and whether it is verified. */
  email?: string;
  emailVerified?: boolean;
  busy?: boolean;
  error?: string;
  /** Live .ics builder; throws a readable Error when the draft cannot become a calendar entry. */
  calendar?: (draft: ReminderDraft) => string;
}>(), {live: false, today: '', email: '', emailVerified: false, busy: false, error: '', calendar: undefined});
const emit = defineEmits<{close: []; save: [reminder: ReminderDraft]}>();

const defaultDate = () => (props.live && props.today ? addDays(props.today, 30) : '2026-12-01');
const form = reactive({vehicleId: '', topic: mockReminderTopics[0]!, date: '2026-12-01', km: '', notify: [0, 1, 7] as number[], push: true, email: true});
const dateError = ref('');
const kmError = ref('');
const icsMessage = ref('');

watch(() => props.open, (open) => {
  if (!open) return;
  form.vehicleId = props.vehicleId;
  form.topic = mockReminderTopics[0]!;
  form.date = defaultDate();
  form.km = '';
  form.notify = props.live ? [1] : [0, 1, 7];
  form.push = true;
  form.email = props.live ? props.emailVerified : true;
  dateError.value = '';
  kmError.value = '';
  icsMessage.value = '';
}, {immediate: true});

const maskedEmail = computed(() => maskEmail(props.live ? props.email : mockMember.email));
const emailSub = computed(() => {
  if (!props.live) return `Doğrulanmış adres: ${maskedEmail.value}`;
  return props.emailVerified ? `Doğrulanmış adres: ${maskedEmail.value}` : 'Adresin doğrulanınca gönderilir';
});

function toggleNotify(value: number) {
  // Live: the account model keeps one notice day, so the chips work as a single choice.
  if (props.live) {
    form.notify = [value];
    return;
  }
  form.notify = form.notify.includes(value) ? form.notify.filter((v) => v !== value) : [...form.notify, value].sort((a, b) => a - b);
}

function draft(): ReminderDraft | null {
  const km = form.km.trim() ? parseWhole(form.km) : null;
  kmError.value = form.km.trim() && (km === null || km > 2_000_000) ? 'Kilometreyi sayı olarak yaz.' : '';
  dateError.value = form.date || (props.live && km !== null) ? '' : props.live ? 'Hedef tarih ya da kilometre gir.' : 'Hedef tarihi seç.';
  if (!dateError.value && props.live && form.date && props.today && form.date < props.today) dateError.value = 'Geçmiş bir tarih seçilemez.';
  if (dateError.value || kmError.value) return null;
  return {vehicleId: form.vehicleId, topic: form.topic, date: form.date, dueKm: km, notify: form.notify.length ? form.notify : [0], push: form.push, email: form.email};
}

function download(content: string, name: string) {
  const url = URL.createObjectURL(new Blob([content], {type: 'text/calendar;charset=utf-8'}));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function downloadIcs() {
  if (props.live) {
    icsMessage.value = '';
    if (!form.date) { dateError.value = 'Takvime eklemek için hedef tarih gerekli.'; return; }
    const value = draft();
    if (!value || !props.calendar) return;
    try {
      download(props.calendar(value), 'otosanayide-bakim.ics');
      icsMessage.value = 'Takvim dosyası hazırlandı. Takvim uygulamanda açıp eklemeyi onayla; değişiklikler otomatik eşitlenmez.';
    } catch (error) {
      icsMessage.value = error instanceof Error ? error.message : 'Takvim dosyası hazırlanamadı.';
    }
    return;
  }
  if (!form.date) { dateError.value = 'Hedef tarihi seç.'; return; }
  const vehicle = props.vehicles.find((v) => v.id === form.vehicleId);
  const day = form.date.replace(/-/g, '');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Otosanayide//Hatirlatma (ornek)//TR', 'BEGIN:VEVENT',
    `UID:ornek-${Date.now()}@otosanayide`, `DTSTART;TZID=Europe/Istanbul:${day}T090000`, `DTEND;TZID=Europe/Istanbul:${day}T093000`,
    `SUMMARY:${form.topic}${vehicle ? ` · ${vehicleTitle(vehicle)}` : ''}`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], {type: 'text/calendar'}));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hatirlatma.ics';
  a.click();
  URL.revokeObjectURL(url);
}

function save() {
  if (props.busy) return;
  const value = draft();
  if (value) emit('save', value);
}
</script>

<template>
  <V2Modal :open="open" title="Hatırlatma oluştur" :width="640" @close="emit('close')">
    <form id="reminder-form" class="body" novalidate @submit.prevent="save">
      <div class="two">
        <div class="field">
          <label class="field-label" for="rem-vehicle">Araç</label>
          <div class="select-wrap">
            <select id="rem-vehicle" v-model="form.vehicleId" class="select">
              <option v-for="v in vehicles" :key="v.id" :value="v.id">{{ vehicleTitle(v) }}</option>
            </select>
            <ChevronDown :size="16" class="chev" aria-hidden="true"/>
          </div>
        </div>
        <div class="field">
          <label class="field-label" for="rem-topic">Konu</label>
          <div class="select-wrap">
            <select id="rem-topic" v-model="form.topic" class="select">
              <option v-for="t in mockReminderTopics" :key="t" :value="t">{{ t }}</option>
            </select>
            <ChevronDown :size="16" class="chev" aria-hidden="true"/>
          </div>
        </div>
      </div>

      <div class="field">
        <label class="field-label" for="rem-date">Hedef tarih</label>
        <div class="date-wrap" :class="{invalid: !!dateError}">
          <Calendar :size="18" class="cal" aria-hidden="true"/>
          <input id="rem-date" v-model="form.date" class="input" type="date" :min="live && today ? today : '2026-01-01'" :aria-invalid="dateError ? 'true' : undefined" :aria-describedby="dateError ? 'rem-date-err' : undefined">
        </div>
        <p v-if="dateError" id="rem-date-err" class="err" role="alert">{{ dateError }}</p>
      </div>

      <div v-if="live" class="field">
        <label class="field-label" for="rem-km">Hedef kilometre (isteğe bağlı)</label>
        <input id="rem-km" v-model="form.km" class="input" inputmode="numeric" placeholder="Örn. 95000" :aria-invalid="kmError ? 'true' : undefined" :aria-describedby="kmError ? 'rem-km-err' : 'rem-km-hint'">
        <p v-if="kmError" id="rem-km-err" class="err" role="alert">{{ kmError }}</p>
        <p v-else id="rem-km-hint" class="note">Son kaydettiğin kilometreye göre değerlendirilir; araç kilometresi otomatik takip edilmez.</p>
      </div>

      <fieldset class="group">
        <legend class="field-label">Ne zaman haber verelim?</legend>
        <div class="chips" :role="live ? 'radiogroup' : undefined">
          <button v-for="o in mockNotifyOptions" :key="o.value" type="button" class="chip" :class="form.notify.includes(o.value) ? 'chip-active' : 'chip-default'" :role="live ? 'radio' : undefined" :aria-checked="live ? form.notify.includes(o.value) : undefined" :aria-pressed="live ? undefined : form.notify.includes(o.value)" @click="toggleNotify(o.value)">{{ o.label }}</button>
        </div>
        <p class="note">Gönderim saati: Türkiye saati 09.00{{ live ? ' · Bir gün seçilebilir.' : '' }}</p>
      </fieldset>

      <fieldset class="group">
        <legend class="field-label">Kanallar</legend>
        <ul class="channels">
          <li class="channel">
            <span class="ch-icon" aria-hidden="true"><Bell :size="18"/></span>
            <span class="ch-copy"><span class="t-label-md">Uygulama içi</span><span class="sub">Her zaman açık</span></span>
            <span class="fixed t-label-sm"><Lock :size="13" aria-hidden="true"/>Sabit</span>
          </li>
          <li class="channel">
            <span class="ch-icon" aria-hidden="true"><Smartphone :size="18"/></span>
            <label class="ch-copy" for="rem-push"><span class="t-label-md">Push bildirimi</span><span class="sub">Cihaz izni gerekir</span></label>
            <input id="rem-push" v-model="form.push" type="checkbox" role="switch" class="switch" :aria-checked="form.push">
          </li>
          <li class="channel">
            <span class="ch-icon" aria-hidden="true"><Mail :size="18"/></span>
            <label class="ch-copy" for="rem-email"><span class="t-label-md">E-posta</span><span class="sub">{{ emailSub }}</span></label>
            <input id="rem-email" v-model="form.email" type="checkbox" role="switch" class="switch" :aria-checked="form.email">
          </li>
        </ul>
        <p v-if="live" class="note">Push ve e-posta tercihin hatırlatmayla kaydedilir. Gönderim hizmeti henüz açık değil; şu anda bildirim gönderilmez.</p>
      </fieldset>

      <div class="ics">
        <span class="ch-icon lime" aria-hidden="true"><Calendar :size="18"/></span>
        <span class="ch-copy"><span class="t-label-md">Takvime ekle (.ics)</span><span class="sub">Google, Outlook veya Apple Takvim</span></span>
        <button type="button" class="btn btn-outline" @click="downloadIcs">.ics indir</button>
      </div>
      <p v-if="icsMessage" class="note" role="status">{{ icsMessage }}</p>
      <p v-if="error" class="err form-err" role="alert">{{ error }}</p>
    </form>
    <template #footer>
      <button type="button" class="btn btn-outline" @click="emit('close')">Vazgeç</button>
      <button type="submit" form="reminder-form" class="btn btn-primary" :disabled="busy">{{ busy ? 'Kaydediliyor…' : 'Kaydet' }}<ArrowRight aria-hidden="true"/></button>
    </template>
  </V2Modal>
</template>

<style scoped>
.body{display:flex;flex-direction:column;gap:22px;min-width:0}
.body :is(input,select){min-width:0}
.two{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}
.select-wrap,.date-wrap{position:relative}
.select{appearance:none;-webkit-appearance:none;padding-right:44px;border-radius:16px;cursor:pointer}
.chev{position:absolute;right:17px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--ink-900)}
.date-wrap .input{padding-left:44px;border-radius:16px;min-height:54px}
.date-wrap.invalid .input{border-color:var(--red-500)}
.cal{position:absolute;left:17px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--ink-900)}
.err{font-size:13px;font-weight:600;color:var(--red-500)}
.form-err{padding:10px 14px;border-radius:14px;background:var(--orange-100);color:var(--ink-800)}
.group{border:0;margin:0;padding:0;min-width:0;display:flex;flex-direction:column;gap:10px}
.group legend{padding:0;margin-bottom:10px}
.chips{display:flex;gap:8px;flex-wrap:wrap}
.note{font-size:13px;line-height:1.45;color:var(--ink-500)}
.channels{display:flex;flex-direction:column;padding:6px 16px;background:var(--cream-50);border:1px solid var(--cream-200);border-radius:20px}
.channel{display:flex;align-items:center;gap:14px;padding:12px 0}
.channel + .channel{border-top:1px solid var(--cream-200)}
.ch-icon{flex:none;width:40px;height:40px;border-radius:999px;display:grid;place-items:center;background:var(--white);border:1px solid var(--cream-200);color:var(--ink-900)}
.ch-icon.lime{background:var(--lime-100);border:0}
.ch-copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;color:var(--ink-900)}
label.ch-copy{cursor:pointer}
.sub{font-size:13px;line-height:1.45;color:var(--ink-500)}
.fixed{flex:none;display:inline-flex;align-items:center;gap:6px;padding:6px 12px 6px 9px;border-radius:999px;background:var(--cream-100);color:var(--ink-800)}
.ics{display:flex;align-items:center;gap:14px;padding:16px;border:1px solid var(--cream-200);border-radius:20px}
@media (max-width:600px){
  .two{grid-template-columns:minmax(0,1fr)}
  .ics{flex-wrap:wrap}
  .ics .btn{margin-left:54px}
}
</style>
