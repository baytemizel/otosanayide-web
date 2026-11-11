<script setup lang="ts">
import {computed, ref} from 'vue';
import {Info, Pencil, ShieldCheck, TriangleAlert} from '@lucide/vue';
import {categories, cities} from '@otosanayide/core';
import {businessProfileSchema, type BusinessProfileInput} from '@otosanayide/core/business-management';
import LocationMap from '~/components/LocationMap.vue';
import PlaceSearch from '~/components/PlaceSearch.vue';
import {useLocale} from '~/composables/useLocale';
import type {ManagedBusiness} from '~/lib/managed-business-profile-helpers';

const labels: Record<keyof BusinessProfileInput, string> = {name: 'İşletme adı', city: 'İl', district: 'İlçe', address: 'Adres ve konum', phone: 'Telefon', contactEmail: 'İşletme e-postası', website: 'Web sitesi', hours: 'Çalışma saatleri', description: 'İşletme açıklaması', categories: 'Hizmet kategorileri', services: 'Hizmetler', brands: 'Marka uzmanlığı', location: 'Konum'};
const keys = (Object.keys(labels) as (keyof BusinessProfileInput)[]).filter(k => k !== 'location');

// React's autoFocus focuses imperatively on mount; the autofocus attribute is ignored for elements added after load.
const vFocusOnMount = {mounted: (el: HTMLElement) => el.focus()};

const props = withDefaults(defineProps<{business: ManagedBusiness; onSubmit: (profile: BusinessProfileInput) => Promise<void>; catalogue?: boolean; section?: 'location'}>(), {catalogue: false, section: undefined});
const {t: i18nT} = useLocale();
const initial = props.business.change && props.business.change.status !== 'approved' ? props.business.change.profile : props.business;
const profile = ref<BusinessProfileInput>(Object.fromEntries(Object.keys(labels).map(k => [k, initial[k as keyof BusinessProfileInput]])) as BusinessProfileInput);
const editing = ref<keyof BusinessProfileInput | null>(null);
const dirty = ref(false);
const busy = ref(false);
const error = ref('');
const message = ref('');
const value = ref('');
const address = ref('');
const lat = ref('');
const lng = ref('');
const selected = ref<string[]>([]);
const locationTab = ref<'address' | 'hours'>('address');
const visibleKeys = computed<(keyof BusinessProfileInput)[]>(() => (props.section === 'location' ? [locationTab.value] : keys));
const pointMoved = computed(() => editing.value === 'address' && !!profile.value.location && address.value === profile.value.address && lat.value !== '' && lng.value !== '' && (lat.value !== String(profile.value.location.latitude) || lng.value !== String(profile.value.location.longitude)));

function isBlank(k: keyof BusinessProfileInput) {
  const current = profile.value[k];
  return Array.isArray(current) ? !current.length : !current;
}

function edit(k: keyof BusinessProfileInput) {
  editing.value = k;
  error.value = '';
  message.value = '';
  value.value = Array.isArray(profile.value[k]) ? (profile.value[k] as string[]).join(', ') : String(profile.value[k] ?? '');
  selected.value = profile.value.categories;
  address.value = profile.value.address;
  lat.value = String(profile.value.location?.latitude ?? '');
  lng.value = String(profile.value.location?.longitude ?? '');
}

function apply(e: Event) {
  e.preventDefault();
  const field = editing.value;
  if (!field) return;
  let next = {...profile.value};
  if (field === 'address') {
    if ((lat.value === '') !== (lng.value === '')) {
      error.value = 'Enlem ve boylamı birlikte gir.';
      return;
    }
    next = {...next, address: address.value, location: lat.value === '' ? null : {latitude: Number(lat.value), longitude: Number(lng.value)}};
  } else if (field === 'categories') next.categories = selected.value;
  else if (field === 'services' || field === 'brands')
    next[field] = value.value
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
  else next = {...next, [field]: value.value.trim()};
  const fieldSchema = field === 'address' ? businessProfileSchema.pick({address: true, location: true}) : businessProfileSchema.pick({[field]: true} as Record<keyof BusinessProfileInput, true>);
  const checked = fieldSchema.safeParse(field === 'address' ? {address: next.address, location: next.location} : {[field]: next[field]});
  if (!checked.success) {
    error.value = checked.error.issues.map(i => `${labels[i.path[0] as keyof BusinessProfileInput] ?? 'Alan'}: ${i.message}`).join(' · ');
    return;
  }
  profile.value = next;
  dirty.value = true;
  editing.value = null;
  error.value = '';
  message.value = props.catalogue ? 'Taslak güncellendi. Kaydı tamamlamak için Taslağı kaydet düğmesini kullan.' : 'Taslak güncellendi. İşletmeye iletmek için İncelemeye gönder düğmesini kullan.';
}

