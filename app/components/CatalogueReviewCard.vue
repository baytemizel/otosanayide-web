<script setup lang="ts">
import {computed, ref} from 'vue';
import {categories} from '@otosanayide/core';
import type {PublicationAction} from '@otosanayide/core/catalogue-publication';
import CatalogueDraftEditor from '~/components/CatalogueDraftEditor.vue';
import CatalogueHistory from '~/components/CatalogueHistory.vue';
import {useLocale} from '~/composables/useLocale';
import type {CatalogueItem} from '~/lib/catalogue-review-helpers';

const checkLabels = {rights: 'Kaynağı kullanma hakkı', identity: 'İşletme kimliği ve faaliyet', location: 'Adres ve harita noktası', duplicates: 'Mükerrer ve şube ayrımı'};
type CheckKey = keyof typeof checkLabels;

const props = defineProps<{item: CatalogueItem; onSaved?: () => void; onAction: (action: PublicationAction) => Promise<void>}>();
const {t: i18nT} = useLocale();
const reason = ref('');
const checked = ref<Partial<Record<CheckKey, boolean>>>({});
const references = ref<Partial<Record<CheckKey, string>>>({});
const busy = ref(false);
const error = ref('');
const done = ref(false);
const keys = Object.keys(checkLabels) as CheckKey[];
const ready = computed(() => reason.value.trim().length >= 10 && (props.item.published || keys.every(k => checked.value[k] && (references.value[k]?.trim().length ?? 0) >= 10)));

async function submit() {
  if (!ready.value) return;
  busy.value = true;
  error.value = '';
  try {
    const base = {businessId: props.item.id, version: props.item.version, profileVersion: props.item.profileVersion, reason: reason.value};
    await props.onAction(props.item.published ? {...base, action: 'withdraw'} : {...base, action: 'publish', checks: Object.fromEntries(keys.map(k => [k, {checked: true, reference: references.value[k]!.trim()}])) as Extract<PublicationAction, {action: 'publish'}>['checks']});
    done.value = true;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'İşlem tamamlanamadı.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <article class="ds-card ds-pad24 ds-col ds-g16" style="overflow-wrap:anywhere">
    <div class="ds-col ds-g8">
      <h3 style="margin:0">{{ item.name }}</h3>
      <div class="ds-small ds-muted">{{ item.city }} · {{ item.district }}<br/>{{ item.address }}<br/>{{ item.phone }} · {{ item.website }}</div>
      <div class="ds-small">{{ item.categories.map(id=>i18nT(categories.find(c=>c.id===id)?.name??id)).join(' · ') }}</div>
      <div class="ds-small ds-muted">{{ item.services.map(s=>i18nT(s)).join(' · ') }}</div>
      <a v-if="item.latitude!==null&&item.longitude!==null" class="text-link ds-small" :href="`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`" target="_blank" rel="noopener noreferrer">{{ i18nT('Konumu haritada kontrol et') }} · {{ item.latitude }}, {{ item.longitude }}</a>
      <div v-else class="ds-small ds-muted">{{ i18nT('Konum henüz doğrulanmadı.') }}</div>
    </div>
    <CatalogueDraftEditor v-if="!item.published&&onSaved" :businessId="item.id" :onSaved="onSaved"/>
    <CatalogueHistory :businessId="item.id"/>
    <div class="ds-divider"/>
    <fieldset :disabled="busy||done" class="ds-col ds-g16" style="border:0;padding:0;margin:0;min-width:0">
      <template v-if="!item.published">
        <div v-for="k in keys" :key="k" class="ds-col ds-g8">
          <label class="ds-row ds-as ds-g10 ds-small ds-b"><input v-model="checked[k]" class="ds-check" type="checkbox"/>{{ i18nT(checkLabels[k]) }}</label>
          <label class="ds-col"><span class="ds-label">{{ i18nT('Kanıt bağlantısı veya inceleme referansı') }}</span><input v-model="references[k]" class="ds-field" :aria-label="`${i18nT(checkLabels[k])} · ${i18nT('İnceleme referansı')}`" maxlength="800"/></label>
        </div>
      </template>
      <label class="ds-col"><span class="ds-label">{{ i18nT('İnceleme gerekçesi') }}</span><textarea v-model="reason" class="ds-field" maxlength="1000"/><span class="ds-help">{{ i18nT('Yayın onayı sahiplik veya randevu yetkisi vermez. Yayından kaldırmak yeni talepleri durdurur.') }}</span></label>
      <div><button class="ds-btn" :class="item.published?'d':'n'" :disabled="!ready||busy||done" @click="void submit()">{{ i18nT(item.published?'Yayından kaldır':'İncelemeyi tamamla ve yayımla') }}</button></div>
    </fieldset>
    <div v-if="error" role="alert" class="ds-note err">{{ i18nT(error) }}</div>
    <div v-if="done" role="status" class="ds-note ok">{{ i18nT('Karar kaydedildi.') }}</div>
  </article>
</template>

<style scoped>
input.ds-check{width:20px;height:20px;min-height:0;padding:0}
@media(max-width:480px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;text-align:center}}
</style>
