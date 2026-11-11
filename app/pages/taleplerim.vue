<script setup lang="ts">
import type {Component} from 'vue';
import {Bell, CarFront, FileText, Heart, Inbox, Lock, MessageSquare, UserRound} from '@lucide/vue';
import RequestBoard from '~/components/RequestBoard.vue';
import {useLocale} from '~/composables/useLocale';

const {t: i18nT} = useLocale();
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
</script>

<template>
  <div class="ds-container mine" id="content">
    <div class="layout">
      <nav class="acct" :aria-label="i18nT('Hesap menüsü')">
        <template v-for="n in accountNav" :key="n.label">
          <NuxtLink v-if="n.to" :to="n.to" :class="n.to==='/taleplerim'?'on':''" :aria-current="n.to==='/taleplerim'?'page':undefined"><component :is="n.icon" :size="18"/>{{ i18nT(n.label) }}</NuxtLink>
          <span v-else class="ds-passive" aria-disabled="true" :title="i18nT('Yakında')"><component :is="n.icon" :size="18"/>{{ i18nT(n.label) }}</span>
        </template>
      </nav>
      <RequestBoard/>
    </div>
  </div>
</template>

<style scoped>
.mine {max-width: 1440px; padding-top: 32px; padding-bottom: 64px;}
.layout {display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 32px; align-items: start;}
.acct {display: flex; flex-direction: column; gap: 4px;}
.acct a, .acct span {display: flex; align-items: center; gap: 12px; height: 44px; padding: 0 14px; border-radius: 10px; color: #3a4b5e; font-size: 13px; text-decoration: none;}
.acct a.on {background: #fff3ec; color: #a63c09; font-weight: 700;}
@media (max-width: 1100px) {.layout {grid-template-columns: 200px minmax(0, 1fr); gap: 24px;}}
@media (max-width: 760px) {
  .mine {padding-top: 20px; padding-bottom: 32px;}
  .layout {grid-template-columns: minmax(0, 1fr);}
  .acct {display: none;}
}
</style>
