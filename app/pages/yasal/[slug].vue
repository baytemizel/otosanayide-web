<script setup lang="ts">
import {computed} from 'vue';
import {FileText} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import V2PageHeader from '~/components/v2/V2PageHeader.vue';
import {publicEnv} from '~/lib/env';
import {isLegalSlug, legalPages} from '~/lib/legal';

// Legal drafts (K160): only the title ships; the page exists only while legal pages are enabled.
const route = useRoute();
const slug = String(route.params.slug);
if (!publicEnv().legalPagesEnabled || !isLegalSlug(slug)) throw createError({statusCode: 404, statusMessage: 'Not Found', fatal: true});
const page = computed(() => legalPages[slug as keyof typeof legalPages]);
useSeoMeta({title: () => page.value.title, robots: 'noindex, nofollow'});
</script>

<template>
  <div>
    <V2PageHeader eyebrow="Yasal · taslak" :title="page.title"/>
    <div class="v2-wrap body">
      <div class="surface card">
        <p class="hint"><FileText aria-hidden="true"/>Bu metin hukuk incelemesinden geçmedi ve yürürlükte değildir. Onaylanan metin yayımlandığında bu sayfada yer alacak.</p>
        <p class="t-body-sm t-muted">Kaynak belge: {{ page.source }}</p>
        <V2Button variant="outline" to="/hakkinda">Hakkında</V2Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.body{padding-top:36px;padding-bottom:96px}
.card{display:flex;flex-direction:column;align-items:flex-start;gap:16px;max-width:760px;padding:28px}
</style>
