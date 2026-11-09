<script setup lang="ts">
import {ref} from 'vue';
import {sampleBusinesses} from '@otosanayide/core';
import {fetchFavorites} from '@otosanayide/core/favorites-client';
import type {FavoriteEntry} from '@otosanayide/core/favorites';
import BusinessCard from '~/components/BusinessCard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch, apiOrigin} from '~/lib/api';

const {t, locale} = useLocale();
const app = useApp();
const entries = ref<FavoriteEntry[]>([]);
const next = ref<string | null>(null);
const busy = ref(true);
const error = ref(false);
const retry = ref(0);
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
  <div class="container page" id="content">
    <h1>{{ t('Bir sonraki bakım için.') }}</h1>
    <p class="lead">{{ t('Kaydettiğin işletmeler burada.') }}</p>
    <div v-if="!app.member" class="empty">
      <h2>{{ t('Favorilerin için ücretsiz hesabına giriş yap.') }}</h2>
      <NuxtLink class="button primary" to="/giris">{{ t('Giriş yap') }}</NuxtLink>
    </div>
    <template v-else>
      <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
      <div v-if="error" role="alert">
        <p>{{ t('Favoriler yüklenemedi veya değiştirilemedi. Yeniden açıp tekrar dene.') }}</p>
        <button class="button secondary" :disabled="busy" @click="again">{{ t('Tekrar dene') }}</button>
      </div>
      <div v-if="!busy && !error && !entries.length" class="empty">
        <h2>{{ t('Henüz işletme kaydetmedin.') }}</h2>
        <NuxtLink class="button primary" to="/">{{ t('İşletmeleri keşfet') }}</NuxtLink>
      </div>
      <div class="business-grid">
        <section v-for="e in entries" :key="e.id">
          <BusinessCard v-if="e.business" :business="e.business" hide-favorite/>
          <p v-else>{{ t('Bu işletme artık listelenmiyor.') }}</p>
          <button class="button secondary full" :disabled="busy" @click="void remove(e.id)">{{ t('Favorilerden çıkar') }}</button>
        </section>
      </div>
      <button v-if="next" class="button secondary" :disabled="busy" @click="void more()">{{ t('Daha fazla göster') }}</button>
    </template>
  </div>
</template>
