<script setup lang="ts">
import {computed, ref, type Component} from 'vue';
import {Bell, CarFront, FileText, Heart, Inbox, Lock, MessageSquare, Plus, UserRound} from '@lucide/vue';
import {sampleBusinesses} from '@otosanayide/core';
import {fetchFavorites} from '@otosanayide/core/favorites-client';
import type {FavoriteEntry} from '@otosanayide/core/favorites';
import BusinessCard from '~/components/BusinessCard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useSavedLists} from '~/composables/useSavedLists';
import {contractReady} from '~/lib/contract';
import {useLocale} from '~/composables/useLocale';
import {apiFetch, apiOrigin} from '~/lib/api';

const {t, locale} = useLocale();
const app = useApp();
const entries = ref<FavoriteEntry[]>([]);
const next = ref<string | null>(null);
const busy = ref(true);
const error = ref(false);
const retry = ref(0);
const accountNav: {label: string; to?: string; icon: Component}[] = [
  {label: 'Araçlarım', to: '/araclarim', icon: CarFront},
  {label: 'Hatırlatmalar', to: '/araclarim', icon: Bell},
  {label: 'Kaydedilenler', to: '/kaydedilenler', icon: Heart},
  {label: 'Taleplerim', to: '/taleplerim', icon: Inbox},
  {label: 'Yorumlarım', to: '/yorumlarim', icon: MessageSquare},
  {label: 'Bildirimler', to: '/bildirimler', icon: Bell},
  {label: 'Başvurularım', to: '/basvurularim', icon: FileText},
  {label: 'Hesabım', to: '/hesabim', icon: UserRound},
  {label: 'Gizlilik ve veri', to: '/hesabim#gizlilik', icon: Lock},
];
const saved = useSavedLists();
const selected = ref('');
const creating = ref(false);
const listName = ref('');
const listsOn = computed(() => contractReady.accountExtras && !app.demo && !!app.user);
const plainLists = computed(() => saved.lists.value.filter(l => l.kind === 'list'));
const comparisons = computed(() => saved.lists.value.filter(l => l.kind === 'comparison'));
const current = computed(() => saved.lists.value.find(l => l.id === selected.value) ?? null);
const shown = computed(() => (current.value ? entries.value.filter(e => current.value!.businessIds.includes(e.id)) : entries.value));
useClientEffect(() => [app.user, app.demo], () => {
  selected.value = '';
  if (listsOn.value) void saved.load();
});
async function createList(e: Event) {
  e.preventDefault();
  if (!listName.value.trim()) return;
  const created = await saved.create(listName.value, 'list');
  if (created) {
    listName.value = '';
    creating.value = false;
    selected.value = created.id;
  }
}
function addTo(e: Event, businessId: string) {
  const target = e.target as HTMLSelectElement;
  const list = saved.lists.value.find(l => l.id === target.value);
  target.value = '';
  if (list) void saved.add(list, businessId);
}
let active = false;
const session = {
  open: () => {
    active = true;
  },
  close: () => {
    active = false;
  },
  check: () => {
    if (!active) throw Error('session_changed');
  },
  valid: () => active,
};

function options(uid: string, user: NonNullable<typeof app.user>) {
  const check = app.accountGuard(uid);
  return {
    origin: apiOrigin(),
    request: apiFetch,
    token: () => user.getIdToken(),
    guard: () => {
      session.check();
      check();
    },
    locale: locale.value,
  };
}

useClientEffect(
  () => [app.member, app.demo, app.user, locale.value, retry.value, app.data.favorites],
  () => {
    session.open();
    let current = true;
    Promise.resolve()
      .then(async () => {
        if (!app.member) return {entries: [], next: null};
        if (app.demo) return {entries: sampleBusinesses.filter(b => app.data.favorites.includes(b.id)).map(b => ({id: b.id, business: b})), next: null};
        const user = app.user;
        if (!user) throw Error('auth');
        return fetchFavorites(options(user.uid, user), {});
      })
      .then(value => {
        if (current && 'entries' in value) {
          entries.value = value.entries;
          next.value = value.next;
          error.value = false;
        }
      })
      .catch(() => {
        if (current) error.value = true;
      })
      .finally(() => {
        if (current) busy.value = false;
      });
    return () => {
      current = false;
      session.close();
    };
  },
);

async function request(action: Parameters<typeof fetchFavorites>[1]) {
  const user = app.user;
  if (!user) throw Error('auth');
  return fetchFavorites(options(user.uid, user), action);
}

async function more() {
  if (!next.value || busy.value) return;
  busy.value = true;
  try {
    const page = await request({cursor: next.value});
    session.check();
    if (!('entries' in page)) throw Error('response');
    entries.value = [...entries.value, ...page.entries.filter(e => !entries.value.some(v => v.id === e.id))];
    next.value = page.next;
    error.value = false;
  } catch {
    if (session.valid()) error.value = true;
  } finally {
    if (session.valid()) busy.value = false;
  }
}