async function submit() {
  busy.value = true;
  error.value = '';
  try {
    const parsed = businessProfileSchema.safeParse(profile.value);
    if (!parsed.success) throw Error(parsed.error.issues.map(i => `${labels[i.path[0] as keyof BusinessProfileInput] ?? 'Alan'}: ${i.message}`).join(' · '));
    await props.onSubmit(parsed.data);
    dirty.value = false;
    message.value = props.catalogue ? 'Taslak kaydedildi. Yayın için ayrı inceleme gerekir.' : 'Değişiklik incelemeye gönderildi. Yayımlanan bilgiler onaydan sonra güncellenir.';
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Gönderilemedi.';
  } finally {
    busy.value = false;
  }
}

function selectPlace(p: {address: string; latitude: number; longitude: number}) {
  address.value = p.address;
  lat.value = String(p.latitude);
  lng.value = String(p.longitude);
}
function moveTo(a: number, b: number) {
  lat.value = String(a);
  lng.value = String(b);
}
function clearPoint() {
  lat.value = '';
  lng.value = '';
}
function cancel() {
  editing.value = null;
  error.value = '';
}
function toggleCategory(id: string, e: Event) {
  const checked = (e.target as HTMLInputElement).checked;
  selected.value = checked ? [...selected.value, id] : selected.value.filter(x => x !== id);
}
function display(k: keyof BusinessProfileInput) {
  const current = profile.value[k];
  if (k === 'categories') return profile.value.categories.map(id => i18nT(categories.find(c => c.id === id)?.name ?? id)).join(', ');
  return Array.isArray(current) ? (current as string[]).join(', ') || i18nT('Henüz eklenmedi') : String(current || i18nT('Henüz eklenmedi'));
}
function mapsUrl() {
  return `https://www.google.com/maps/search/?api=1&query=${profile.value.location?.latitude},${profile.value.location?.longitude}`;
}
</script>

