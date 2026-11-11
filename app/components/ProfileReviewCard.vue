<script setup lang="ts">
import {computed, ref} from 'vue';
import {categories} from '@otosanayide/core';
import type {BusinessProfileInput} from '@otosanayide/core/business-management';
import {useLocale} from '~/composables/useLocale';
import type {Change} from '~/lib/business-change-review-helpers';

const labels: Record<keyof BusinessProfileInput, string> = {name: 'İşletme', city: 'İl', district: 'İlçe', address: 'Adres', phone: 'Telefon', contactEmail: 'İşletme e-postası', website: 'Web sitesi', hours: 'Saatler', description: 'Açıklama', categories: 'Kategoriler', services: 'Hizmetler', brands: 'Markalar', location: 'Konum'};

function show(key: keyof BusinessProfileInput, value: unknown) {
  if (value == null || value === '') return 'Belirtilmedi';
  if (key === 'categories' && Array.isArray(value)) return value.map(id => categories.find(c => c.id === id)?.name ?? id).join(', ');
  if (Array.isArray(value)) return value.join(', ') || 'Belirtilmedi';
  if (typeof value === 'object') {
    const p = value as {latitude: number; longitude: number};
    return `${p.latitude}, ${p.longitude}`;
  }
  return String(value);
}

const props = defineProps<{change: Change; onDecision: (decision: 'approve' | 'reject', reason: string) => Promise<void>}>();
const {t: i18nT} = useLocale();
const reason = ref('');
const busy = ref(false);
const error = ref('');
const rows = computed(() => (Object.keys(labels) as (keyof BusinessProfileInput)[]).map(k => ({k, old: show(k, props.change.current?.[k]), next: show(k, props.change.profile[k])})));

async function decide(decision: 'approve' | 'reject') {
  if (reason.value.trim().length < 10) {
    error.value = 'En az 10 karakterlik inceleme gerekçesi yaz.';
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    await props.onDecision(decision, reason.value.trim());
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'İşlem tamamlanamadı.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="ds-card ds-pad24 prc">
    <h2 class="prc-h">{{ change.profile.name }}</h2>
    <p class="ds-small ds-muted">{{ i18nT("İşletme: ") }}{{ change.id }}{{ i18nT(" · Yalnızca profil değişikliği inceleniyor.") }}</p>
    <div class="profile-detail-list">
      <div v-for="row in rows" :key="row.k" class="profile-detail-row">
        <strong class="ds-small">{{ i18nT(labels[row.k]) }}</strong>
        <div class="profile-detail-value">
          <template v-if="row.old!==row.next"><p class="ds-muted">{{ i18nT("Mevcut: ") }}{{ row.old }}</p><p><strong>{{ i18nT("Önerilen:") }}</strong> {{ row.next }}</p></template>
          <p v-else>{{ row.next }}</p>
        </div>
      </div>
    </div>
    <label class="ds-label prc-field">{{ i18nT("İnceleme gerekçesi") }}<textarea v-model="reason" class="ds-field" maxlength="1000" :disabled="busy"/></label>
    <p class="ds-xs ds-muted">{{ i18nT("Onay, adres/nokta değiştiyse koordinat doğrulamasını kaldırır. Sahiplik, yayın, reklam veya randevu yetkisi değiştirmez.") }}</p>
    <p v-if="error" role="alert" class="ds-note err">{{ i18nT(error) }}</p>
    <div class="ds-row ds-g8 ds-wrap"><button class="ds-btn p" :disabled="busy" @click="decide('approve')">{{ i18nT("Değişikliği onayla") }}</button><button class="ds-btn s" :disabled="busy" @click="decide('reject')">{{ i18nT("Gerekçeyle reddet") }}</button></div>
  </section>
</template>

<style scoped>
.prc {display: flex; flex-direction: column; gap: 12px; margin-bottom: 16px;}
.prc p {margin: 0;}
.prc-h {margin: 0; font-size: 26px;}
.prc-field {display: flex; flex-direction: column; gap: 6px; margin: 0;}
</style>
