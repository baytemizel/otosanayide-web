<script setup lang="ts">
import {computed} from 'vue';
import {FileText} from '@lucide/vue';
import {useLocale} from '~/composables/useLocale';
import {publicEnv} from '~/lib/env';
import {isLegalSlug, legalPages} from '~/lib/legal';

const route = useRoute();
const {t: i18nT} = useLocale();
const slug = String(route.params.slug);
if (!publicEnv().legalPagesEnabled || !isLegalSlug(slug)) throw createError({statusCode: 404, statusMessage: 'Not Found', fatal: true});
const page = computed(() => legalPages[slug as keyof typeof legalPages]);
// Drafts are never offered to search engines, whatever the site-wide indexing flag says.
useSeoMeta({title: () => i18nT(page.value.title), robots: 'noindex, nofollow'});
</script>

<template>
  <article id="content" class="ds-container legal">
    <span class="ds-badge warn">{{ i18nT('Taslak · yayımlanmadı') }}</span>
    <h1 class="ds-serif">{{ i18nT(page.title) }}</h1>
    <div class="ds-note warn" role="note">
      <FileText class="ds-i" :size="16" aria-hidden="true"/>
      <span>{{ i18nT('Bu metin hukuk incelemesinden geçmedi ve yürürlükte değildir. Onaylanan metin yayımlandığında bu sayfada yer alacak.') }}</span>
    </div>
    <p class="ds-xs ds-muted">{{ i18nT('Kaynak belge: {0}', {'0': page.source}) }}</p>
    <NuxtLink class="ds-btn s" to="/hakkinda">{{ i18nT('Hakkında') }}</NuxtLink>
  </article>
</template>

<style scoped>
.legal {display: flex; flex-direction: column; align-items: flex-start; gap: 16px; max-width: 760px; padding-top: 48px; padding-bottom: 72px; min-height: 60vh;}
h1 {margin: 0; font-size: 34px; line-height: 38px;}
p {margin: 0;}
@media (max-width: 480px) {h1 {font-size: 28px; line-height: 32px;}}
</style>
