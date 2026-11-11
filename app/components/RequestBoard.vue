<script setup lang="ts">
import {computed, ref} from 'vue';
import {Calendar, ChevronLeft, ChevronRight, FileText, Inbox, Plus, RefreshCw} from '@lucide/vue';
import RequestCard from '~/components/RequestCard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {responseJson} from '~/lib/response-json';
import {contractReady} from '~/lib/contract';
import type {RequestItem} from '~/lib/request-board-helpers';

const props = withDefaults(defineProps<{business?: boolean; view?: 'inbox' | 'calendar'}>(), {business: false, view: undefined});

const app = useApp();
const {t: i18nT, localeTag} = useLocale();
const branches = ref<{id: string; name: string}[]>([]);
const bid = ref('');
const items = ref<RequestItem[]>([]);
const cursor = ref('');
const next = ref<string | null>(null);
const reload = ref(0);
const busy = ref(false);
const error = ref('');
const statusLabels: Record<string, string> = {requested: 'İşletme yanıtı bekleniyor', offered: 'Kullanıcı onayı bekleniyor', confirmed: 'Kesinleşti', declined: 'İşletme reddetti', cancelled: 'İptal edildi', completed: 'Tamamlandı'};
const statusTone: Record<string, string> = {requested: 'warn', offered: 'warn', confirmed: 'ok', declined: 'err', cancelled: 'neu', completed: 'ok'};
const chosenView = ref<'inbox' | 'calendar'>('inbox');
const activeView = computed(() => props.view ?? chosenView.value);
const selected = ref('');
const selectedItem = computed(() => items.value.find(i => i.id === selected.value));
const currentItem = computed(() => selectedItem.value ?? items.value[0]);
const week = ref(0);
const istanbulDate = (date: Date) => date.toLocaleDateString('sv-SE', {timeZone: 'Europe/Istanbul'});
const days = computed(() => {
  const today = new Date(`${istanbulDate(new Date())}T12:00:00Z`);
  const monday = today.getTime() - ((today.getUTCDay() + 6) % 7) * 86400000 + week.value * 7 * 86400000;
  return Array.from({length: 7}, (_, i) => {
    const date = new Date(monday + i * 86400000);
    return {key: date.toISOString().slice(0, 10), date, label: date.toLocaleDateString(localeTag.value, {weekday: 'short', day: 'numeric', timeZone: 'UTC'})};
  });
});
const weekLabel = computed(() => {
  const format = (date: Date) => date.toLocaleDateString(localeTag.value, {day: 'numeric', month: 'short', timeZone: 'UTC'});
  return `${format(days.value[0]!.date)} – ${format(days.value[6]!.date)}`;
});
const events = computed(() => items.value.flatMap(item => {
  if (item.kind !== 'appointments' || !item.offer?.startsAt || ['declined', 'cancelled'].includes(item.status)) return [];
  const at = new Date(item.offer.startsAt);
  return [{item, day: istanbulDate(at), hour: Number(at.toLocaleString('en-GB', {timeZone: 'Europe/Istanbul', hour: '2-digit', hourCycle: 'h23'}))}];
}));
const hours = computed(() => [...new Set([9, 10, 11, 12, 13, 14, 15, 16, 17, ...events.value.map(e => e.hour)])].sort((a, b) => a - b));
const eventsAt = (day: string, hour: number) => events.value.filter(e => e.day === day && e.hour === hour);

useClientEffect(() => [props.business, app.user, app.demo], () => {
  let cancelled = false;
  const user = app.user;
  if (!props.business || !user || app.demo) return;
  user.getIdToken().then(token => apiFetch('/api/businesses/manage', {headers: {Authorization: `Bearer ${token}`}})).then(async r => {
    const d = await responseJson(r);
    if (!r.ok) throw Error(d.error);
    if (!cancelled) {
      branches.value = d.businesses;
      bid.value = d.businesses[0]?.id ?? '';
    }
  }).catch(e => {
    if (!cancelled) error.value = e.message;
  });
  return () => {
    cancelled = true;
  };
});
useClientEffect(() => [app.user, app.demo, props.business, bid.value, cursor.value, reload.value], () => {
  let cancelled = false;
  items.value = [];
  next.value = null;
  const user = app.user, business = props.business, branch = bid.value, after = cursor.value;
  if (!user || app.demo || (business && !branch)) return;
  busy.value = true;
  error.value = '';
  user.getIdToken().then(token => apiFetch(`/api/requests?${contractReady.requestsV2 ? 'v=2&' : ''}after=${encodeURIComponent(after)}${business ? `&businessId=${encodeURIComponent(branch)}` : ''}`, {headers: {Authorization: `Bearer ${token}`}})).then(async r => {
    const d = await responseJson(r);
    if (!r.ok) throw Error(d.error);
    if (!cancelled) {
      items.value = d.items;
      next.value = d.next;
    }
  }).catch(e => {
    if (!cancelled) error.value = e.message;
  }).finally(() => {
    if (!cancelled) busy.value = false;
  });
  return () => {
    cancelled = true;
  };
});

