<script setup lang="ts">
import {onMounted, ref} from 'vue';
import {Bell, Calendar, File, Heart, Lock, MessageSquare, ShieldCheck, User} from '@lucide/vue';
import {useSession} from '~/composables/useSession';

// "Hesap menüsü" (W13, W15, W17, W18): member head + account links, the current page is the dark row.
defineProps<{active: 'hatirlatmalar' | 'kaydedilenler' | 'taleplerim' | 'yorumlarim' | 'bildirimler' | 'basvurularim' | 'hesabim' | 'gizlilik'}>();

const {label} = useSession();
const items = [
  {key: 'hatirlatmalar', label: 'Hatırlatmalar', to: '/hatirlatmalar', icon: Calendar},
  {key: 'kaydedilenler', label: 'Kaydedilenler', to: '/kaydedilenler', icon: Heart},
  {key: 'taleplerim', label: 'Taleplerim', to: '/taleplerim', icon: File},
  {key: 'yorumlarim', label: 'Yorumlarım', to: '/yorumlarim', icon: MessageSquare},
  {key: 'bildirimler', label: 'Bildirimler', to: '/bildirimler', icon: Bell},
  {key: 'basvurularim', label: 'Başvurularım', to: '/basvurularim', icon: ShieldCheck},
  {key: 'hesabim', label: 'Hesabım', to: '/hesabim', icon: User},
  {key: 'gizlilik', label: 'Gizlilik ve veri', to: '/hesabim#gizlilik', icon: Lock},
] as const;

// On narrow screens the links become a horizontal strip: bring the current page into view.
const list = ref<HTMLElement | null>(null);
onMounted(() => {
  const el = list.value;
  const current = el?.querySelector<HTMLElement>('.on');
  if (el && current && el.scrollWidth > el.clientWidth) el.scrollLeft = current.offsetLeft - 10;
});
</script>

<template>
  <nav class="acc-menu" aria-label="Hesap menüsü">
    <div class="who">
      <span class="initials" aria-hidden="true">{{ label.initials }}</span>
      <div class="who-copy">
        <p class="t-label-md">{{ label.short }}</p>
        <p class="t-body-sm t-muted">Ücretsiz hesap</p>
      </div>
    </div>
    <ul ref="list" class="links">
      <li v-for="item in items" :key="item.key">
        <NuxtLink :to="item.to" class="link" :class="{on: item.key === active}" :aria-current="item.key === active ? 'page' : undefined">
          <component :is="item.icon" :size="18" aria-hidden="true"/>{{ item.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.acc-menu{width:280px;align-self:flex-start;flex:none;display:flex;flex-direction:column;gap:4px;padding:16px;background:var(--white);border:1px solid var(--cream-200);border-radius:28px}
.who{display:flex;align-items:center;gap:12px;padding:8px 8px 16px}
.initials{width:44px;height:44px;flex:none;border-radius:999px;background:var(--ink-900);display:grid;place-items:center;font-family:var(--font-mono);font-weight:700;font-size:11px;letter-spacing:.06em;color:var(--lime-400)}
.who-copy{display:flex;flex-direction:column;gap:2px;min-width:0}
.links{position:relative;display:flex;flex-direction:column;gap:4px}
.link{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;font-weight:600;font-size:15px;line-height:1.2;color:var(--ink-800);white-space:nowrap}
.link svg{color:var(--ink-700);flex:none}
.link:hover{background:var(--cream-50)}
.link.on{background:var(--ink-900);color:var(--white)}
.link.on svg{color:var(--lime-400)}
@media (max-width:1000px){
  .acc-menu{width:100%;padding:10px;border-radius:24px}
  .who{display:none}
  .links{flex-direction:row;overflow-x:auto;scrollbar-width:none}
  .links::-webkit-scrollbar{display:none}
  .link{padding:10px 14px}
}
</style>
