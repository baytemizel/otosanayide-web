<script setup lang="ts">
import {computed} from 'vue';
import {AlarmClock, ChevronRight, Plus} from '@lucide/vue';
import ReminderManager from '~/components/ReminderManager.vue';
import SystemAccountLayout from '~/components/SystemAccountLayout.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';

const {t: i18nT} = useLocale();
const app = useApp();
/** Reminders belong to a vehicle; archived vehicles are read-only, as on Araçlarım. */
const vehicles = computed(() => app.data.vehicles.filter(v => !v.archived));
useSeoMeta({title: () => i18nT('Hatırlatmalar')});
</script>

<template>
  <SystemAccountLayout>
    <div class="ds-col ds-g4">
      <h1 class="ds-serif">{{ i18nT("Hatırlatmalar") }}</h1>
      <p class="ds-small ds-muted">{{ i18nT("Araçlarının bakım ve muayene hatırlatmaları tek yerde.") }}</p>
    </div>
    <p v-if="!app.ready" class="ds-small ds-muted">{{ i18nT("Hesabın yükleniyor…") }}</p>
    <div v-else-if="!app.member" class="ds-card empty">
      <span class="empty-icon"><AlarmClock :size="36"/></span>
      <h2>{{ i18nT("Ücretsiz hesabınla daha fazlası.") }}</h2>
      <NuxtLink class="ds-btn p" to="/giris">{{ i18nT("Giriş yap") }}</NuxtLink>
    </div>
    <div v-else-if="!vehicles.length" class="ds-card empty">
      <span class="empty-icon"><AlarmClock :size="36"/></span>
      <p class="ds-small ds-muted">{{ i18nT("Hatırlatma eklemek için önce bir araç ekle.") }}</p>
      <NuxtLink class="ds-btn p" to="/araclarim"><Plus :size="16"/>{{ i18nT("Araç ekle") }}</NuxtLink>
    </div>
    <div v-else class="grid">
      <section v-for="v in vehicles" :key="v.id" class="ds-col ds-g10" :aria-label="`${v.brand} ${v.model} · ${v.year}`">
        <div class="ds-row ds-sb ds-g8">
          <strong class="veh">{{ v.brand }} {{ v.model }} · {{ v.year }}</strong>
          <NuxtLink class="open ds-xs" :to="{path: '/araclarim', query: {arac: v.id}}">{{ i18nT("Aracı aç") }}<ChevronRight :size="14"/></NuxtLink>
        </div>
        <ReminderManager :vehicle="v"/>
      </section>
    </div>
  </SystemAccountLayout>
</template>

<style scoped>
h1 {margin: 0; font-size: 34px; line-height: 38px;}
h2 {margin: 0; font: 700 19px/24.7px Arimo, Arial, sans-serif; letter-spacing: 0;}
p {margin: 0;}
.grid {display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: 24px; align-items: start;}
.veh {font-size: 15px; line-height: 22.5px; overflow-wrap: anywhere;}
.open {display: inline-flex; align-items: center; gap: 2px; flex: none; color: #c4460b; font-weight: 700;}
.empty {display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 64px 24px; text-align: center;}
.empty-icon {display: grid; place-items: center; width: 96px; height: 96px; border-radius: 48px; background: #f4f6f8;}
@media (max-width: 480px) {
  h1 {font-size: 28px; line-height: 32px;}
}
</style>
