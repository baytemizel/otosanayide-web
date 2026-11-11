<script setup lang="ts">
import {ref} from 'vue';
import {Download} from '@lucide/vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {errorStatus} from '~/lib/api-read';
import {exportsApi, type ExportRequest} from '~/lib/member-api';

/** web-10: an operator prepares the copy by hand; there is no download in this product. */
const app = useApp();
const {t: i18nT, localeTag} = useLocale();
const items = ref<ExportRequest[]>([]);
const loading = ref(false);
const busy = ref(false);
const error = ref('');
const done = ref('');
let operationId = '';
const labels: Record<ExportRequest['status'], string> = {submitted: 'Talep alındı', in_progress: 'Hazırlanıyor', delivered: 'Teslim edildi', rejected: 'Reddedildi', cancelled: 'İptal edildi'};

function load() {
  const user = app.user;
  if (!user || app.demo) return;
  loading.value = true;
  error.value = '';
  exportsApi.read(() => user.getIdToken()).then(v => {
    items.value = v.items;
  }).catch(e => {
    error.value = errorStatus(e) === 403 ? 'Veri kopyası istemek için önce e-posta adresini doğrula.' : e instanceof Error ? e.message : 'Talepler yüklenemedi.';
  }).finally(() => {
    loading.value = false;
  });
}
useClientEffect(() => [app.user, app.demo], () => {
  items.value = [];
  load();
});

function message(e: unknown) {
  const status = errorStatus(e);
  if (status === 428) return 'Güvenlik için son 10 dakika içinde yeniden giriş yapman gerekiyor.';
  if (status === 409) return 'Açık bir veri kopyası talebin var.';
  if (status === 429) return 'Günde bir talep verebilirsin.';
  return e instanceof Error ? e.message : 'İşlem tamamlanamadı. Tekrar dene.';
}
async function request() {
  const user = app.user;
  if (!user || busy.value) return;
  busy.value = true;
  error.value = '';
  done.value = '';
  operationId ||= crypto.randomUUID();
  try {
    await exportsApi.create(() => user.getIdToken(), operationId);
    operationId = '';
    done.value = 'Talebin alındı. Kopya bir görevli tarafından elle hazırlanır; talep vermek kopyanın hazırlandığı anlamına gelmez.';
    load();
  } catch (e) {
    error.value = message(e);
  } finally {
    busy.value = false;
  }
}
async function cancel(item: ExportRequest) {
  const user = app.user;
  if (!user || busy.value) return;
  busy.value = true;
  error.value = '';
  try {
    await exportsApi.cancel(() => user.getIdToken(), item);
    load();
  } catch (e) {
    error.value = message(e);
  } finally {
    busy.value = false;
  }
}
const time = (v: number) => new Date(v).toLocaleString(localeTag.value, {timeZone: 'Europe/Istanbul'});
</script>

<template>
  <section class="ds-card ds-pad24 ds-col ds-g12 exports">
    <h2>{{ i18nT("Verilerini indir") }}</h2>
    <p class="ds-small ds-muted">{{ i18nT('Hesap, araç, yorum ve talep kayıtlarının kopyasını isteyebilirsin. Kopya otomatik üretilmez: bir görevli hazırlar ve teslim eder; bu sayfada indirme yoktur.') }}</p>
    <p v-if="app.demo" class="ds-small ds-muted">{{ i18nT('Önizleme hesabında veri talebi oluşturulmaz.') }}</p>
    <template v-else>
      <div><button type="button" class="ds-btn s" :disabled="busy || loading || items.some(i => ['submitted', 'in_progress'].includes(i.status))" @click="request"><Download :size="16"/>{{ busy ? i18nT('Gönderiliyor…') : i18nT("Veri kopyası iste") }}</button></div>
      <p v-if="done" class="ds-note ok" role="status">{{ i18nT(done) }}</p>
      <ul v-if="items.length" class="list">
        <li v-for="item in items" :key="item.id" class="ds-row ds-sb ds-wrap ds-g8">
          <span class="ds-small"><b>{{ i18nT(labels[item.status]) }}</b> · {{ time(item.createdAtMs) }}</span>
          <button v-if="item.status === 'submitted'" type="button" class="ds-btn g sm" :disabled="busy" @click="cancel(item)">{{ i18nT('Talebi iptal et') }}</button>
        </li>
      </ul>
    </template>
    <p v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</p>
  </section>
</template>

<style scoped>
.exports h2 {margin: 0; font: 700 19px/24.7px Arimo, Arial, sans-serif; letter-spacing: 0;}
.exports p {margin: 0;}
.list {list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px;}
</style>
