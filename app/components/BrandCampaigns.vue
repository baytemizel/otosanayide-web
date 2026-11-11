<script setup lang="ts">
import {ref} from 'vue';
import BrandCampaignCard from '~/components/BrandCampaignCard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {brandCampaignPage, brandCampaignSaved, readAdResponse} from '~/lib/ads-client';
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
    const d = await readAdResponse(r, raw => brandCampaignPage.parse(raw));
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
    const d = await readAdResponse(r, raw => brandCampaignSaved.parse(raw));
    items.value = items.value.map(v => v.id === d.item.id ? d.item : v);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="ds-col ds-g16">
    <h2>{{ t('Marka Sponsorlukları') }}</h2>
    <p>{{ t('Marka kreatifleri finans yetkili yöneticilerce hazırlanır. İncelemeyi farklı bir yönetici yapar.') }}</p>
    <p class="ds-small ds-muted">{{ t('Referans sırasıyla sayfa başına 20 kayıt. Ticari yayın bağlantısı henüz açık değildir.') }}</p>
    <div v-if="!app.demo" class="ds-row ds-g8 ds-wrap">
      <button class="ds-btn s" :disabled="busy||saving" @click="reload">{{ t('İlk sayfa / Yenile') }}</button>
      <button class="ds-btn p" :disabled="busy||saving||!app.user||items.some(i=>i.version===0)" @click="items=[fresh(),...items]">{{ t('Yeni marka kampanyası') }}</button>
      <button v-if="next" class="ds-btn s" :disabled="busy||saving" @click="after=next!">{{ t('Sonraki sayfa') }}</button>
    </div>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <p v-if="error" role="alert" class="ds-note err">{{ t(error) }}</p>
    <fieldset :disabled="saving" class="ds-col ds-g12 fs">
      <BrandCampaignCard v-for="item in items" :key="`${item.id}-${item.version}`" :item="item" :demo="app.demo" :mediaEnabled="mediaEnabled" :onBusy="setSaving" :onSaved="replaceSaved" :onAction="runAction"/>
    </fieldset>
    <p v-if="!busy&&!error&&!items.length">{{ t(app.user?'Gösterilecek marka kampanyası yok.':'Giriş yap') }}</p>
  </section>
</template>

<style scoped>
p,h2,h3,h4,h5{margin:0}
h2,h3,h4{font:700 19px/1.3 Arimo,Arial,Helvetica,sans-serif;letter-spacing:0}
h5{font-size:15px;line-height:1.5}
.fs{border:0;padding:0;margin:0;min-width:0}
@media(max-width:760px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;flex:0 1 auto;max-width:100%;text-align:center}}
</style>
