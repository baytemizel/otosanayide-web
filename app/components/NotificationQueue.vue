<script setup lang="ts">
import {ref} from 'vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {responseJson} from '~/lib/response-json';

type QueueJob = {id: string; state: string; attempts: number};

const app = useApp();
const {t: i18nT} = useLocale();
const state = ref('failed');
const items = ref<QueueJob[]>([]);
const reason = ref('');
const cursor = ref('');
const next = ref<string | null>(null);
const reload = ref(0);
const busy = ref(false);
const error = ref('');
const states = Object.entries({pending: 'Kuyrukta', processing: 'İşleniyor', retry: 'Tekrar denenecek', failed: 'Başarısız', delivered: 'Kutuya teslim edildi', superseded: 'Yeni durumla geçersizleşti'});

useClientEffect(() => [app.user, app.demo, state.value, cursor.value, reload.value], () => {
  let cancelled = false;
  items.value = [];
  next.value = null;
  const user = app.user;
  if (!user || app.demo) return;
  busy.value = true;
  error.value = '';
  const current = state.value, after = cursor.value;
  user.getIdToken()
    .then(token => apiFetch(`/api/admin/notifications?state=${current}&after=${encodeURIComponent(after)}`, {headers: {Authorization: `Bearer ${token}`}}))
    .then(async r => {
      const d = await responseJson(r);
      if (!r.ok) throw Error(d.error);
      if (!cancelled) {
        items.value = d.items;
        next.value = d.next;
      }
    })
    .catch(e => {
      if (!cancelled) error.value = e.message;
    })
    .finally(() => {
      if (!cancelled) busy.value = false;
    });
  return () => {
    cancelled = true;
  };
});

function selectState(e: Event) {
  state.value = (e.target as HTMLSelectElement).value;
  cursor.value = '';
}

async function requeue(j: QueueJob) {
  busy.value = true;
  error.value = '';
  try {
    const user = app.user!;
    const r = await apiFetch('/api/admin/notifications', {method: 'PATCH', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}`}, body: JSON.stringify({id: j.id, reason: reason.value.trim()})});
    const d = await responseJson(r);
    if (!r.ok) throw Error(d.error);
    reload.value++;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'İşlem tamamlanamadı.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="ds-card ds-pad24 ds-col ds-g16">
    <div class="ds-col ds-g4">
      <h3 style="margin:0">{{ i18nT('Bildirim teslim kuyruğu') }}</h3>
      <div class="ds-small ds-muted">{{ i18nT('Teslim, yalnızca uygulama içi kutuya yazılmasıdır. E-posta ve push sağlayıcısı bağlı değildir.') }}</div>
    </div>
    <div v-if="app.demo" class="ds-small ds-muted">{{ i18nT('Önizlemede gerçek bildirim oluşturulmaz.') }}</div>
    <div v-else-if="!app.user" class="ds-small ds-muted">{{ i18nT('İnceleme için yönetici hesabıyla giriş yap.') }}</div>
    <template v-else>
      <div class="ds-row ds-wrap ds-g12" style="align-items:flex-end">
        <label class="ds-col ds-f1" style="max-width:320px;min-width:200px"><span class="ds-label">{{ i18nT('Teslim durumu') }}</span><select class="ds-field" :value="state" @change="selectState"><option v-for="[k,label] in states" :key="k" :value="k">{{ i18nT(label) }}</option></select></label>
        <button class="ds-btn s" :disabled="busy" @click="reload++">{{ i18nT('Yenile') }}</button>
      </div>
      <label v-if="state==='failed'" class="ds-col"><span class="ds-label">{{ i18nT('Yeniden deneme gerekçesi') }}</span><textarea class="ds-field" minlength="10" maxlength="1000" v-model="reason" :disabled="busy"></textarea></label>
      <div v-if="busy" class="ds-small ds-muted" role="status">{{ i18nT('Yükleniyor…') }}</div>
      <template v-else>
        <article v-for="j in items" :key="j.id" class="ds-card ds-pad16 ds-row ds-sb ds-wrap ds-g12"><div class="ds-col ds-g4 ds-f1" style="min-width:180px"><span class="ds-small ds-b" :style="{overflowWrap:'anywhere'}">{{ j.id }}</span><span class="ds-xs ds-muted">{{ i18nT('Deneme sayısı') }}: {{ j.attempts }}</span></div><button v-if="j.state==='failed'" class="ds-btn s sm" :disabled="busy||reason.trim().length<10" @click="requeue(j)">{{ i18nT('Yeniden kuyruğa al') }}</button></article>
      </template>
      <div v-if="!busy&&!error&&!items.length" class="ds-small ds-muted">{{ i18nT('Bu sayfada bildirim yok.') }}</div>
      <div class="ds-row ds-wrap ds-g10"><button v-if="cursor" class="ds-btn s sm" @click="cursor=''">{{ i18nT('İlk sayfa') }}</button><button v-if="next" class="ds-btn s sm" @click="cursor=next!">{{ i18nT('Sonraki sayfa') }}</button></div>
    </template>
    <div v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</div>
  </section>
</template>
