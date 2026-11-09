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
  <article class="panel stack">
    <h3>{{ item.name }}</h3>
    <p>{{ item.city }} · {{ item.district }}<br/>{{ item.address }}<br/>{{ item.phone }} · {{ item.website }}</p>
    <p>{{ item.categories.map(id=>i18nT(categories.find(c=>c.id===id)?.name??id)).join(' · ') }}</p>
    <p>{{ item.services.map(s=>i18nT(s)).join(' · ') }}</p>
    <a v-if="item.latitude!==null&&item.longitude!==null" class="text-link" :href="`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`" target="_blank" rel="noopener noreferrer">{{ i18nT('Konumu haritada kontrol et') }} · {{ item.latitude }}, {{ item.longitude }}</a>
    <p v-else>{{ i18nT('Konum henüz doğrulanmadı.') }}</p>
    <CatalogueDraftEditor v-if="!item.published&&onSaved" :businessId="item.id" :onSaved="onSaved"/>
    <CatalogueHistory :businessId="item.id"/>
    <fieldset :disabled="busy||done" class="stack">
      <template v-if="!item.published">
        <div v-for="k in keys" :key="k">
          <label class="row"><input v-model="checked[k]" type="checkbox"/>{{ i18nT(checkLabels[k]) }}</label>
          <label class="stack small">{{ i18nT('Kanıt bağlantısı veya inceleme referansı') }}<input v-model="references[k]" :aria-label="`${i18nT(checkLabels[k])} · ${i18nT('İnceleme referansı')}`" maxlength="800"/></label>
        </div>
      </template>
      <label class="stack">{{ i18nT('İnceleme gerekçesi') }}<textarea v-model="reason" maxlength="1000"/></label>
      <p class="small muted">{{ i18nT('Yayın onayı sahiplik veya randevu yetkisi vermez. Yayından kaldırmak yeni talepleri durdurur.') }}</p>
      <button class="button primary" :disabled="!ready||busy||done" @click="void submit()">{{ i18nT(item.published?'Yayından kaldır':'İncelemeyi tamamla ve yayımla') }}</button>
    </fieldset>
    <p v-if="error" role="alert" class="error">{{ i18nT(error) }}</p>
    <p v-if="done" role="status">{{ i18nT('Karar kaydedildi.') }}</p>
  </article>
</template>
