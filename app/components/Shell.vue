<script setup lang="ts">
import {ArrowUpRight, CarFront, Compass, Heart, UserRound} from '@lucide/vue';
import LanguageSwitch from '~/components/LanguageSwitch.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';

const {t: i18nT} = useLocale();
const route = useRoute();
const app = useApp();
</script>

<template>
  <a class="skip" href="#content">{{ i18nT("İçeriğe geç") }}</a>
  <header class="header">
    <NuxtLink class="logo" to="/">{{ i18nT("otosanayide") }}<span>.</span></NuxtLink>
    <nav :aria-label="i18nT('Ana gezinme')">
      <NuxtLink :class="route.path === '/' ? 'active' : ''" to="/">{{ i18nT("Keşfet") }}</NuxtLink>
      <NuxtLink :class="route.path === '/araclarim' ? 'active' : ''" to="/araclarim">{{ i18nT("Araçlarım") }}</NuxtLink>
      <NuxtLink :class="route.path.startsWith('/isletme') ? 'active' : ''" to="/isletme">{{ i18nT("İşletmeler için") }}</NuxtLink>
    </nav>
    <LanguageSwitch/>
    <NuxtLink class="button secondary login" :to="app.member ? '/hesabim' : '/giris'"><UserRound :size="17"/>{{ app.member ? i18nT("Hesabım") : i18nT("Giriş yap") }}</NuxtLink>
  </header>
  <main><slot/></main>
  <footer class="footer">
    <div>
      <NuxtLink class="logo" to="/">{{ i18nT("otosanayide") }}<span>.</span></NuxtLink>
      <p>{{ i18nT("Aracına iyi gelecek bir yer.") }}</p>
    </div>
    <div>
      <NuxtLink to="/kaydedilenler">{{ i18nT("Kaydedilenler") }}</NuxtLink>
      <NuxtLink to="/isletme">{{ i18nT("İşletmeni ekle ") }}<ArrowUpRight :size="14"/></NuxtLink>
      <NuxtLink to="/hakkinda">{{ i18nT("Kapsam ve gizlilik") }}</NuxtLink>
      <NuxtLink to="/yonetim">{{ i18nT("Yönetim") }}</NuxtLink>
    </div>
    <p v-if="app.demo" class="preview-note">{{ i18nT("Tasarım ve geliştirme önizlemesi · İşletmeler ve fotoğraflar örnektir. Yerel kayıtlar yalnızca bu tarayıcıda tutulur.") }}</p>
  </footer>
  <nav class="mobile-nav" :aria-label="i18nT('Mobil gezinme')">
    <NuxtLink to="/"><Compass :size="21"/>{{ i18nT("Keşfet") }}</NuxtLink>
    <NuxtLink to="/araclarim"><CarFront :size="21"/>{{ i18nT("Araçlarım") }}</NuxtLink>
    <NuxtLink to="/kaydedilenler"><Heart :size="21"/>{{ i18nT("Kaydedilenler") }}</NuxtLink>
    <NuxtLink to="/hesabim"><UserRound :size="21"/>{{ i18nT("Hesabım") }}</NuxtLink>
  </nav>
</template>