async function remove(id: string) {
  if (busy.value) return;
  busy.value = true;
  try {
    if (app.demo || app.data.favorites.includes(id)) await app.toggleFavorite(id);
    else await request({write: {businessId: id, adding: false}});
    session.check();
    entries.value = entries.value.filter(e => e.id !== id);
    error.value = false;
  } catch {
    if (session.valid()) error.value = true;
  } finally {
    if (session.valid()) busy.value = false;
  }
}

function again() {
  busy.value = true;
  retry.value++;
}
</script>

<template>
  <div class="ds-container saved" id="content">
    <div :class="app.member?'layout':''">
      <nav v-if="app.member" class="acct" :aria-label="t('Hesap menüsü')">
        <template v-for="n in accountNav" :key="n.label">
          <NuxtLink v-if="n.to" :to="n.to" :class="n.to==='/kaydedilenler'?'on':''" :aria-current="n.to==='/kaydedilenler'?'page':undefined"><component :is="n.icon" :size="18"/>{{ t(n.label) }}</NuxtLink>
          <span v-else class="ds-passive" aria-disabled="true" :title="t('Yakında')"><component :is="n.icon" :size="18"/>{{ t(n.label) }}</span>
        </template>
      </nav>
      <div class="ds-col ds-g20 content">
        <div class="ds-row ds-sb ds-wrap ds-g12">
          <div class="ds-col ds-g4">
            <h1>{{ t('Kaydedilenler') }}</h1>
            <p class="ds-small ds-muted">{{ t('Kaydettiğin işletmeler burada.') }}</p>
          </div>
          <button v-if="app.member&&listsOn" type="button" class="ds-btn s" :aria-expanded="creating" @click="creating=!creating"><Plus :size="16"/>{{ t('Yeni liste') }}</button>
          <button v-else-if="app.member" type="button" class="ds-btn s ds-passive" disabled aria-disabled="true" :title="t('Yakında')"><Plus :size="16"/>{{ t('Yeni liste') }}</button>
        </div>
        <div v-if="!app.member" class="ds-card ds-pad24 ds-col ds-g12 state">
          <h2 class="t19">{{ t('Favorilerin için ücretsiz hesabına giriş yap.') }}</h2>
          <NuxtLink class="ds-btn p" to="/giris">{{ t('Giriş yap') }}</NuxtLink>
        </div>
        <template v-else>
          <form v-if="creating&&listsOn" class="ds-row ds-g8 ds-wrap new-list" @submit="createList">
            <label class="ds-f1"><span class="ds-label">{{ t('Liste adı') }}</span><input v-model="listName" class="ds-field" maxlength="60" required/></label>
            <button class="ds-btn p" :disabled="saved.busy.value||!listName.trim()">{{ t('Oluştur') }}</button>
          </form>
          <div class="ds-row ds-g8 ds-wrap" role="group" :aria-label="t('Listeler')">
            <button type="button" class="ds-chip" :class="{on:!selected}" :aria-pressed="!selected" @click="selected=''">{{ t('Tümü') }}<span v-if="!next" class="n">{{ entries.length }}</span></button>
            <button v-for="l in plainLists" :key="l.id" type="button" class="ds-chip" :class="{on:selected===l.id}" :aria-pressed="selected===l.id" @click="selected=l.id">{{ l.name }}<span class="n">{{ l.businessIds.length }}</span></button>
          </div>
          <div v-if="current" class="ds-row ds-sb ds-wrap ds-g8">
            <p class="ds-small ds-muted">{{ t('Bu listede kayıtlı favorilerin gösteriliyor.') }}<template v-if="current.unavailableIds.length"> {{ t('{0} işletme artık yayında değil.', {'0': current.unavailableIds.length}) }}</template></p>
            <button type="button" class="ds-btn g sm" :disabled="saved.busy.value" @click="void saved.remove(current).then(()=>{selected=''})">{{ t('Listeyi sil') }}</button>
          </div>
          <p v-if="saved.error.value" class="ds-note err" role="alert">{{ t(saved.error.value) }}</p>
          <p v-if="busy" role="status" class="ds-small ds-muted">{{ t('Yükleniyor…') }}</p>
          <div v-if="error" role="alert" class="ds-note err ds-col state">
            <p>{{ t('Favoriler yüklenemedi veya değiştirilemedi. Yeniden açıp tekrar dene.') }}</p>
            <button type="button" class="ds-btn s sm" :disabled="busy" @click="again">{{ t('Tekrar dene') }}</button>
          </div>
          <div v-if="!busy && !error && !entries.length" class="ds-card ds-pad24 ds-col ds-g12 state">
            <h2 class="t19">{{ t('Henüz işletme kaydetmedin.') }}</h2>
            <NuxtLink class="ds-btn p" to="/">{{ t('İşletmeleri keşfet') }}</NuxtLink>
          </div>
          <div class="grid">
            <section v-for="e in shown" :key="e.id" class="item">
              <template v-if="e.business">
                <BusinessCard :business="e.business" hide-favorite/>
                <div v-if="listsOn&&plainLists.length" class="ds-row ds-g8 list-tools">
                  <button v-if="current" type="button" class="ds-btn g sm" :disabled="saved.busy.value" @click="void saved.drop(current,e.id)">{{ t('Listeden çıkar') }}</button>
                  <select v-else class="ds-field sm" :aria-label="t('{0} listeye ekle',{'0':e.business.name})" :disabled="saved.busy.value" @change="addTo($event,e.id)">
                    <option value="">{{ t('Listeye ekle') }}</option>
                    <option v-for="l in plainLists.filter(l=>!l.businessIds.includes(e.id))" :key="l.id" :value="l.id">{{ l.name }}</option>
                  </select>
                </div>
                <button type="button" class="remove" :disabled="busy" :aria-label="t('Favorilerden çıkar')" :title="t('Favorilerden çıkar')" @click="void remove(e.id)"><Heart :size="17" fill="currentColor"/></button>
              </template>
              <div v-else class="ds-card ds-pad ds-col ds-g12 state">
                <p class="ds-small ds-muted">{{ t('Bu işletme artık listelenmiyor.') }}</p>
                <button type="button" class="ds-btn s sm" :disabled="busy" @click="void remove(e.id)">{{ t('Favorilerden çıkar') }}</button>
              </div>
            </section>
          </div>
          <button v-if="next" type="button" class="ds-btn s more" :disabled="busy" @click="void more()">{{ t('Daha fazla göster') }}</button>
          <section v-if="listsOn" class="ds-card ds-pad24 ds-col ds-g8">
            <h2 class="t19">{{ t('Kayıtlı karşılaştırmalar') }}</h2>
            <p v-if="!comparisons.length" class="ds-small ds-muted">{{ t('Keşfet sayfasında en fazla üç işletmeyi karşılaştırıp kaydedebilirsin.') }}</p>
            <ul v-else class="cmp">
              <li v-for="c in comparisons" :key="c.id" class="ds-row ds-sb ds-wrap ds-g8">
                <span class="ds-small"><b>{{ c.name }}</b> · <template v-for="(id,i) in c.businessIds" :key="id"><NuxtLink :to="`/servis/${encodeURIComponent(id)}`">{{ t('İşletme {0}',{'0':i+1}) }}</NuxtLink>{{ i<c.businessIds.length-1?', ':'' }}</template></span>
                <button type="button" class="ds-btn g sm" :disabled="saved.busy.value" @click="void saved.remove(c)">{{ t('Sil') }}</button>
              </li>
            </ul>
          </section>
          <section v-else class="ds-card ds-pad24 ds-col ds-g8 ds-passive" aria-disabled="true" :title="t('Yakında')">
            <h2 class="t19">{{ t('Kayıtlı aramalar') }}</h2>
            <p class="ds-small ds-muted">{{ t('Kayıtlı aramalar henüz etkin değil.') }}</p>
          </section>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.saved {max-width: 1440px; padding-top: 32px; padding-bottom: 64px;}
