<script setup lang="ts">
import {ref} from 'vue';
import BrandCampaignCard from '~/components/BrandCampaignCard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {BrandAction, BrandView} from '@otosanayide/core/brand-campaigns';

function fresh(): BrandView {
  const start = new Date(Date.now() + 27 * 3600000).toISOString().slice(0, 10);
  return {id: crypto.randomUUID(), version: 0, status: 'draft', note: '', canReview: false, creative: {brand: '', headline: '', description: '', url: '', placement: 'home_banner', city: '', category: '', startDate: start, endDate: start}};
}

const app = useApp();
const {t} = useLocale();
const mediaEnabled = ref(false);
const items = ref<BrandView[]>([]);
const after = ref('');
const next = ref<string | null>(null);
const revision = ref(0);
const busy = ref(false);
const saving = ref(false);
const error = ref('');

useClientEffect(() => [app.user, app.demo, after.value, revision.value], () => {
  let stop = false;
  items.value = [];
  next.value = null;
  error.value = '';
  if (app.demo) {
    items.value = [fresh()];
    return;
  }
  const user = app.user;
  if (!user) return;
  busy.value = true;
  const cursor = after.value;
  user.getIdToken().then(token => apiFetch('/api/admin/brand-campaigns' + (cursor ? '?after=' + cursor : ''), {headers: {Authorization: `Bearer ${token}`}})).then(async r => {
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    if (!stop) {
      items.value = d.items;
      next.value = d.next;
      mediaEnabled.value = d.mediaEnabled === true;
    }
  }).catch(e => {
    if (!stop) error.value = e.message;
  }).finally(() => {
    if (!stop) busy.value = false;
  });
  return () => {
    stop = true;
  };
});

function setSaving(value: boolean) {
  saving.value = value;
}

function reload() {
  after.value = '';
  revision.value++;
}

function replaceSaved(saved: BrandView) {
  items.value = items.value.map(row => row.id === saved.id ? saved : row);
}

async function runAction(a: BrandAction) {
  saving.value = true;
  try {
    const r = await apiFetch('/api/admin/brand-campaigns', {method: 'PATCH', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await app.user?.getIdToken()}`}, body: JSON.stringify(a)});
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    items.value = items.value.map(v => v.id === d.item.id ? d.item : v);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="stack">
    <h2>{{ t('Marka Sponsorlukları') }}</h2>
    <p>{{ t('Marka kreatifleri finans yetkili yöneticilerce hazırlanır. İncelemeyi farklı bir yönetici yapar.') }}</p>
    <p class="small muted">{{ t('Referans sırasıyla sayfa başına 20 kayıt. Ticari yayın bağlantısı henüz açık değildir.') }}</p>
    <div v-if="!app.demo" class="row">
      <button class="button secondary" :disabled="busy||saving" @click="reload">{{ t('İlk sayfa / Yenile') }}</button>
      <button class="button primary" :disabled="busy||saving||!app.user||items.some(i=>i.version===0)" @click="items=[fresh(),...items]">{{ t('Yeni marka kampanyası') }}</button>
      <button v-if="next" class="button secondary" :disabled="busy||saving" @click="after=next!">{{ t('Sonraki sayfa') }}</button>
    </div>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <p v-if="error" role="alert" class="error">{{ t(error) }}</p>
    <fieldset :disabled="saving" class="stack" :style="{border:0,padding:0,minWidth:0}">
      <BrandCampaignCard v-for="item in items" :key="`${item.id}-${item.version}`" :item="item" :demo="app.demo" :mediaEnabled="mediaEnabled" :onBusy="setSaving" :onSaved="replaceSaved" :onAction="runAction"/>
    </fieldset>
    <p v-if="!busy&&!error&&!items.length">{{ t(app.user?'Gösterilecek marka kampanyası yok.':'Giriş yap') }}</p>
  </section>
</template>
