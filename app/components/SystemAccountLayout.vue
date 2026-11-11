<script setup lang="ts">
import {Bell, CarFront, FileText, Heart, Inbox, Lock, MessageSquare, UserRound} from '@lucide/vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';

const {t: i18nT} = useLocale();
const app = useApp();
const route = useRoute();

const items = [
  {label: 'Araçlarım', to: '/araclarim', icon: CarFront},
  {label: 'Hatırlatmalar', to: '/araclarim', icon: Bell},
  {label: 'Kaydedilenler', to: '/kaydedilenler', icon: Heart},
  {label: 'Taleplerim', to: '/taleplerim', icon: Inbox},
  {label: 'Yorumlarım', to: '/yorumlarim', icon: MessageSquare, page: '/yorumlarim'},
  {label: 'Bildirimler', to: '/bildirimler', icon: Bell, page: '/bildirimler'},
  {label: 'Başvurularım', to: '/basvurularim', icon: FileText, page: '/basvurularim'},
  {label: 'Hesabım', to: '/hesabim', icon: UserRound},
  {label: 'Gizlilik ve veri', to: '/hesabim#gizlilik', icon: Lock, page: '/hesabim'},
];
</script>

<template>
  <div id="content" class="ds-container account">
    <nav v-if="app.member" class="account-nav" :aria-label="i18nT('Hesap menüsü')">
      <template v-for="item in items" :key="item.label">
        <NuxtLink v-if="item.to" :to="item.to" :class="{on: item.page === route.path}" :aria-current="item.page === route.path ? 'page' : undefined">
          <component :is="item.icon" :size="18"/>{{ i18nT(item.label) }}
        </NuxtLink>
        <span v-else class="ds-passive" aria-disabled="true" :title="i18nT('Yakında')"><component :is="item.icon" :size="18"/>{{ i18nT(item.label) }}</span>
      </template>
    </nav>
    <div class="account-main"><slot/></div>
  </div>
</template>

<style scoped>
.account {display: flex; align-items: flex-start; gap: 32px; padding-top: 32px; padding-bottom: 64px; min-height: 65vh;}
.account-nav {display: flex; flex-direction: column; gap: 4px; flex: none; width: 250px;}
.account-nav a, .account-nav span {display: flex; align-items: center; gap: 12px; height: 44px; padding: 0 14px; border-radius: 10px; color: #3a4b5e; font-size: 13px; white-space: nowrap;}
.account-nav a.on {background: #fff3ec; color: #a63c09; font-weight: 700;}
.account-main {flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 20px;}
@media (max-width: 900px) {
  .account {flex-direction: column; gap: 20px; padding-top: 20px;}
  .account-nav {flex-direction: row; width: 100%; overflow-x: auto;}
  .account-nav a, .account-nav span {flex: none;}
  .account-main {width: 100%;}
}
</style>
