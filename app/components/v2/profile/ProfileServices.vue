<script setup lang="ts">
import {Info} from '@lucide/vue';
import V2Chip from '~/components/v2/V2Chip.vue';
import type {ProfileView} from '~/lib/v2/profile';
import {useLocale} from '~/composables/useLocale';

// "Hizmetler" section: service chips, declared brand expertise (owner profiles) and a source note.
defineProps<{profile: ProfileView}>();
// Catalogue service names and the source note are Turkish source texts; t() shows them in the page language.
const {t} = useLocale();
</script>

<template>
  <section id="hizmetler" class="profile-services" aria-labelledby="hizmetler-baslik">
    <h2 id="hizmetler-baslik" class="t-h3">{{ t('Hizmetler') }}</h2>
    <ul v-if="profile.services.length" class="chips">
      <li v-for="service in profile.services" :key="service"><V2Chip>{{ t(service) }}</V2Chip></li>
    </ul>
    <p v-else class="t-body-sm t-muted">{{ t('Hizmet bilgisi henüz eklenmedi.') }}</p>
    <template v-if="profile.brands?.length">
      <h3 class="sub">{{ t('Beyan edilen marka uzmanlığı') }}</h3>
      <ul class="chips">
        <li v-for="brand in profile.brands" :key="brand"><V2Chip variant="soft">{{ t(brand) }}</V2Chip></li>
      </ul>
    </template>
    <p class="note t-body-sm"><Info :size="16" aria-hidden="true"/>{{ t(profile.sourceNote) }}</p>
  </section>
</template>

<style scoped>
.profile-services{display:flex;flex-direction:column;gap:18px;scroll-margin-top:110px}
.chips{display:flex;flex-wrap:wrap;gap:10px}
.sub{font-weight:600;font-size:16px;line-height:1.2;color:var(--ink-900)}
.note{display:flex;align-items:flex-start;gap:8px;color:var(--ink-500)}
.note :deep(svg){flex:none;margin-top:2px}
</style>
