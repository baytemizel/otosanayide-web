<script setup lang="ts">
import {computed, ref} from 'vue';
import {Bell, CarFront, ChevronDown, Compass, Heart, UserRound} from '@lucide/vue';
import BrandLogo from '~/components/BrandLogo.vue';
import LanguageSwitch from '~/components/LanguageSwitch.vue';
import PortalLink from '~/components/PortalLink.vue';
import SystemCookiePreferences from '~/components/SystemCookiePreferences.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {legalPath} from '~/lib/legal';
import type {PortalTarget} from '~/lib/portal';

const {t: i18nT} = useLocale();
const route = useRoute();
const app = useApp();

/** Panels draw their own navigation (PanelShell). */
const panel = computed(() => route.path.startsWith('/yonetim'));
const favorites = computed(() => app.data.favorites.length);
const accountName = computed(() => (app.demo ? i18nT('Önizleme hesabı') : (app.user?.email?.split('@')[0] ?? '')));
const initials = computed(() => accountName.value.slice(0, 2).toLocaleUpperCase('tr-TR'));
const cookies = ref(false);

type FooterLink = {label: string; to?: string | null; portal?: PortalTarget; cookies?: true};

const columns: {title: string; links: FooterLink[]}[] = [
  {
    title: 'Keşfet',
    links: [
      {label: 'Hizmetler', to: '/'},
      {label: '41 il', to: '/hakkinda'},
      {label: 'Seçim rehberleri'},
      {label: 'Yardım'},
    ],
  },
  {
    title: 'İşletmeler',
    links: [
      {label: 'İşletmeni ekle', portal: 'newBusiness'},
      {label: 'Bu işletme sizin mi?', portal: 'claim'},
      {label: 'Reklam ve sponsorluk', portal: 'home'},
      {label: 'Doğrulama nedir?'},
    ],
  },
  {
    title: 'Kurumsal',
    links: [
      {label: 'Hakkında', to: '/hakkinda'},
      {label: 'Topluluk kuralları', to: legalPath('topluluk-kurallari')},
      {label: 'Reklam açıklaması', to: legalPath('reklam-aciklamasi')},
      {label: 'İletişim'},
      {label: 'Yönetim', to: '/yonetim'},
    ],
  },
  {
    title: 'Yasal',
    links: [
      {label: 'Kullanım koşulları', to: legalPath('kullanim-kosullari')},
      {label: 'Gizlilik ve KVKK', to: legalPath('gizlilik') ?? '/hakkinda'},
      {label: 'Çerez tercihleri', cookies: true},
      {label: 'Veri talebi', to: '/hesabim'},
    ],
  },
];
</script>