function changeBranch(e: Event) {
  bid.value = (e.target as HTMLSelectElement).value;
  cursor.value = '';
}
async function action(value: Record<string, unknown>) {
  const r = await apiFetch('/api/requests', {method: 'PATCH', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await app.user!.getIdToken()}`}, body: JSON.stringify(value)});
  const d = await responseJson(r);
  if (!r.ok) throw Error(d.error);
  reload.value++;
}
</script>

<template>
  <section class="ds-col ds-g20 board">
    <h1 v-if="!business">{{ i18nT('Teklif ve randevular') }}</h1>
    <p class="ds-small ds-muted">{{ i18nT('Yanıtları ve talep durumunu buradan takip et. Otomatik e-posta veya bildirim gönderimi henüz açık değil.') }}</p>
    <p v-if="app.demo" class="ds-note info">{{ i18nT('Önizlemede gerçek talep veya rezervasyon oluşturulmaz.') }}</p>
    <NuxtLink v-else-if="!app.user" class="ds-btn p login" to="/giris">{{ i18nT('Giriş yap') }}</NuxtLink>
    <template v-else>
      <div class="ds-row ds-wrap ds-g12 tools">
        <label v-if="business" class="f branch"><span class="ds-label">{{ i18nT('İşletme / şube') }}</span><select class="ds-field" :value="bid" @change="changeBranch">
          <option value="">{{ i18nT('İşletme seç') }}</option>
          <option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option>
        </select></label>
        <div v-if="business&&!view" class="ds-seg" role="group" :aria-label="i18nT('Görünüm')">
          <button type="button" :class="activeView==='inbox'?'on':''" :aria-pressed="activeView==='inbox'" @click="chosenView='inbox'"><Inbox :size="15"/>{{ i18nT('Teklif kutusu') }}</button>
          <button type="button" :class="activeView==='calendar'?'on':''" :aria-pressed="activeView==='calendar'" @click="chosenView='calendar'"><Calendar :size="15"/>{{ i18nT('Randevu takvimi') }}</button>
        </div>
        <button type="button" class="ds-btn s" :disabled="busy" @click="reload++"><RefreshCw :size="16"/>{{ i18nT('Yenile') }}</button>
      </div>
      <p v-if="busy" role="status" class="ds-small ds-muted">{{ i18nT('Yükleniyor…') }}</p>
      <template v-else>
        <div v-if="business&&activeView==='inbox'&&items.length" class="split">
          <div class="ds-card list">
            <button v-for="item in items" :key="item.id" type="button" :class="`row-item ${currentItem?.id===item.id?'on':''}`" :aria-current="currentItem?.id===item.id?'true':undefined" @click="selected=item.id">
              <span class="ds-avatar"><FileText v-if="item.kind==='quotes'" :size="16"/><Calendar v-else :size="16"/></span>
              <span class="ds-f1 ds-col ds-g4">
                <strong class="ds-small clip">{{ item.service }}</strong>
                <span class="ds-small clip">{{ item.vehicle }}</span>
                <span :class="`ds-badge ${statusTone[item.status]??'neu'} badge`">{{ i18nT(statusLabels[item.status]??'Belirtilmedi') }}</span>
              </span>
            </button>
          </div>
          <RequestCard v-if="currentItem" :key="`${currentItem.id}-${currentItem.version}`" :item="currentItem" :business="business" :onAction="action"/>
        </div>
        <div v-else-if="business&&activeView==='calendar'" class="ds-col ds-g16">
          <div class="ds-row ds-sb ds-wrap ds-g12">
            <div class="ds-row ds-g8">
              <button type="button" class="ds-iconbtn" :aria-label="i18nT('Önceki hafta')" @click="week--"><ChevronLeft :size="18"/></button>
              <button type="button" class="ds-iconbtn" :aria-label="i18nT('Sonraki hafta')" @click="week++"><ChevronRight :size="18"/></button>
              <strong class="range">{{ weekLabel }}</strong>
            </div>
            <button type="button" class="ds-btn s sm ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')"><Plus :size="15"/>{{ i18nT('İzin / bayram ekle') }}</button>
          </div>
          <div class="calendar">
            <div class="ds-card ds-table-wrap">
              <table class="ds-table cal-table">
                <thead><tr><th scope="col"><span class="sr">{{ i18nT('Saat') }}</span></th><th v-for="d in days" :key="d.key" scope="col">{{ d.label }}</th></tr></thead>
                <tbody>
                  <tr v-for="h in hours" :key="h">
                    <th scope="row" class="hour">{{ String(h).padStart(2,'0') }}.00</th>
                    <td v-for="d in days" :key="d.key" class="cell">
                      <button v-for="e in eventsAt(d.key,h)" :key="e.item.id" type="button" :class="`event ${statusTone[e.item.status]??'neu'}`" @click="selected=e.item.id"><strong>{{ e.item.service }}</strong><span>{{ i18nT(statusLabels[e.item.status]??'Belirtilmedi') }}</span></button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <aside class="ds-card ds-pad24 ds-col ds-g12 ds-passive" aria-disabled="true" :title="i18nT('Yakında')">
              <h2 class="t19">{{ i18nT('Kapasite') }}</h2>
              <span class="ds-small">{{ i18nT('Eşzamanlı araç') }}</span>
              <span class="ds-small">{{ i18nT('Slot süresi') }}</span>
              <span class="ds-small">{{ i18nT('Onay modeli') }}</span>
              <div class="ds-divider"></div>
              <div class="ds-row ds-sb ds-g12"><span class="ds-small">{{ i18nT('Yeni randevu alımı') }}</span><span class="ds-switch" aria-hidden="true"></span></div>
            </aside>
          </div>
          <p class="ds-xs ds-muted">{{ i18nT('Yalnız saati önerilmiş randevular takvimde görünür.') }}</p>
          <RequestCard v-if="selectedItem" :key="`${selectedItem.id}-${selectedItem.version}`" :item="selectedItem" :business="business" :onAction="action"/>
        </div>
        <template v-else-if="!business">
          <RequestCard v-for="item in items" :key="`${item.id}-${item.version}`" :item="item" :business="business" :onAction="action"/>
        </template>
      </template>
      <p v-if="!busy&&!error&&!items.length" class="ds-small ds-muted">{{ i18nT('Bu sayfada talep yok.') }}</p>
      <div class="ds-row ds-g8">
        <button v-if="cursor" type="button" class="ds-btn s sm" @click="cursor=''">{{ i18nT('İlk sayfa') }}</button>
        <button v-if="next" type="button" class="ds-btn s sm" @click="cursor=next!">{{ i18nT('Sonraki sayfa') }}</button>
      </div>
    </template>
    <p v-if="error" role="alert" class="ds-note err">{{ i18nT(error) }}</p>
  </section>
</template>

<style scoped>
p, h1, h2 {margin: 0;}
h1 {font-size: 34px; line-height: 38px;}
.t19 {font-family: Arimo, Arial, Helvetica, sans-serif; letter-spacing: 0; font-size: 19px; line-height: 24.7px;}
.board {min-width: 0;}
.login {align-self: flex-start;}
.tools {align-items: flex-end;}
.f {display: block; min-width: 0;}
.f .ds-label {display: block;}
.f .ds-field {font-size: 15px;}
.branch {flex: 1 1 260px; max-width: 420px;}
.split {display: grid; grid-template-columns: 380px minmax(0, 1fr); gap: 20px; align-items: start;}
.list {overflow: hidden;}
.row-item {display: flex; align-items: flex-start; gap: 12px; width: 100%; padding: 14px 16px; background: #fff; border: 0; border-bottom: 1px solid #edf0f3; color: #10243a; text-align: left; cursor: pointer;}
.row-item:last-child {border-bottom: 0;}
.row-item.on {background: #fff3ec;}
.clip {overflow-wrap: anywhere;}
.badge {align-self: flex-start;}
.range {font-size: 15px; margin-left: 4px;}
.calendar {display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 20px; align-items: start;}
.cal-table {min-width: 720px;}
.sr {position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap;}
.hour {width: 72px; background: none; font-size: 12px; font-weight: 400; color: #586879; text-transform: none; letter-spacing: 0; border-bottom: 1px solid #edf0f3;}
.cell {height: 62px; padding: 4px;}
.event {display: flex; flex-direction: column; width: 100%; padding: 6px 8px; border: 0; border-left: 4px solid #9aa7b5; border-radius: 8px; background: #eef1f4; color: #10243a; font-size: 12px; text-align: left; overflow-wrap: anywhere; cursor: pointer;}
.event span {color: #586879;}
.event.ok {background: #e8f4ee; border-left-color: #21684e;}
.event.warn {background: #fff6df; border-left-color: #8a5a00;}
.event.err {background: #fdecea; border-left-color: #b42318;}
@media (max-width: 1100px) {
  .split, .calendar {grid-template-columns: minmax(0, 1fr);}
}
@media (max-width: 760px) {
  h1 {font-size: 28px; line-height: 32px;}
}
</style>
