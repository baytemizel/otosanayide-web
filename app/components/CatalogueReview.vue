<script setup lang="ts">
import {ref} from 'vue';
import type {PublicationAction} from '@otosanayide/core/catalogue-publication';
import CatalogueReviewCard from '~/components/CatalogueReviewCard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {responseJson} from '~/lib/response-json';
import type {CatalogueItem} from '~/lib/catalogue-review-helpers';

const app = useApp();
const {t: i18nT} = useLocale();
const items = ref<CatalogueItem[]>([]);
const published = ref(false);
const cursor = ref('');
const next = ref<string | null>(null);
const reload = ref(0);
const busy = ref(false);
const error = ref('');

useClientEffect(() => [app.user, app.demo, published.value, cursor.value, reload.value], () => {
  let stop = false;
  items.value = [];
  next.value = null;
  const user = app.user;
  const isPublished = published.value;
  const after = cursor.value;
  if (app.demo || !user) return;
  busy.value = true;
  error.value = '';
  user.getIdToken()
    .then(token => apiFetch(`/api/admin/catalogue?published=${isPublished}&after=${encodeURIComponent(after)}`, {headers: {Authorization: `Bearer ${token}`}}))
    .then(async r => {
      const d = await responseJson(r);
      if (!r.ok) throw Error(d.error);
      if (!stop) {
        items.value = d.items;
        next.value = d.next;
      }
    })
    .catch(e => {
      if (!stop) error.value = e.message;
    })
    .finally(() => {
      if (!stop) busy.value = false;
    });
  return () => {
    stop = true;
  };
});

function changePublished(e: Event) {
  published.value = (e.target as HTMLSelectElement).value === 'true';
  cursor.value = '';
}

async function act(v: CatalogueItem, a: PublicationAction) {
  const r = await apiFetch('/api/admin/catalogue', {method: 'PATCH', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await app.user!.getIdToken()}`}, body: JSON.stringify(a)});
  const d = await responseJson(r);
  if (!r.ok) throw Error(d.error);
  items.value = items.value.filter(x => x.id !== v.id);
}
</script>

<template>
  <section class="ds-col ds-g16">
    <div class="ds-col ds-g4">
      <h3 style="margin:0">{{ i18nT('Katalog yayın incelemesi') }}</h3>
      <div class="ds-small ds-muted">{{ i18nT('Kaynak, faaliyet, konum ve mükerrer kontrolü tamamlanmadan kayıt yayımlanmaz.') }}</div>
    </div>
    <div v-if="app.demo" class="ds-note warn">{{ i18nT('Önizlemede gerçek kayıtlar yayımlanmaz. Özel veri aktarımı ve yönetici hesabı gerekir.') }}</div>
    <div v-else-if="!app.user" class="ds-card ds-pad24 ds-small ds-muted">{{ i18nT('İnceleme için yönetici hesabıyla giriş yap.') }}</div>
    <template v-else>
      <div class="ds-row ds-wrap ds-g12" style="align-items:flex-end">
        <label class="ds-col ds-f1" style="max-width:320px;min-width:200px"><span class="ds-label">{{ i18nT('Yayın durumu') }}</span><select class="ds-field" :value="String(published)" @change="changePublished"><option value="false">{{ i18nT('Yayında değil') }}</option><option value="true">{{ i18nT('Yayında') }}</option></select></label>
        <button class="ds-btn s" :disabled="busy" @click="reload++">{{ i18nT('Yenile') }}</button>
      </div>
      <div v-if="busy" class="ds-small ds-muted" role="status">{{ i18nT('Yükleniyor…') }}</div>
      <template v-else>
        <CatalogueReviewCard v-for="v in items" :key="`${v.id}-${v.version}-${v.profileVersion}`" :item="v" :onSaved="() => { reload++; }" :onAction="(a: PublicationAction) => act(v, a)"/>
      </template>
      <div v-if="!busy&&!error&&!items.length" class="ds-card ds-pad24 ds-small ds-muted">{{ i18nT('Bu sayfada incelenecek katalog kaydı yok.') }}</div>
      <div class="ds-row ds-wrap ds-g10">
        <button v-if="cursor" class="ds-btn s sm" @click="cursor=''">{{ i18nT('İlk sayfa') }}</button>
        <button v-if="next" class="ds-btn s sm" @click="cursor=next!">{{ i18nT('Sonraki sayfa') }}</button>
      </div>
    </template>
    <div v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</div>
  </section>
</template>
