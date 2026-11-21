<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from 'vue';
import V2Footer from '~/components/v2/V2Footer.vue';
import V2Navbar from '~/components/v2/V2Navbar.vue';
import SystemOfflineState from '~/components/v2/system/SystemOfflineState.vue';
import {useApp} from '~/composables/useApp';
import {useAppHead} from '~/composables/useAppHead';
import {useLocale} from '~/composables/useLocale';

// Web v2 shell. Live mode reads the REST API; demo mode (NUXT_PUBLIC_APP_MODE=demo) shows app/data/mock.
useAppHead();
// Toast: callers pass translated text; a Turkish source key is still translated here as a safety net.
const {t} = useLocale();
const route = useRoute();
const app = useApp();

// S04: when the browser goes offline the page body is replaced by the offline state.
const offline = ref(false);
const sync = () => { offline.value = !navigator.onLine; };
onMounted(() => {
  app.start();
  sync();
  window.addEventListener('online', sync);
  window.addEventListener('offline', sync);
});
onBeforeUnmount(() => {
  app.stop();
  window.removeEventListener('online', sync);
  window.removeEventListener('offline', sync);
});
</script>

<template>
  <div class="v2-app">
    <a href="#icerik" class="skip">{{ t('İçeriğe geç') }}</a>
    <V2Navbar v-if="route.meta.navbar !== false"/>
    <main id="icerik" class="v2-main">
      <SystemOfflineState v-if="offline" @retry="sync" @browse="offline = false"/>
      <NuxtPage v-else/>
    </main>
    <V2Footer v-if="route.meta.footer !== false"/>
    <div v-if="app.notice" class="toast" role="status">
      <span>{{ t(app.notice) }}</span>
      <button type="button" :aria-label="t('Bildirimi kapat')" @click="app.notify('')">×</button>
    </div>
  </div>
</template>

<style scoped>
.v2-app{min-height:100vh;display:flex;flex-direction:column}
.v2-main{flex:1}
.skip{position:absolute;left:16px;top:-60px;z-index:200;padding:10px 16px;border-radius:999px;background:var(--ink-900);color:var(--white);font-weight:600}
.skip:focus{top:12px}
.toast{position:fixed;left:50%;bottom:24px;z-index:150;transform:translateX(-50%);display:flex;align-items:center;gap:16px;max-width:min(560px,calc(100% - 32px));padding:14px 18px;border-radius:18px;background:var(--ink-900);color:var(--white);font-weight:600;font-size:14px;line-height:1.4;box-shadow:var(--shadow-pop)}
.toast button{flex:none;width:28px;height:28px;border-radius:999px;background:rgba(255,255,255,.12);color:var(--white);font-size:18px;line-height:1}
</style>