<template>
  <div class="ds-col ds-g20 business-profile-details">
    <div v-if="section==='location'" class="ds-tabs">
      <button type="button" :class="{on: locationTab==='address'}" :aria-pressed="locationTab==='address'" :disabled="editing!==null" @click="locationTab='address'">{{ i18nT("Konum") }}</button>
      <button type="button" :class="{on: locationTab==='hours'}" :aria-pressed="locationTab==='hours'" :disabled="editing!==null" @click="locationTab='hours'">{{ i18nT("Çalışma saatleri") }}</button>
      <button type="button" class="ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT("Tatil ve izinler") }}</button>
    </div>
    <div class="ds-note info"><Info :size="16" class="ds-i"/><span>{{ i18nT(catalogue ? "Kalemle düzenle ve taslağı kaydet. Kaynak önerilerini bağımsız kontrol et; kaydetmek yayın veya konum doğrulaması değildir." : "Kalemle düzenle, taslağı kontrol et ve incelemeye gönder. Adres veya nokta değişikliği yeniden konum doğrulaması gerektirir.") }}</span></div>
    <div :class="['pf-grid', {solo: section==='location'}]">
      <section class="ds-card pf-card">
        <header class="pf-head">
          <div class="ds-row ds-g10 ds-f1">
            <ShieldCheck :size="20" class="ds-i"/>
            <div class="ds-f1">
              <h3>{{ i18nT("Kayıtlı işletme bilgileri") }}</h3>
              <p class="ds-xs ds-muted">{{ business.name }} · {{ i18nT(catalogue ? "Katalog taslağı · Profil sürümü " : "Doğrulanmış işletme hesabı · Profil sürümü ") }}{{ business.version }}</p>
            </div>
          </div>
          <span v-if="editing" class="ds-badge info">{{ i18nT("1 alan düzenleniyor") }}</span>
        </header>
        <div v-for="k in visibleKeys" :key="k" :class="['pf-row', {editing: editing===k, dim: editing!==null && editing!==k}]">
          <form v-if="editing===k" class="pf-form" @submit="apply">
            <template v-if="k==='address'">
              <div :class="['loc-edit', {wide: section==='location'}]">
                <div class="ds-col ds-g12 loc-map">
                  <PlaceSearch :onSelect="selectPlace"/>
                  <LocationMap v-if="lat!=='' && lng!=='' && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))" :latitude="Number(lat)" :longitude="Number(lng)" :onMove="moveTo"/>
                  <div v-else-if="section==='location'" class="ds-mapbg loc-placeholder" aria-hidden="true"/>
                </div>
                <div class="pf-form">
                  <h3 v-if="section==='location'">{{ i18nT("Adres ve koordinat") }}</h3>
                  <label>{{ i18nT("Adres metni") }}<textarea v-model="address" class="ds-field" required minlength="10" maxlength="500"/></label>
                  <div class="form-grid"><label>{{ i18nT("Enlem") }}<input class="ds-field" type="number" step="any" min="-90" max="90" :value="lat" @input="lat=($event.target as HTMLInputElement).value"/></label><label>{{ i18nT("Boylam") }}<input class="ds-field" type="number" step="any" min="-180" max="180" :value="lng" @input="lng=($event.target as HTMLInputElement).value"/></label></div>
                  <div><button type="button" class="ds-btn g sm" @click="clearPoint">{{ i18nT("Konum noktasını kaldır") }}</button></div>
                  <div v-if="pointMoved" class="ds-note warn"><TriangleAlert :size="16" class="ds-i"/><span>{{ i18nT("İşaret taşındı. Adres metni otomatik değişmez; ikisini kontrol edip kaydet.") }}</span></div>
                  <div v-if="section==='location' && !catalogue" class="ds-note"><ShieldCheck :size="16" class="ds-i"/><span>{{ i18nT("Konum değişikliği doğrulanmış statüyü otomatik kazanmaz; yönetim incelemesine gider.") }}</span></div>
                </div>
              </div>
            </template>
            <fieldset v-else-if="k==='categories'" class="pf-categories"><legend class="ds-label">{{ i18nT("Hizmet kategorileri") }}</legend><label v-for="c in categories" :key="c.id" class="pf-category"><input class="ds-check chk" type="checkbox" :checked="selected.includes(c.id)" @change="toggleCategory(c.id,$event)"/>{{ i18nT(c.name) }}</label></fieldset>
            <label v-else>{{ i18nT(labels[k]) }}<select v-if="k==='city'" v-model="value" class="ds-field"><option v-for="c in cities" :key="c" :value="c">{{ c }}</option></select><input v-else-if="k==='contactEmail'" v-model="value" v-focus-on-mount class="ds-field" type="email" autocomplete="email" autocapitalize="none" maxlength="254"/><textarea v-else v-model="value" v-focus-on-mount :class="['ds-field', {short: !['description','services','brands','hours'].includes(k)}]" :maxlength="k==='brands'?8000:k==='services'?6000:2000"/></label>
            <p v-if="k==='services' || k==='brands'" class="ds-xs ds-muted">{{ i18nT("Birden fazla değeri virgülle ayır.") }}</p>
            <div v-if="error" role="alert" class="ds-note err">{{ i18nT(error) }}</div>
            <div class="ds-row ds-g10 ds-wrap"><button class="ds-btn p sm">{{ i18nT("Taslağa kaydet") }}</button><button type="button" class="ds-btn g sm" @click="cancel">{{ i18nT("Vazgeç") }}</button></div>
          </form>
          <template v-else>
            <div class="pf-label">{{ i18nT(labels[k]) }}</div>
            <div :class="['pf-value', {'ds-muted': isBlank(k)}]">{{ display(k) }}<template v-if="k==='address' && profile.location"><LocationMap :latitude="profile.location.latitude" :longitude="profile.location.longitude"/><a class="text-link" target="_blank" rel="noopener noreferrer" :href="mapsUrl()">{{ i18nT("Google Maps’te aç") }}</a></template></div>
            <button class="ds-iconbtn pf-pencil" :aria-label="i18nT('{0} düzenle',{'0':i18nT(labels[k])})" :disabled="busy || editing!==null" @click="edit(k)"><Pencil :size="15"/></button>
          </template>
        </div>
        <div class="pf-foot">
          <div v-if="error && !editing" role="alert" class="ds-note err">{{ i18nT(error) }}</div>
          <div v-if="message" role="status" class="ds-note ok">{{ i18nT(message) }}</div>
          <div><button class="ds-btn p" :disabled="!dirty || busy || editing!==null" @click="submit">{{ busy ? i18nT("Gönderiliyor…") : i18nT(catalogue ? "Taslağı kaydet" : "İncelemeye gönder") }}</button></div>
          <p class="ds-xs ds-muted">{{ i18nT("Gönderilmemiş taslak bu ekrandan ayrılınca silinir. İnceleme sonucu yayın ve randevu yetkisi vermez.") }}</p>
        </div>
      </section>
      <aside class="ds-card ds-pad24 ds-col ds-g12">
        <h3>{{ i18nT("Değişiklik geçmişi") }}</h3>
        <template v-if="business.change">
          <div><span :class="['ds-badge', business.change.status==='pending' ? 'warn' : business.change.status==='rejected' ? 'err' : 'ok']">{{ business.change.status==='pending' ? i18nT("Profil değişikliği incelemede") : business.change.status==='rejected' ? i18nT("Düzeltme gerekiyor") : i18nT("Son değişiklik onaylandı") }}</span></div>
          <p v-if="business.change.reason" class="ds-xs ds-muted">{{ business.change.reason }}</p>
        </template>
        <p v-else class="ds-small ds-muted">{{ i18nT("Henüz kayıtlı değişiklik yok.") }}</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