<template>
  <a class="skip" href="#content">{{ i18nT("İçeriğe geç") }}</a>
  <template v-if="panel">
    <main><slot/></main>
  </template>
  <template v-else>
    <header class="ds-hdr">
      <NuxtLink class="ds-logo" to="/" :aria-label="i18nT('otosanayide')"><BrandLogo/></NuxtLink>
      <nav :aria-label="i18nT('Ana gezinme')">
        <NuxtLink :class="route.path === '/' ? 'on' : ''" to="/">{{ i18nT("Keşfet") }}</NuxtLink>
        <NuxtLink :class="route.path === '/araclarim' ? 'on' : ''" to="/araclarim">{{ i18nT("Araçlarım") }}</NuxtLink>
        <PortalLink target="login">{{ i18nT("İşletme Merkezi") }}</PortalLink>
      </nav>
      <div v-if="app.member" class="ds-row ds-g10">
        <LanguageSwitch class="ds-hide-mobile"/>
        <NuxtLink class="ds-iconbtn" to="/kaydedilenler" :aria-label="i18nT('Kaydedilenler')"><Heart :size="18"/><span v-if="favorites" class="ds-dot">{{ favorites }}</span></NuxtLink>
        <NuxtLink class="ds-iconbtn" to="/bildirimler" :aria-label="i18nT('Bildirimler')"><Bell :size="18"/></NuxtLink>
        <NuxtLink class="ds-row ds-g8" style="margin-left:6px;text-decoration:none;color:inherit" to="/hesabim" :aria-label="i18nT('Hesabım')">
          <span class="ds-avatar">{{ initials }}</span>
          <span class="ds-small ds-b ds-hide-mobile">{{ accountName }}</span>
          <ChevronDown class="ds-hide-mobile" :size="16"/>
        </NuxtLink>
      </div>
      <div v-else class="ds-row ds-g12">
        <LanguageSwitch class="ds-hide-mobile"/>
        <PortalLink class="ds-btn g ds-hide-mobile" target="newBusiness">{{ i18nT("İşletmeni ekle") }}</PortalLink>
        <NuxtLink class="ds-btn s" to="/giris">{{ i18nT("Giriş yap") }}</NuxtLink>
      </div>
    </header>
    <main><slot/></main>
    <footer class="ds-footer">
      <div class="ds-col ds-g16" style="max-width:320px">
        <NuxtLink class="ds-logo" to="/" :aria-label="i18nT('otosanayide')"><BrandLogo dark/></NuxtLink>
        <p style="color:#c7d1dc;font-size:13px;margin:0">{{ i18nT("Özel servisleri ücretsiz keşfet. Reklamlar her zaman “Sponsorlu” etiketiyle gösterilir ve organik sıralamayı değiştirmez.") }}</p>
        <span class="ds-xs" style="color:#7f93a8">© 2026 otosanayide.</span>
        <LanguageSwitch class="ds-footer-lang"/>
      </div>
      <div class="ds-row ds-as" style="gap:64px">
        <div v-for="column in columns" :key="column.title">
          <h4>{{ i18nT(column.title) }}</h4>
          <template v-for="link in column.links" :key="link.label">
            <NuxtLink v-if="link.to" :to="link.to">{{ i18nT(link.label) }}</NuxtLink>
            <PortalLink v-else-if="link.portal" :target="link.portal">{{ i18nT(link.label) }}</PortalLink>
            <button v-else-if="link.cookies" type="button" class="footer-button" aria-haspopup="dialog" @click="cookies = true">{{ i18nT(link.label) }}</button>
            <span v-else class="ds-passive" aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT(link.label) }}</span>
          </template>
        </div>
      </div>
      <p v-if="app.demo" class="preview-note" style="flex-basis:100%">{{ i18nT("Tasarım ve geliştirme önizlemesi · İşletmeler ve fotoğraflar örnektir. Yerel kayıtlar yalnızca bu tarayıcıda tutulur.") }}</p>
    </footer>
    <nav class="mobile-nav" :aria-label="i18nT('Mobil gezinme')">
      <NuxtLink to="/"><Compass :size="21"/>{{ i18nT("Keşfet") }}</NuxtLink>
      <NuxtLink to="/araclarim"><CarFront :size="21"/>{{ i18nT("Araçlarım") }}</NuxtLink>
      <NuxtLink to="/kaydedilenler"><Heart :size="21"/>{{ i18nT("Kaydedilenler") }}</NuxtLink>
      <NuxtLink to="/hesabim"><UserRound :size="21"/>{{ i18nT("Hesabım") }}</NuxtLink>
    </nav>
    <SystemCookiePreferences v-if="cookies" :onClose="() => (cookies = false)"/>
  </template>
</template>

<style scoped>
.ds-footer {flex-wrap: wrap;}
.ds-footer-lang {color: #10243a; width: fit-content;}
.footer-button {display: block; margin-bottom: 8px; padding: 0; border: 0; background: none; color: #c7d1dc; font-size: 13px; text-align: left; cursor: pointer;}
.footer-button:hover {text-decoration: underline;}
@media (min-width: 761px) {.ds-footer-lang {display: none;}}
</style>
