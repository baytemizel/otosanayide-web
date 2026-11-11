<script setup lang="ts">
import type {CatalogueHistoryItem} from '@otosanayide/core/catalogue-history';
import {useLocale} from '~/composables/useLocale';

defineProps<{items: CatalogueHistoryItem[]}>();
const {t: i18nT, localeTag} = useLocale();
const kinds: Record<string, string> = {source_import: 'Kaynak taslağı oluşturuldu', catalogue_draft: 'Katalog taslağı düzenlendi', catalogue_publication: 'Katalog yayın kararı', profile_submitted: 'Profil değişikliği gönderildi', profile_reviewed: 'Profil değişikliği incelendi', other: 'Diğer işletme işlemi'};
const actions: Record<string, string> = {publish: 'Yayımlandı', withdraw: 'Yayından kaldırıldı', approve: 'Onaylandı', reject: 'Reddedildi'};
const checks: Record<string, string> = {rights: 'Kaynağı kullanma hakkı', identity: 'İşletme kimliği ve faaliyet', location: 'Adres ve harita noktası', duplicates: 'Mükerrer ve şube ayrımı'};
</script>

<template>
  <div class="ds-col ds-g8">
    <article v-for="item in items" :key="item.id" class="ds-card ds-pad16 ds-col ds-g4 ds-small">
      <strong>{{ i18nT(kinds[item.kind]??kinds.other!) }}</strong>
      <div v-if="item.action">{{ i18nT(actions[item.action]??item.action) }}</div>
      <div class="ds-xs ds-muted"><time v-if="item.createdAt" :datetime="item.createdAt">{{ new Intl.DateTimeFormat(localeTag,{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Istanbul'}).format(new Date(item.createdAt)) }}</time><template v-else>{{ i18nT('Tarih bilgisi yok') }}</template>{{ ' · ' }}{{ i18nT('Türkiye saati') }}</div>
      <div v-if="item.profileVersion!==null">{{ i18nT('Profil sürümü') }}: {{ item.profileVersion }}</div>
      <div v-if="item.publicationVersion!==null">{{ i18nT('Yayın sürümü') }}: {{ item.publicationVersion }}</div>
      <div v-if="item.reason" :style="{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}">{{ item.reason }}</div>
      <details v-if="item.checks.length>0">
        <summary class="ds-b" style="cursor:pointer">{{ i18nT('Karara ait inceleme referansları') }}</summary>
        <p v-for="check in item.checks" :key="check.key" :style="{overflowWrap:'anywhere',margin:'8px 0 0'}"><strong>{{ i18nT(checks[check.key]??check.key) }}</strong><br/>{{ check.reference }}</p>
      </details>
    </article>
  </div>
</template>
