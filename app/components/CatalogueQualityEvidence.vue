<script setup lang="ts">
import {qualityFieldLabels, qualityStatusLabels, type qualityEvidenceProjection} from '@otosanayide/core/catalogue-quality';
import {useLocale} from '~/composables/useLocale';

defineProps<{quality: ReturnType<typeof qualityEvidenceProjection>}>();
const {t, localeTag} = useLocale();
const hostnameOf = (source: string) => new URL(source).hostname;
</script>

<template>
  <section v-if="quality" class="ds-col ds-g8">
    <h4 style="font-size:16px;margin:0">{{ t('Alan bazında kaynak kontrolü') }}</h4>
    <div class="ds-xs ds-muted">{{ quality.checkedAt?`${t('Kontrol tarihi: ')}${new Date(quality.checkedAt).toLocaleString(localeTag)}`:t('Kontrol tamamlanamadı.') }}</div>
    <div class="ds-table-wrap ds-card" role="region" :aria-label="t('Alan bazında kaynak kontrolü')" tabindex="0">
      <table class="ds-table">
        <thead>
          <tr>
            <th>{{ t('Alan') }}</th>
            <th>{{ t('Kaynak kontrol sonucu') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in quality.statuses" :key="item.field">
            <th scope="row">{{ t(qualityFieldLabels[item.field]) }}</th>
            <td>{{ t(qualityStatusLabels[item.status]) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <details v-if="quality.sources.length>0" class="ds-small">
      <summary class="ds-b" style="cursor:pointer">{{ t('Kontrol kaynakları') }}</summary>
      <ul style="margin:8px 0 0;padding-left:18px">
        <li v-for="(source,index) in quality.sources" :key="source"><a class="text-link" :href="source" target="_blank" rel="noopener noreferrer">{{ t('Kaynak') }} {{ index+1 }} · {{ hostnameOf(source) }}</a></li>
      </ul>
    </details>
  </section>
</template>
