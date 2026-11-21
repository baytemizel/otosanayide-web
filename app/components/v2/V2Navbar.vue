<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue';
import {ArrowRight, Bell, ChevronDown, Globe, Menu, X} from '@lucide/vue';
import V2Logo from '~/components/v2/V2Logo.vue';
import {useLocale} from '~/composables/useLocale';
import {useSession} from '~/composables/useSession';
import {useUnreadCount} from '~/composables/v2/useUnreadCount';
import {portalUrl} from '~/lib/portal';
import {unreadBadge} from '~/lib/v2/account';

// V2/Navbar (Figma 118:382). Guest: "Giriş yap" + "İşletmeni ekle"; member: bell + account pill.
// Interaction note 01: shrinks and sticks to the top on scroll; the active page gets the orange dot.
// Live: the member pill shows the profile name (/api/me/profile, e-mail-based label without one) and the
// bell's dot is the unread count of GET /api/notifications?v=2, asked on sign-in and on page changes
// (at most every 30 s). Demo keeps the design's bell with its dot.
const route = useRoute();
const {locale, setLocale} = useLocale();
const session = useSession();
const {value: unreadCount, refresh: refreshUnread} = useUnreadCount();
const bellLabel = computed(() => (unreadCount.value ? `Bildirimler, ${unreadBadge(unreadCount.value)} okunmamış` : 'Bildirimler'));

const links = [
  {label: 'Keşfet', to: '/ara', match: ['/ara', '/servis', '/karsilastir']},
  {label: 'Belirti Bulucu', to: '/#belirti-bulucu', match: []},
  {label: 'Teklif Al', to: '/talep', match: ['/talep', '/taleplerim', '/randevu']},
  {label: 'Garajım', to: '/araclarim', match: ['/araclarim', '/hatirlatmalar']},
  {label: 'Rehber', to: '/#rehber', match: []},
];
const active = (match: string[]) => match.some((prefix) => route.path === prefix || route.path.startsWith(`${prefix}/`));

const accountLinks = [
  {label: 'Araçlarım', to: '/araclarim'},
  {label: 'Kaydedilenler', to: '/kaydedilenler'},
  {label: 'Taleplerim', to: '/taleplerim'},
  {label: 'Bildirimler', to: '/bildirimler'},
  {label: 'Hesabım', to: '/hesabim'},
];

const businessHref = computed(() => portalUrl('newBusiness') ?? '/#isletmeler');
const scrolled = ref(false);
const menuOpen = ref(false);
const accountOpen = ref(false);

function onScroll() {
  scrolled.value = window.scrollY > 24;
}
onMounted(() => {
  onScroll();
  window.addEventListener('scroll', onScroll, {passive: true});
  if (!session.demo) {
    watch(() => [session.signedIn.value, route.path] as const, ([member], previous) => {
      if (member) void refreshUnread(!previous?.[0]);
    }, {immediate: true});
  }
});
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll));
watch(() => route.fullPath, () => {
  menuOpen.value = false;
  accountOpen.value = false;
});

function toggleLocale() {
  setLocale(locale.value === 'tr' ? 'en' : 'tr');
}
async function signOut() {
  accountOpen.value = false;
  await session.signOut();
  void navigateTo('/');
}
</script>

<template>
  <div class="nav-slot v2-wrap" :class="{scrolled}">
    <nav class="v2-nav" aria-label="Ana menü">
      <NuxtLink to="/" class="brand" aria-label="otosanayide ana sayfa"><V2Logo/></NuxtLink>

      <ul class="menu" :class="{open: menuOpen}">
        <li v-for="link in links" :key="link.label">
          <NuxtLink :to="link.to" class="menu-link" :class="{on: active(link.match)}" :aria-current="active(link.match) ? 'page' : undefined">
            <span v-if="active(link.match)" class="dot" aria-hidden="true"/>{{ link.label }}
          </NuxtLink>
        </li>
        <li v-if="!session.signedIn.value" class="menu-extra"><NuxtLink to="/giris" class="menu-link">Giriş yap</NuxtLink></li>
        <li v-if="session.signedIn.value" class="menu-extra menu-extra-sm"><NuxtLink to="/bildirimler" class="menu-link">Bildirimler<span v-if="unreadCount" class="menu-count">{{ unreadBadge(unreadCount) }}<span class="sr-only"> okunmamış</span></span></NuxtLink></li>
        <li class="menu-extra menu-extra-sm"><button type="button" class="menu-link" @click="toggleLocale"><Globe :size="16" aria-hidden="true"/>{{ locale === 'tr' ? 'English' : 'Türkçe' }}</button></li>
      </ul>

      <div class="right">
        <button type="button" class="lang" :aria-label="locale === 'tr' ? 'Dil: Türkçe. English’e geç.' : 'Language: English. Switch to Turkish.'" @click="toggleLocale">
          <Globe :size="16" aria-hidden="true"/>{{ locale === 'tr' ? 'TR' : 'EN' }}
        </button>

        <template v-if="session.signedIn.value">
          <NuxtLink to="/bildirimler" class="bell" :aria-label="bellLabel">
            <img v-if="session.demo" src="/v2/bell-button.svg" alt="" width="42" height="42">
            <span v-else class="bell-live" aria-hidden="true"><Bell :size="18" :stroke-width="1.5"/><span v-if="unreadCount" class="bell-dot"/></span>
          </NuxtLink>
          <div class="account">
            <button type="button" class="account-pill" :aria-expanded="accountOpen" aria-haspopup="menu" @click="accountOpen = !accountOpen">
              <span class="initials">{{ session.label.value.initials }}</span>
              <span class="name">{{ session.label.value.short }}</span>
              <ChevronDown :size="16" aria-hidden="true"/>
            </button>
            <ul v-if="accountOpen" class="account-menu" role="menu">
              <li v-for="item in accountLinks" :key="item.to" role="none">
                <NuxtLink :to="item.to" role="menuitem">{{ item.label }}<span v-if="item.to === '/bildirimler' && unreadCount" class="menu-count">{{ unreadBadge(unreadCount) }}<span class="sr-only"> okunmamış</span></span></NuxtLink>
              </li>
              <li role="none"><button type="button" role="menuitem" @click="signOut">Çıkış yap</button></li>
            </ul>
          </div>
        </template>
        <template v-else>
          <NuxtLink to="/giris" class="login">Giriş yap</NuxtLink>
          <a :href="businessHref" class="btn btn-dark cta">İşletmeni ekle<ArrowRight aria-hidden="true"/></a>
        </template>

        <button type="button" class="burger" :aria-expanded="menuOpen" aria-label="Menü" @click="menuOpen = !menuOpen">
          <X v-if="menuOpen" :size="20" aria-hidden="true"/><Menu v-else :size="20" aria-hidden="true"/>
        </button>
      </div>
    </nav>
  </div>
