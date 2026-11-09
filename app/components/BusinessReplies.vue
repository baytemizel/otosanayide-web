<script setup lang="ts">
import {ref} from 'vue';
import BusinessReplyCard from '~/components/BusinessReplyCard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {ReplyDraft} from '~/lib/business-replies-helpers';
import type {ReviewView} from '~/lib/reviews-helpers';

const {t: i18nT} = useLocale();
const app = useApp();
const businesses = ref<{id: string; name: string}[]>([]);
const id = ref('');
const items = ref<(ReviewView & {replyDraft: ReplyDraft | null})[]>([]);
const cursor = ref('');
const next = ref<string | null>(null);
const loading = ref(false);
const error = ref('');
const reload = ref(0);

useClientEffect(() => [app.user, app.demo], () => {
  let cancel = false;
  const user = app.user;
  if (!user || app.demo) return;
  user
    .getIdToken()
    .then(token => apiFetch('/api/businesses/manage', {headers: {Authorization: `Bearer ${token}`}}))
    .then(async r => {
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      if (!cancel) {
        businesses.value = d.businesses;
        id.value = d.businesses[0]?.id ?? '';
      }
    })
    .catch(e => {
      if (!cancel) error.value = e.message;
    });
  return () => {
    cancel = true;
  };
});

useClientEffect(() => [app.user, app.demo, id.value, cursor.value, reload.value], () => {
  let cancel = false;
  items.value = [];
  next.value = null;
  const user = app.user;
  const businessId = id.value;
  const after = cursor.value;
  if (!user || app.demo || !businessId) return;
  loading.value = true;
  error.value = '';
  user
    .getIdToken()
    .then(token => apiFetch(`/api/businesses/replies?businessId=${encodeURIComponent(businessId)}${after ? `&after=${encodeURIComponent(after)}` : ''}`, {headers: {Authorization: `Bearer ${token}`}}))
    .then(async r => {
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      if (!cancel) {
        items.value = d.reviews;
        next.value = d.nextCursor;
      }
    })
    .catch(e => {
      if (!cancel) error.value = e.message;
    })
    .finally(() => {
      if (!cancel) loading.value = false;
    });
  return () => {
    cancel = true;
  };
});

async function send(reviewId: string, version: number, text?: string) {
  const r = await apiFetch('/api/businesses/replies', {method: text === undefined ? 'PATCH' : 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await app.user!.getIdToken()}`}, body: JSON.stringify({businessId: id.value, reviewId, expectedVersion: version, ...(text === undefined ? {} : {text})})});
  const d = await r.json();
  if (!r.ok) throw Error(d.error);
  reload.value += 1;
}
function selectBusiness(e: Event) {
  id.value = (e.target as HTMLSelectElement).value;
  cursor.value = '';
}
</script>

<template>
  <section v-if="app.demo" class="panel"><h2>{{ i18nT("İşletme yanıtları") }}</h2><p>{{ i18nT("Doğrulanmış işletme hesabınla yayımlanan yorumları yanıtlayabilir, inceleme durumunu takip edebilir ve yanıtını geri çekebilirsin. Önizlemede gerçek yanıt oluşturulmaz.") }}</p></section>
  <p v-else-if="!app.user">{{ i18nT("İşletme hesabınla giriş yap.") }}</p>
  <template v-else>
    <label>{{ i18nT("İşletme / şube") }}<select :value="id" @change="selectBusiness"><option value="">{{ i18nT("İşletme seç") }}</option><option v-for="b in businesses" :key="b.id" :value="b.id">{{ b.name }}</option></select></label>
    <button class="button secondary" :disabled="loading" @click="reload++">{{ i18nT("Yenile") }}</button>
    <p v-if="error" role="alert" class="error">{{ i18nT(error) }}</p>
    <p v-if="loading" role="status">{{ i18nT("Yorumlar yükleniyor…") }}</p>
    <template v-else><BusinessReplyCard v-for="r in items" :key="`${r.id}-${r.replyDraft?.version??0}`" :review="r" :draft="r.replyDraft" :onSubmit="(text,v)=>send(r.id,v,text)" :onWithdraw="v=>send(r.id,v)"/></template>
    <p v-if="!loading && !error && !items.length">{{ i18nT("Yanıtlanabilecek yayımlanmış yorum yok.") }}</p>
    <div class="row"><button v-if="cursor" class="button secondary" @click="cursor=''">{{ i18nT("İlk sayfa") }}</button><button v-if="next" class="button secondary" @click="cursor=next!">{{ i18nT("Sonraki sayfa") }}</button></div>
  </template>
</template>
