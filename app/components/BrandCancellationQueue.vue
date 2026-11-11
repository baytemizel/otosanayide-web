<script setup lang="ts">
import {computed, ref} from 'vue';
import {z} from 'zod';
import BrandCancellation from '~/components/BrandCancellation.vue';
import BrandCancellationHistory from '~/components/BrandCancellationHistory.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {brandCancellationQuery, brandCancellationResponse, brandCancellationLabels, brandRefundLabels} from '@otosanayide/core/brand-cancellation';
import {cancellationFilters, cancellationFilterLabels, cancellationQueueResponse} from '@otosanayide/core/brand-cancellation-queue';

type View = z.infer<typeof brandCancellationResponse>;
const queueResponse = cancellationQueueResponse.extend({enabled: z.boolean()});
type QueueData = z.infer<typeof queueResponse>;

const app = useApp();
const {t} = useLocale();
const filter = ref<typeof cancellationFilters[number]>('pending');
const data = ref<QueueData | null>(null);
const id = ref('');
const selected = ref<View | null>(null);
const revision = ref(0);
const busy = ref(false);
const childBusy = ref(false);
const error = ref('');
let lock = false;

async function load(after?: string, lookup = false) {
  if (app.demo || lock || childBusy.value) return;
  const currentId = id.value, currentFilter = filter.value;
  lock = true;
  busy.value = true;
  error.value = '';
  selected.value = null;
  if (!lookup) data.value = null;
  try {
    const query = lookup ? brandCancellationQuery.parse({reservationId: currentId.trim()}) : {filter: currentFilter, ...(after ? {after} : {})};
    const r = await apiFetch('/api/admin/' + (lookup ? 'brand-cancellations' : 'brand-cancellation-queue') + '?' + new URLSearchParams(query), {headers: {Authorization: `Bearer ${await app.user?.getIdToken()}`}, cache: 'no-store'}), raw = await r.json();
    if (!r.ok) throw Error(raw.error);
    if (lookup) {
      const d = brandCancellationResponse.parse(raw);
      if (d.reservationId !== currentId.trim()) throw Error('Kayıt değişti. Sayfayı yenile.');
      selected.value = d;
    } else {
      const d = queueResponse.parse(raw);
      if (d.filter !== currentFilter) throw Error('Kayıt değişti. Sayfayı yenile.');
      data.value = d;
    }
  } catch (e) {
    error.value = e instanceof Error && !e.message.startsWith('[') ? e.message : 'Geçerli bir rezervasyon referansı gir.';
  } finally {
    lock = false;
    busy.value = false;
  }
}

const disabled = computed(() => busy.value || childBusy.value);

function changeFilter(e: Event) {
  filter.value = (e.target as HTMLSelectElement).value as typeof filter.value;
  data.value = null;
  selected.value = null;
  error.value = '';
}

function submitLookup(e: Event) {
  e.preventDefault();
  void load(undefined, true);
}

function changeId(e: Event) {
  id.value = (e.target as HTMLInputElement).value;
  selected.value = null;
}

function openItem(item: QueueData['items'][number], enabled: boolean) {
  selected.value = {...item, enabled};
  error.value = '';
}

function setChildBusy(value: boolean) {
  childBusy.value = value;
}

function updated(view: View) {
  selected.value = view;
  revision.value++;
  const previous = data.value;
  const current = filter.value as string;
  data.value = previous ? {...previous, items: previous.items.map(item => item.reservationId === view.reservationId ? view : item).filter(item => current === 'all' || (['requires_review', 'needs_review', 'refunded'].includes(current) ? item.refund?.status : item.cancellation?.status) === current)} : previous;
}
</script>

<template>
  <section class="ds-card ds-pad24 ds-col ds-g16">
    <h2>{{ t('Marka İptal ve İade Kuyruğu') }}</h2>
    <p class="ds-note info ds-col">{{ t('İade filtreleri birincil durumu gösterir. Ek iadeleri karar geçmişinden kontrol et; bu ekran para transferi yapmaz.') }}</p>
    <p v-if="app.demo">{{ t('Demo modunda gerçek iptal ve iade dosyaları gösterilmez.') }}</p>
    <template v-else>
      <label class="fld"><span class="ds-label">{{ t('İptal ve iade filtresi') }}</span><select class="ds-field" :value="filter" :disabled="disabled" @change="changeFilter"><option v-for="f in cancellationFilters" :key="f" :value="f">{{ t(cancellationFilterLabels[f]) }}</option></select></label>
      <div class="ds-row ds-g8 ds-wrap">
        <button class="ds-btn s" :disabled="disabled||!app.user" @click="void load()">{{ t('İptal kuyruğunu yenile') }}</button>
        <button v-if="data?.next" class="ds-btn s" :disabled="disabled" @click="void load(data.next!)">{{ t('Sonraki sayfa') }}</button>
      </div>
      <small class="ds-xs ds-muted">{{ t('Referans sırasıyla en fazla 20 kayıt. Değişen dosyalar nedeniyle sayfa daha kısa olabilir.') }}</small>
      <form class="ds-col ds-g12" @submit="submitLookup">
        <label class="fld"><span class="ds-label">{{ t('Rezervasyon referansı') }}</span><input class="ds-field" :value="id" maxlength="36" :disabled="disabled" @input="changeId"/></label>
        <button class="ds-btn s" :disabled="disabled||!app.user||!id.trim()">{{ t('Eski Rezervasyonu Aç') }}</button>
      </form>
      <p v-if="data&&!data.items.length" role="status">{{ t('Bu filtrede iptal dosyası bulunamadı.') }}</p>
      <article v-for="item in data?.items" :key="item.reservationId" class="ds-note ds-col">
        <strong>{{ t(brandCancellationLabels[item.cancellation!.status]) }}</strong>
        <small class="ds-xs ds-muted brk">{{ item.reservationId }}</small>
        <span v-if="item.refund">{{ t(brandRefundLabels[item.refund.status]) }}</span>
        <button class="ds-btn s" :disabled="disabled" @click="openItem(item,data!.enabled)">{{ t('Dosyayı ve Geçmişi Aç') }}</button>
      </article>
      <div v-if="selected" class="ds-col ds-g12">
        <h3 class="brk">{{ t('Rezervasyon referansı') }}: {{ selected.reservationId }}</h3>
        <BrandCancellation :key="selected.reservationId" :id="selected.reservationId" :initialData="selected" :disabled="busy" :onBusy="setChildBusy" :onUpdated="updated"/>
        <BrandCancellationHistory v-if="selected.cancellation" :key="`${selected.reservationId}-${revision}`" :id="selected.reservationId"/>
      </div>
    </template>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <p v-if="error" role="alert" class="ds-note err">{{ t(error) }}</p>
  </section>
</template>

<style scoped>
p,h2,h3,h4,h5{margin:0}
h2,h3,h4{font:700 19px/1.3 Arimo,Arial,Helvetica,sans-serif;letter-spacing:0}
h5{font-size:15px;line-height:1.5}
.fld{display:flex;flex-direction:column;min-width:0;font-size:15px;font-weight:400}
.brk{overflow-wrap:anywhere}
@media(max-width:760px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;flex:0 1 auto;max-width:100%;text-align:center}}
</style>
