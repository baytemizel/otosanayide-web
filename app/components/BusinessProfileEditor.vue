<script setup lang="ts">
import {computed, ref} from 'vue';
import {Building2, Check, Pencil, X} from '@lucide/vue';
import {categories, cities} from '@otosanayide/core';
import {readBusinessDraft, saveBusinessField} from '@otosanayide/core/business-draft';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';

type FieldDefinition = {name: string; label: string; type: string; required?: boolean};

const fields: FieldDefinition[] = [{name: 'name', label: 'İşletme adı', type: 'text', required: true}, {name: 'phone', label: 'Telefon', type: 'tel'}, {name: 'website', label: 'Web sitesi', type: 'url'}, {name: 'city', label: 'İl', type: 'city'}, {name: 'district', label: 'İlçe', type: 'text'}, {name: 'address', label: 'Açık adres', type: 'textarea'}, {name: 'hours', label: 'Çalışma saatleri', type: 'text'}, {name: 'category', label: 'Ana hizmet kategorisi', type: 'category'}, {name: 'services', label: 'Hizmetler', type: 'textarea'}, {name: 'brands', label: 'Marka uzmanlığı', type: 'text'}, {name: 'description', label: 'İşletme açıklaması', type: 'textarea'}];

// React's autoFocus focuses imperatively on mount; the autofocus attribute is ignored for elements added after load.
const vFocusOnMount = {mounted: (el: HTMLElement) => el.focus()};

const {t: i18nT} = useLocale();
const app = useApp();
const draft = ref<Record<string, string>>({});
const ready = ref(false);
const editing = ref<string | null>(null);
const value = ref('');
const message = ref('');
const error = ref('');
const editable = computed(() => app.demo && app.member);

useClientEffect(() => [app.demo], () => {
  function refresh() {
    if (app.demo)
      try {
        const parsed = readBusinessDraft(localStorage);
        draft.value = Object.fromEntries(fields.filter(f => typeof parsed[f.name] === 'string').map(f => [f.name, parsed[f.name] as string]));
      } catch {
        error.value = 'Kayıtlı profil okunamadı.';
      }
    ready.value = true;
  }
  refresh();
  window.addEventListener('business-draft-changed', refresh);
  window.addEventListener('storage', refresh);
  return () => {
    window.removeEventListener('business-draft-changed', refresh);
    window.removeEventListener('storage', refresh);
  };
});

function edit(name: string) {
  if (name === 'address') {
    window.dispatchEvent(new Event('edit-business-location'));
    document.getElementById('business-location')?.scrollIntoView({behavior: 'smooth'});
    return;
  }
  editing.value = name;
  value.value = draft.value[name] ?? '';
  error.value = '';
  message.value = '';
}
function cancel() {
  editing.value = null;
  value.value = '';
  error.value = '';
}
function save(e: Event) {
  e.preventDefault();
  const current = editing.value;
  if (!editable.value || !current) return;
  const field = fields.find(f => f.name === current)!;
  const trimmed = value.value.trim();
  if (field.required && trimmed.length < 2) {
    error.value = 'İşletme adı en az iki karakter olmalı.';
    return;
  }
  if (field.type === 'url' && trimmed) {
    try {
      if (!['https:', 'http:'].includes(new URL(trimmed).protocol)) throw Error();
    } catch {
      error.value = 'Web adresi https:// veya http:// ile başlamalı.';
      return;
    }
  }
  const next = {...draft.value, [current]: trimmed};
  try {
    saveBusinessField(localStorage, current, trimmed);
    draft.value = next;
    editing.value = null;
    error.value = '';
    message.value = i18nT('{0} kaydedildi. Önizlemedeki değişiklik yalnızca bu tarayıcıda saklanır.', {'0': i18nT(field.label)});
  } catch {
    error.value = 'Değişiklik kaydedilemedi. Bilgilerini kaybetmeden yeniden deneyebilirsin.';
  }
}
function shownFor(f: FieldDefinition) {
  return f.name === 'category' ? (categories.find(c => c.id === draft.value[f.name])?.name ?? draft.value[f.name]) : draft.value[f.name];
}
function selectOptions(f: FieldDefinition) {
  return f.type === 'city' ? cities.map(c => ({id: c, name: c})) : categories;
}
</script>

<template>
  <p v-if="!ready">{{ i18nT("Profil yükleniyor…") }}</p>
  <section v-else class="panel business-profile-details">
    <div class="profile-summary"><span class="profile-summary-icon"><Building2 :size="28"/></span><div><h2>{{ draft.name || i18nT("İşletme bilgilerin") }}</h2><p class="muted">{{ i18nT("Bilgilerini kontrol et. Güncellemek istediğin alanın yanındaki kaleme dokun.") }}</p></div></div>
    <p v-if="!editable" class="notice">{{ i18nT("Düzenleme yetkisi için işletme hesabı gerekir. Demo hesabına giriş yaparak yerel taslağı deneyebilirsin.") }}</p>
    <div class="profile-detail-list">
      <div v-for="f in fields" :key="f.name" :class="`profile-detail-row ${editing===f.name?'editing':''}`">
        <div class="profile-detail-label">{{ i18nT(f.label) }}</div>
        <form v-if="editing===f.name" class="profile-inline-form" @submit="save">
          <label class="sr-only" :for="`edit-${f.name}`">{{ i18nT(f.label) }}</label>
          <select v-if="f.type==='city' || f.type==='category'" :id="`edit-${f.name}`" v-model="value" v-focus-on-mount><option value="">{{ i18nT("Seç") }}</option><option v-for="c in selectOptions(f)" :key="c.id" :value="c.id">{{ i18nT(c.name) }}</option></select>
          <textarea v-else-if="f.type==='textarea'" :id="`edit-${f.name}`" v-model="value" v-focus-on-mount maxlength="2000"/>
          <input v-else :id="`edit-${f.name}`" v-focus-on-mount :type="f.type" :required="f.required" maxlength="500" :value="value" @input="value=($event.target as HTMLInputElement).value"/>
          <div class="row"><button class="button primary compact" type="submit"><Check :size="16"/>{{ i18nT("Kaydet") }}</button><button class="button secondary compact" type="button" @click="cancel"><X :size="16"/>{{ i18nT("Vazgeç") }}</button></div>
          <p v-if="error" role="alert" class="error">{{ i18nT(error) }}</p>
        </form>
        <template v-else>
          <p :class="`profile-detail-value ${shownFor(f)?'':'muted'}`">{{ (f.name==='category' ? i18nT(shownFor(f) || '') : shownFor(f)) || i18nT("Henüz eklenmedi") }}</p>
          <button type="button" class="profile-edit-button" :aria-label="i18nT('{0} düzenle',{'0':i18nT(f.label)})" :title="i18nT('{0} düzenle',{'0':i18nT(f.label)})" :disabled="!editable || editing!==null" @click="edit(f.name)"><Pencil :size="18"/></button>
        </template>
      </div>
    </div>
    <p v-if="message" role="status" class="notice">{{ i18nT(message) }}</p>
    <p v-if="error && !editing" role="alert" class="error">{{ i18nT(error) }}</p>
    <p class="small muted">{{ i18nT("Önizleme: bilgiler bu tarayıcıdaki taslaktır. Canlı profil yayınlama ve görsel yükleme henüz etkin değil.") }}</p>
  </section>
</template>
