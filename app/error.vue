<script setup lang="ts">
import {computed, onMounted} from 'vue';
import {Lock, Search, Settings, TriangleAlert} from '@lucide/vue';
import type {NuxtError} from '#app';
import PortalLink from '~/components/PortalLink.vue';
import Shell from '~/components/Shell.vue';
import SystemState from '~/components/SystemState.vue';
import {useApp} from '~/composables/useApp';
import {useAppHead} from '~/composables/useAppHead';
import {useLocale} from '~/composables/useLocale';

const props = defineProps<{error: NuxtError}>();
const app = useApp();
const {t: i18nT} = useLocale();
useAppHead();
onMounted(() => app.start());
/** Old /isletme links now 404 (K184); point them at the portal. */
// SSR renders errors through an internal route, so the failed address comes from the error itself.
const route = useRoute();
const requested = computed(() => {
  const raw = (props.error as {url?: unknown}).url;
  try {
    return typeof raw === 'string' && raw ? new URL(raw, 'http://local.invalid').pathname : route.path;
  } catch {
    return '';
  }
});
const businessPath = computed(() => /^\/isletme(\/|$)/.test(requested.value));
const kind = computed(() => {
  const code = props.error.statusCode;
  if (code === 404) return 'missing';
  if (code === 401 || code === 403) return 'denied';
  if (code === 503) return 'maintenance';
  return 'other';
});
</script>

<template>
  <Shell>
    <div id="content">
      <SystemState v-if="kind === 'missing'" :title="i18nT('Aradığın sayfayı bulamadık')" :text="i18nT('Bağlantı değişmiş ya da işletme profili kaldırılmış olabilir. Kalıcı kapanan işletmeler “Kalıcı kapalı” olarak görünmeye devam eder.')">
        <template #icon><Search :size="44"/></template>
        <a class="ds-btn p" href="/">{{ i18nT("Keşfete dön") }}</a>
        <PortalLink class="ds-btn s" target="login">{{ i18nT("İşletme girişi") }}</PortalLink>
        <span class="ds-btn s ds-passive" aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT("Yardım") }}</span>
        <p v-if="businessPath" class="ds-small ds-muted moved">{{ i18nT("İşletme alanı ayrı İşletme Merkezi'ne taşındı.") }}</p>
      </SystemState>
      <SystemState v-else-if="kind === 'denied'" tone="err" :title="i18nT('Bu sayfaya erişim yetkin yok')" :text="i18nT('Bu sayfayı yalnız yetkili hesaplar görebilir. Doğru hesapla giriş yaptığını kontrol et.')">
        <template #icon><Lock :size="44"/></template>
        <a class="ds-btn p" href="/giris">{{ i18nT("Hesap değiştir") }}</a>
        <PortalLink class="ds-btn s" target="login">{{ i18nT("İşletme girişi") }}</PortalLink>
      </SystemState>
      <SystemState v-else-if="kind === 'maintenance'" tone="info" :title="i18nT('Kısa bir bakım yapıyoruz')" :text="i18nT('Hizmet geçici olarak kullanılamıyor. Birazdan tekrar dene.')">
        <template #icon><Settings :size="44"/></template>
        <a class="ds-btn p" href="/">{{ i18nT("Keşfetmeye dön") }}</a>
        <span class="ds-btn s ds-passive" aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT("Durum sayfası") }}</span>
      </SystemState>
      <SystemState v-else tone="err" :title="i18nT('İşlem tamamlanamadı. Bilgilerini ve bağlantını kontrol edip tekrar dene.')">
        <template #icon><TriangleAlert :size="44"/></template>
        <a class="ds-btn p" href="/">{{ i18nT("Keşfetmeye dön") }}</a>
      </SystemState>
    </div>
  </Shell>
</template>

<style scoped>
.moved {flex-basis: 100%; margin: 0; text-align: center;}
</style>
