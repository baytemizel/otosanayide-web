<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from 'vue';
import V2Footer from '~/components/v2/V2Footer.vue';
import V2Navbar from '~/components/v2/V2Navbar.vue';
import SystemOfflineState from '~/components/v2/system/SystemOfflineState.vue';
import {useAppHead} from '~/composables/useAppHead';

// Web v2 shell. Screens use mock data (app/data/mock) until each is wired to the API.
useAppHead();
const route = useRoute();

// S04: when the browser goes offline the page body is replaced by the offline state.
const offline = ref(false);
const sync = () => { offline.value = !navigator.onLine; };
onMounted(() => {
  sync();
  window.addEventListener('online', sync);
  window.addEventListener('offline', sync);
});
onBeforeUnmount(() => {
  window.removeEventListener('online', sync);
  window.removeEventListener('offline', sync);
});
</script>

<template>
  <div class="v2-app">
    <a href="#icerik" class="skip">İçeriğe geç</a>
    <V2Navbar v-if="route.meta.navbar !== false"/>
    <main id="icerik" class="v2-main">
      <SystemOfflineState v-if="offline" @retry="sync" @browse="offline = false"/>
      <NuxtPage v-else/>
    </main>
    <V2Footer v-if="route.meta.footer !== false"/>
  </div>
</template>

<style scoped>
.v2-app{min-height:100vh;display:flex;flex-direction:column}
.v2-main{flex:1}
.skip{position:absolute;left:16px;top:-60px;z-index:200;padding:10px 16px;border-radius:999px;background:var(--ink-900);color:var(--white);font-weight:600}
.skip:focus{top:12px}
</style>
