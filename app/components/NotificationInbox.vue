<script setup lang="ts">
import {ref} from 'vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {Notice} from '~/lib/notifications-helpers';
import NotificationCard from '~/components/NotificationCard.vue';

const app = useApp();
const {t: i18nT} = useLocale();
const branches = ref<{id: string; name: string}[]>([]);
const bid = ref('');
const items = ref<Notice[]>([]);
const cursor = ref('');
const next = ref<string | null>(null);
const reload = ref(0);
const busy = ref(false);
const error = ref('');

useClientEffect(() => [app.user, app.demo], () => {
  let cancelled = false;
  const user = app.user;
  if (!user || app.demo) return;
  user.getIdToken()
    .then(token => apiFetch('/api/businesses/manage', {headers: {Authorization: `Bearer ${token}`}}))
    .then(async r => {
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      if (!cancelled) branches.value = d.businesses;
    })
    .catch(e => {
      if (!cancelled) error.value = e.message;
    });
  return () => {
    cancelled = true;
  };
});

useClientEffect(() => [app.user, app.demo, bid.value, cursor.value, reload.value], () => {
  let cancelled = false;
  items.value = [];
  next.value = null;
  const user = app.user;
  if (!user || app.demo) return;
  busy.value = true;
  error.value = '';
  const after = cursor.value, box = bid.value;
  user.getIdToken()
    .then(token => apiFetch(`/api/notifications?after=${encodeURIComponent(after)}${box ? `&businessId=${encodeURIComponent(box)}` : ''}`, {headers: {Authorization: `Bearer ${token}`}}))
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

function selectBox(e: Event) {
  bid.value = (e.target as HTMLSelectElement).value;
  cursor.value = '';
}

async function markRead(n: Notice, read: boolean) {
  const user = app.user!;
  const r = await apiFetch('/api/notifications', {method: 'PATCH', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}`}, body: JSON.stringify({id: n.id, read})});
  const d = await r.json();
  if (!r.ok) throw Error(d.error);
  items.value = items.value.map(v => (v.id === n.id ? {...v, read} : v));
}
</script>

<template>
  <section class="stack">
    <h1>{{ i18nT('Bildirimler') }}</h1>
    <p>{{ i18nT('Uygulama içi talep güncellemeleri ve araç hatırlatmaları. E-posta veya push gönderildiği anlamına gelmez.') }}</p>
    <p v-if="app.demo" class="notice">{{ i18nT('Önizlemede gerçek bildirim oluşturulmaz.') }}</p>
    <NuxtLink v-else-if="!app.user" to="/giris">{{ i18nT('Giriş yap') }}</NuxtLink>
    <template v-else>
      <label>{{ i18nT('Bildirim kutusu') }}<select :value="bid" @change="selectBox"><option value="">{{ i18nT('Kişisel bildirimler') }}</option><option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option></select></label>
      <button class="button secondary" :disabled="busy" @click="reload++">{{ i18nT('Yenile') }}</button>
      <p v-if="busy" role="status">{{ i18nT('Yükleniyor…') }}</p>
      <template v-else><NotificationCard v-for="n in items" :key="n.id" :notice="n" :business="!!bid" :onRead="read=>markRead(n,read)"/></template>
      <p v-if="!busy&&!error&&!items.length">{{ i18nT('Bu sayfada bildirim yok.') }}</p>
      <div class="row"><button v-if="cursor" @click="cursor=''">{{ i18nT('İlk sayfa') }}</button><button v-if="next" @click="cursor=next!">{{ i18nT('Sonraki sayfa') }}</button></div>
    </template>
    <p v-if="error" role="alert">{{ i18nT(error) }}</p>
  </section>
</template>
