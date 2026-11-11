<script setup lang="ts">
import {computed, ref} from 'vue';
import {Info} from '@lucide/vue';
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
const view = ref<'open' | 'answered'>('open');
const visible = computed(() => items.value.filter(r => (['pending', 'approved'].includes(r.replyDraft?.status ?? '') ? view.value === 'answered' : view.value === 'open')));

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
  <section v-if="app.demo" class="ds-card ds-pad24 ds-col ds-g8"><h3>{{ i18nT("İşletme yanıtları") }}</h3><p class="ds-small ds-muted">{{ i18nT("Doğrulanmış işletme hesabınla yayımlanan yorumları yanıtlayabilir, inceleme durumunu takip edebilir ve yanıtını geri çekebilirsin. Önizlemede gerçek yanıt oluşturulmaz.") }}</p></section>
  <section v-else-if="!app.user" class="ds-card ds-pad24 ds-col ds-g12"><p>{{ i18nT("İşletme hesabınla giriş yap.") }}</p><div><NuxtLink class="ds-btn s sm" to="/isletme/giris">{{ i18nT("Giriş yap") }}</NuxtLink></div></section>
  <template v-else>
    <div class="ds-row ds-wrap ds-g12 toolbar">
      <label class="ds-col ds-f1 branch"><span class="ds-label">{{ i18nT("İşletme / şube") }}</span><select class="ds-field" :value="id" @change="selectBusiness"><option value="">{{ i18nT("İşletme seç") }}</option><option v-for="b in businesses" :key="b.id" :value="b.id">{{ b.name }}</option></select></label>
      <button class="ds-btn s sm" :disabled="loading" @click="reload++">{{ i18nT("Yenile") }}</button>
    </div>
    <div class="ds-row ds-sb ds-wrap ds-g12">
      <div class="ds-tabs">
        <button type="button" :class="{on: view==='open'}" :aria-pressed="view==='open'" @click="view='open'">{{ i18nT("Yanıt bekleyen") }}</button>
        <button type="button" :class="{on: view==='answered'}" :aria-pressed="view==='answered'" @click="view='answered'">{{ i18nT("Yanıtlanan") }}</button>
        <button type="button" class="ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT("Bildirilen") }}</button>
      </div>
      <select class="ds-field ds-passive rating" disabled aria-disabled="true" :title="i18nT('Yakında')" :aria-label="i18nT('Tüm puanlar')"><option>{{ i18nT("Tüm puanlar") }}</option></select>
    </div>
    <div v-if="error" role="alert" class="ds-note err">{{ i18nT(error) }}</div>
    <p v-if="loading" role="status" class="ds-small ds-muted">{{ i18nT("Yorumlar yükleniyor…") }}</p>
    <template v-else><BusinessReplyCard v-for="r in visible" :key="`${r.id}-${r.replyDraft?.version??0}`" :review="r" :draft="r.replyDraft" :onSubmit="(text,v)=>send(r.id,v,text)" :onWithdraw="v=>send(r.id,v)"/></template>
    <p v-if="!loading && !error && !items.length" class="ds-small ds-muted">{{ i18nT("Yanıtlanabilecek yayımlanmış yorum yok.") }}</p>
    <p v-else-if="!loading && !error && !visible.length" class="ds-small ds-muted">{{ i18nT("Bu sekmede gösterilecek yorum yok.") }}</p>
    <div v-if="cursor || next" class="ds-row ds-g10 ds-wrap"><button v-if="cursor" class="ds-btn s sm" @click="cursor=''">{{ i18nT("İlk sayfa") }}</button><button v-if="next" class="ds-btn s sm" @click="cursor=next!">{{ i18nT("Sonraki sayfa") }}</button></div>
    <div class="ds-note"><Info :size="16" class="ds-i"/><span>{{ i18nT("Kullanıcı yorumlarını ve fotoğraflarını silemezsiniz; kural ihlali için bildirebilirsiniz. Reklam bütçesi moderasyonu etkilemez.") }}</span></div>
  </template>
</template>

<style scoped>
p {margin: 0;}
h3 {margin: 0;}
.toolbar {align-items: flex-end;}
.branch {min-width: 240px; max-width: 480px;}
.rating {width: 200px; height: 40px; min-height: 40px;}
@media (max-width: 480px) {
  .rating {width: 100%;}
}
</style>
