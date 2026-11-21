<script setup lang="ts">
import {useLocale} from '~/composables/useLocale';

// "Sekmeler": in-page section links with the orange active underline.
defineProps<{active: string}>();
const emit = defineEmits<{select: [id: string]}>();
const {t} = useLocale();
// Labels are Turkish source texts, translated at render (English in app/locales/v2-discovery.json).
const tabs = [
  {id: 'genel', label: 'Genel bakış'},
  {id: 'hizmetler', label: 'Hizmetler'},
  {id: 'yorumlar', label: 'Yorumlar'},
  {id: 'fotograflar', label: 'Fotoğraflar'},
  {id: 'konum', label: 'Konum ve saatler'},
];
</script>

<template>
  <nav class="profile-tabs" :aria-label="t('Profil bölümleri')">
    <ul>
      <li v-for="tab in tabs" :key="tab.id">
        <a :href="`#${tab.id}`" class="t-label-md" :class="{on: active === tab.id}" :aria-current="active === tab.id ? 'true' : undefined" @click.prevent="emit('select', tab.id)">{{ t(tab.label) }}</a>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.profile-tabs{border-bottom:1px solid var(--cream-200);overflow-x:auto;scrollbar-width:none}
.profile-tabs::-webkit-scrollbar{display:none}
ul{display:flex;gap:32px}
a{display:flex;flex-direction:column;gap:12px;color:var(--ink-500);white-space:nowrap}
a::after{content:"";height:3px;border-radius:2px;background:transparent}
a:hover{color:var(--ink-900)}
a.on{color:var(--ink-900)}
a.on::after{background:var(--orange-500)}
@media (max-width:760px){ul{gap:22px}}
</style>
