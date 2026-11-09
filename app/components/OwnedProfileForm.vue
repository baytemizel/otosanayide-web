<script setup lang="ts">
import {ref} from 'vue';
import {Pencil, ShieldCheck} from '@lucide/vue';
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

const props = withDefaults(defineProps<{business: ManagedBusiness; onSubmit: (profile: BusinessProfileInput) => Promise<void>; catalogue?: boolean}>(), {catalogue: false});
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
  <section class="panel business-profile-details">
    <div class="profile-summary"><ShieldCheck/><div><h2>{{ business.name }}</h2><p>{{ i18nT(catalogue ? "Katalog taslağı · Profil sürümü " : "Doğrulanmış işletme hesabı · Profil sürümü ") }}{{ business.version }}</p></div></div>
    <div v-if="business.change" class="notice"><strong>{{ business.change.status==='pending' ? i18nT("Profil değişikliği incelemede") : business.change.status==='rejected' ? i18nT("Düzeltme gerekiyor") : i18nT("Son değişiklik onaylandı") }}</strong><p v-if="business.change.reason">{{ business.change.reason }}</p></div>
    <p class="muted">{{ i18nT(catalogue ? "Kalemle düzenle ve taslağı kaydet. Kaynak önerilerini bağımsız kontrol et; kaydetmek yayın veya konum doğrulaması değildir." : "Kalemle düzenle, taslağı kontrol et ve incelemeye gönder. Adres veya nokta değişikliği yeniden konum doğrulaması gerektirir.") }}</p>
    <div class="profile-detail-list">
      <div v-for="k in keys" :key="k" :class="`profile-detail-row ${editing===k?'editing':''}`">
        <div class="profile-detail-label">{{ i18nT(labels[k]) }}</div>
        <form v-if="editing===k" class="profile-inline-form" @submit="apply">
          <template v-if="k==='address'">
            <PlaceSearch :onSelect="selectPlace"/>
            <label>{{ i18nT("Açık adres") }}<textarea v-model="address" required minlength="10" maxlength="500"/></label>
            <div class="form-grid"><label>{{ i18nT("Enlem") }}<input type="number" step="any" min="-90" max="90" :value="lat" @input="lat=($event.target as HTMLInputElement).value"/></label><label>{{ i18nT("Boylam") }}<input type="number" step="any" min="-180" max="180" :value="lng" @input="lng=($event.target as HTMLInputElement).value"/></label></div>
            <button type="button" class="text-link" @click="clearPoint">{{ i18nT("Konum noktasını kaldır") }}</button>
            <LocationMap v-if="lat!=='' && lng!=='' && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))" :latitude="Number(lat)" :longitude="Number(lng)" :onMove="moveTo"/>
          </template>
          <fieldset v-else-if="k==='categories'"><legend>{{ i18nT("Hizmet kategorileri") }}</legend><label v-for="c in categories" :key="c.id" class="row"><input type="checkbox" :checked="selected.includes(c.id)" @change="toggleCategory(c.id,$event)"/>{{ i18nT(c.name) }}</label></fieldset>
          <label v-else>{{ i18nT(labels[k]) }}<select v-if="k==='city'" v-model="value"><option v-for="c in cities" :key="c" :value="c">{{ c }}</option></select><input v-else-if="k==='contactEmail'" v-model="value" v-focus-on-mount type="email" autocomplete="email" autocapitalize="none" maxlength="254"/><textarea v-else v-model="value" v-focus-on-mount :maxlength="k==='brands'?8000:k==='services'?6000:2000"/></label>
          <p v-if="k==='services' || k==='brands'" class="small muted">{{ i18nT("Birden fazla değeri virgülle ayır.") }}</p>
          <div class="row"><button class="button primary compact">{{ i18nT("Taslağa kaydet") }}</button><button type="button" class="button secondary compact" @click="cancel">{{ i18nT("Vazgeç") }}</button></div>
        </form>
        <template v-else>
          <div class="profile-detail-value">{{ display(k) }}<template v-if="k==='address' && profile.location"><LocationMap :latitude="profile.location.latitude" :longitude="profile.location.longitude"/><a class="text-link" target="_blank" rel="noopener noreferrer" :href="mapsUrl()">{{ i18nT("Google Maps’te aç") }}</a></template></div>
          <button class="profile-edit-button" :aria-label="i18nT('{0} düzenle',{'0':i18nT(labels[k])})" :disabled="busy || editing!==null" @click="edit(k)"><Pencil :size="18"/></button>
        </template>
      </div>
    </div>
    <p v-if="error" role="alert" class="error">{{ i18nT(error) }}</p>
    <p v-if="message" role="status" class="notice">{{ i18nT(message) }}</p>
    <button class="button primary" :disabled="!dirty || busy || editing!==null" @click="submit">{{ busy ? i18nT("Gönderiliyor…") : i18nT(catalogue ? "Taslağı kaydet" : "İncelemeye gönder") }}</button>
    <p class="small muted">{{ i18nT("Gönderilmemiş taslak bu ekrandan ayrılınca silinir. İnceleme sonucu yayın ve randevu yetkisi vermez.") }}</p>
  </section>
</template>