.new-list {align-items: flex-end;}
.list-tools {margin-top: 8px;}
.list-tools select {max-width: 100%;}
.cmp {list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px;}
p, h1, h2 {margin: 0;}
h1 {font-size: 34px; line-height: 38px;}
.t19 {font-family: Arimo, Arial, Helvetica, sans-serif; letter-spacing: 0; font-size: 19px; line-height: 24.7px;}
.layout {display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 32px; align-items: start;}
.acct {display: flex; flex-direction: column; gap: 4px;}
.acct a, .acct span {display: flex; align-items: center; gap: 12px; height: 44px; padding: 0 14px; border-radius: 10px; color: #3a4b5e; font-size: 13px; text-decoration: none;}
.acct a.on {background: #fff3ec; color: #a63c09; font-weight: 700;}
.content {min-width: 0;}
.state {align-items: flex-start;}
.n {opacity: .7;}
.grid {display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; align-items: start;}
.item {position: relative; min-width: 0;}
.remove {position: absolute; top: 12px; right: 12px; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; padding: 0; border: 0; border-radius: 18px; background: #fff; box-shadow: 0 2px 4px rgba(16, 36, 58, .15); color: #c4460b; cursor: pointer;}
.remove[disabled] {cursor: not-allowed; opacity: .6;}
.more {align-self: center;}
@media (max-width: 1100px) {
  .layout {grid-template-columns: 200px minmax(0, 1fr); gap: 24px;}
  .grid {grid-template-columns: repeat(2, minmax(0, 1fr));}
}
@media (max-width: 760px) {
  .saved {padding-top: 20px; padding-bottom: 32px;}
  .layout {grid-template-columns: minmax(0, 1fr);}
  .acct {display: none;}
  h1 {font-size: 28px; line-height: 32px;}
}
@media (max-width: 480px) {
  .grid {grid-template-columns: minmax(0, 1fr);}
}
</style>