</template>

<style scoped>
.nav-slot{position:sticky;top:0;z-index:50;padding-top:20px;transition:padding-top .2s ease}
.nav-slot.scrolled{padding-top:10px}
.v2-nav{position:relative;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 12px 12px 26px;background:var(--white);border:1px solid var(--cream-200);border-radius:999px;box-shadow:var(--shadow-nav);transition:padding .2s ease}
.scrolled .v2-nav{padding-top:8px;padding-bottom:8px;box-shadow:0 12px 24px rgba(10,20,36,.1)}
.brand{display:flex;flex:none}
.menu{display:flex;align-items:center;gap:4px}
.menu-link{display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:999px;font-weight:600;font-size:15px;line-height:1.2;color:var(--ink-700);white-space:nowrap}
.menu-link:hover{color:var(--ink-900);background:var(--cream-50)}
.menu-link.on{background:var(--cream-100);color:var(--ink-900)}
.dot{width:7px;height:7px;border-radius:999px;background:var(--orange-500)}
.menu-extra{display:none}
.right{display:flex;align-items:center;gap:8px;flex:none}
.lang{display:flex;align-items:center;gap:6px;padding:10px 14px;border:1px solid var(--cream-200);border-radius:999px;font-weight:600;font-size:13px;line-height:1.2;color:var(--ink-800)}
.lang:hover{border-color:var(--ink-300)}
.login{padding:10px 14px;font-weight:600;font-size:15px;line-height:1.2;color:var(--ink-900)}
.bell img{width:42px;height:42px}
.bell{position:relative;display:block}
.bell-live{position:relative;display:grid;place-items:center;width:42px;height:42px;border-radius:999px;background:var(--cream-100);color:var(--ink-900)}
.bell-dot{position:absolute;top:7px;right:5.5px;width:11px;height:11px;border-radius:999px;background:var(--orange-500);border:2px solid var(--cream-100)}
.menu-count{display:inline-grid;place-items:center;min-width:20px;height:20px;margin-left:8px;padding:0 6px;border-radius:999px;background:var(--orange-500);color:var(--white);font-size:11px;font-weight:700;vertical-align:1px}
.account{position:relative}
.account-pill{display:flex;align-items:center;gap:8px;padding:5px 12px 5px 5px;border:1px solid var(--cream-200);border-radius:999px;font-weight:600;font-size:13px;line-height:1.2;color:var(--ink-900)}
.initials{display:grid;place-items:center;width:32px;height:32px;border-radius:999px;background:var(--ink-900);color:var(--lime-400);font-family:var(--font-mono);font-weight:500;font-size:11px;letter-spacing:.06em}
.account-menu{position:absolute;right:0;top:calc(100% + 8px);min-width:200px;padding:8px;background:var(--white);border:1px solid var(--cream-200);border-radius:20px;box-shadow:var(--shadow-pop)}
.account-menu a,.account-menu button{display:block;width:100%;text-align:left;padding:10px 12px;border-radius:12px;font-weight:600;font-size:14px;color:var(--ink-800)}
.account-menu a:hover,.account-menu button:hover{background:var(--cream-50)}
.burger{display:none;width:42px;height:42px;border-radius:999px;background:var(--cream-100);place-items:center;color:var(--ink-900)}

@media (max-width:1180px){
  .menu-link{padding:10px 12px}
}
@media (max-width:1100px){
  .burger{display:grid}
  .menu{display:none;position:absolute;left:0;right:0;top:calc(100% + 8px);flex-direction:column;align-items:stretch;padding:8px;background:var(--white);border:1px solid var(--cream-200);border-radius:24px;box-shadow:var(--shadow-pop)}
  .menu.open{display:flex}
  .menu-extra{display:block}
}
@media (max-width:760px){
  .nav-slot{padding-top:12px}
  .v2-nav{padding:8px 8px 8px 16px}
  .v2-nav :deep(.v2-logo){gap:8px}
  .v2-nav :deep(.v2-logo img){width:49.2px;height:28.8px}
  .v2-nav :deep(.v2-logo .word){font-size:20.8px}
  .cta,.login,.lang,.account-pill .name,.account-pill > svg{display:none}
  .account-pill{padding:4px}
}
@media (min-width:761px){
  .menu-extra-sm{display:none}
}
@media (max-width:480px){
  .bell{display:none}
  .v2-nav :deep(.v2-logo .word){font-size:18px}
}
</style>
