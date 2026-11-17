<script setup lang="ts">
import {computed, reactive, ref, watch} from 'vue';
import {ArrowRight, Bell, Calendar, ChevronDown, Lock, Mail, Smartphone} from '@lucide/vue';
import V2Modal from '~/components/v2/V2Modal.vue';
import {mockReminderTopics, mockNotifyOptions, vehicleTitle, type MockNotifyOffset, type MockReminder, type MockVehicle} from '~/data/mock/garage';
import {mockMember} from '~/data/mock/session';

// W12 · Hatırlatma oluştur (Figma 125:277). Saves into the in-memory reminder list; the .ics file is
// built in the browser. Push/e-mail delivery is not wired (mock).
const props = defineProps<{open: boolean; vehicles: MockVehicle[]; vehicleId: string}>();
const emit = defineEmits<{close: []; save: [reminder: Omit<MockReminder, 'id' | 'windowDays'>]}>();

const form = reactive({vehicleId: '', topic: mockReminderTopics[0]!, date: '2026-12-01', notify: [0, 1, 7] as MockNotifyOffset[], push: true, email: true});
const dateError = ref('');

watch(() => props.open, (open) => {
  if (!open) return;
  form.vehicleId = props.vehicleId;
  form.topic = mockReminderTopics[0]!;
  form.date = '2026-12-01';
  form.notify = [0, 1, 7];
  form.push = true;
  form.email = true;
  dateError.value = '';
}, {immediate: true});

const maskedEmail = computed(() => {
  const [user = '', domain = ''] = mockMember.email.split('@');
  return `${user.charAt(0)}***@${domain}`;
});

function toggleNotify(value: MockNotifyOffset) {
  form.notify = form.notify.includes(value) ? form.notify.filter((v) => v !== value) : [...form.notify, value].sort((a, b) => a - b);
}

function downloadIcs() {
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
  dateError.value = form.date ? '' : 'Hedef tarihi seç.';
  if (dateError.value) return;
  emit('save', {
    vehicleId: form.vehicleId,
    topic: form.topic,
    due: `${form.date}T09:00:00+03:00`,
    notify: form.notify.length ? form.notify : [0],
    push: form.push,
    email: form.email,
    active: true,
  });
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
          <input id="rem-date" v-model="form.date" class="input" type="date" min="2026-01-01" :aria-invalid="dateError ? 'true' : undefined" :aria-describedby="dateError ? 'rem-date-err' : undefined">
        </div>
        <p v-if="dateError" id="rem-date-err" class="err" role="alert">{{ dateError }}</p>
      </div>

      <fieldset class="group">
        <legend class="field-label">Ne zaman haber verelim?</legend>
        <div class="chips">
          <button v-for="o in mockNotifyOptions" :key="o.value" type="button" class="chip" :class="form.notify.includes(o.value) ? 'chip-active' : 'chip-default'" :aria-pressed="form.notify.includes(o.value)" @click="toggleNotify(o.value)">{{ o.label }}</button>
        </div>
        <p class="note">Gönderim saati: Türkiye saati 09.00</p>
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
            <label class="ch-copy" for="rem-email"><span class="t-label-md">E-posta</span><span class="sub">Doğrulanmış adres: {{ maskedEmail }}</span></label>
            <input id="rem-email" v-model="form.email" type="checkbox" role="switch" class="switch" :aria-checked="form.email">
          </li>
        </ul>
      </fieldset>

      <div class="ics">
        <span class="ch-icon lime" aria-hidden="true"><Calendar :size="18"/></span>
        <span class="ch-copy"><span class="t-label-md">Takvime ekle (.ics)</span><span class="sub">Google, Outlook veya Apple Takvim</span></span>
        <button type="button" class="btn btn-outline" @click="downloadIcs">.ics indir</button>
      </div>
    </form>
    <template #footer>
      <button type="button" class="btn btn-outline" @click="emit('close')">Vazgeç</button>
      <button type="submit" form="reminder-form" class="btn btn-primary">Kaydet<ArrowRight aria-hidden="true"/></button>
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