p {margin: 0;}
h3 {margin: 0;}
.pf-grid {display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 20px; align-items: start;}
.pf-grid.solo {grid-template-columns: minmax(0, 1fr);}
.pf-card {overflow: hidden;}
.pf-head {display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 20px;}
.pf-row {display: grid; grid-template-columns: 180px minmax(0, 1fr) 34px; align-items: center; gap: 16px; padding: 18px 20px; border-bottom: 1px solid #edf0f3;}
.pf-row.editing {display: block; background: #fffaf6;}
.pf-row.dim {opacity: .5;}
.pf-label {font-size: 13px; color: #586879;}
.pf-value {font-size: 15px; white-space: pre-wrap; overflow-wrap: anywhere;}
.pf-pencil {width: 34px; height: 34px;}
.pf-foot {display: flex; flex-direction: column; gap: 12px; padding: 20px;}
.pf-form {display: flex; flex-direction: column; gap: 12px; min-width: 0;}
.pf-form label {display: flex; flex-direction: column; gap: 6px; font-size: 13px; font-weight: 700;}
.pf-form textarea.short {height: 48px; min-height: 48px; padding-top: 12px;}
.pf-categories {display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; min-width: 0; margin: 0; padding: 0; border: 0;}
.pf-categories legend {padding: 0;}
.pf-form label.pf-category {flex-direction: row; align-items: center; gap: 10px; font-size: 14px; font-weight: 400;}
input.ds-check.chk {width: 20px; min-height: 0; padding: 0;}
.loc-edit {display: flex; flex-direction: column; gap: 16px;}
.loc-edit.wide {display: grid; grid-template-columns: minmax(0, 1fr) 400px; gap: 20px; align-items: start;}
.loc-map {min-width: 0;}
.loc-placeholder {min-height: 320px; border-radius: 14px;}
.loc-edit.wide .loc-placeholder {min-height: 460px;}
.loc-edit.wide :deep(.location-map) {height: 460px; margin: 0; border-radius: 14px;}
@media (max-width: 1100px) {
  .pf-grid {grid-template-columns: minmax(0, 1fr);}
  .loc-edit.wide {grid-template-columns: minmax(0, 1fr);}
  .loc-edit.wide :deep(.location-map), .loc-edit.wide .loc-placeholder {height: 320px; min-height: 320px;}
}
@media (max-width: 760px) {
  .pf-row {grid-template-columns: minmax(0, 1fr) 34px; gap: 4px 12px;}
  .pf-label {grid-column: 1;}
  .pf-value {grid-column: 1;}
  .pf-pencil {grid-column: 2; grid-row: 1 / 3;}
}
</style>
