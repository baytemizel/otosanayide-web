<script setup lang="ts">
import {ref} from 'vue';
import {WifiOff} from '@lucide/vue';
import SystemState from '~/components/SystemState.vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';

const {t: i18nT} = useLocale();
const offline = ref(false);

function check() {
  offline.value = !navigator.onLine;
}

useClientEffect(() => [], () => {
  check();
  window.addEventListener('online', check);
  window.addEventListener('offline', check);
  return () => {
    window.removeEventListener('online', check);
    window.removeEventListener('offline', check);
  };
});
</script>

<template>
  <div v-if="offline" class="system-offline" role="alert">
    <SystemState tone="warn" :title="i18nT('İnternet bağlantın yok gibi görünüyor')" :text="i18nT('Bağlantın geri geldiğinde kaldığın yerden devam edebilirsin.')">
      <template #icon><WifiOff :size="44"/></template>
      <button type="button" class="ds-btn p" @click="check">{{ i18nT('Tekrar dene') }}</button>
      <span class="ds-btn s ds-passive" aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT('Kaydedilenler') }}</span>
    </SystemState>
  </div>
</template>

<style scoped>
.system-offline {position: fixed; inset: 0; z-index: 90; display: grid; place-items: center; overflow-y: auto; background: #fff;}
</style>
