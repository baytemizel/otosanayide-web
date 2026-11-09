<script setup lang="ts">
import {ref} from 'vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';

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
      const d = await r.json();
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
    const d = await r.json();
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
  <section class="panel stack">
    <h2>{{ i18nT('Bildirim teslim kuyruğu') }}</h2>
    <p>{{ i18nT('Teslim, yalnızca uygulama içi kutuya yazılmasıdır. E-posta ve push sağlayıcısı bağlı değildir.') }}</p>
    <p v-if="app.demo">{{ i18nT('Önizlemede gerçek bildirim oluşturulmaz.') }}</p>
    <p v-else-if="!app.user">{{ i18nT('İnceleme için yönetici hesabıyla giriş yap.') }}</p>
    <template v-else>
      <label>{{ i18nT('Teslim durumu') }}<select :value="state" @change="selectState"><option v-for="[k,label] in states" :key="k" :value="k">{{ i18nT(label) }}</option></select></label>
      <button class="button secondary" :disabled="busy" @click="reload++">{{ i18nT('Yenile') }}</button>
      <label v-if="state==='failed'">{{ i18nT('Yeniden deneme gerekçesi') }}<textarea minlength="10" maxlength="1000" v-model="reason" :disabled="busy"></textarea></label>
      <p v-if="busy" role="status">{{ i18nT('Yükleniyor…') }}</p>
      <template v-else>
        <article v-for="j in items" :key="j.id" class="panel"><p :style="{overflowWrap:'anywhere'}">{{ j.id }}</p><p>{{ i18nT('Deneme sayısı') }}: {{ j.attempts }}</p><button v-if="j.state==='failed'" class="button secondary" :disabled="busy||reason.trim().length<10" @click="requeue(j)">{{ i18nT('Yeniden kuyruğa al') }}</button></article>
      </template>
      <p v-if="!busy&&!error&&!items.length">{{ i18nT('Bu sayfada bildirim yok.') }}</p>
      <div class="row"><button v-if="cursor" @click="cursor=''">{{ i18nT('İlk sayfa') }}</button><button v-if="next" @click="cursor=next!">{{ i18nT('Sonraki sayfa') }}</button></div>
    </template>
    <p v-if="error" role="alert">{{ i18nT(error) }}</p>
  </section>
</template>
