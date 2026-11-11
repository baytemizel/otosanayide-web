<script setup lang="ts">
import {computed, ref} from 'vue';
import {Building2, Check, Info, Pencil, X} from '@lucide/vue';
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
  <p v-if="!ready" class="ds-small ds-muted">{{ i18nT("Profil yükleniyor…") }}</p>
  <div v-else class="ds-col ds-g20 business-profile-details">
    <div class="ds-note info"><Info :size="16" class="ds-i"/><span>{{ i18nT("Bilgilerini kontrol et. Güncellemek istediğin alanın yanındaki kaleme dokun.") }}</span></div>
    <div v-if="!editable" class="ds-note warn">{{ i18nT("Düzenleme yetkisi için işletme hesabı gerekir. Demo hesabına giriş yaparak yerel taslağı deneyebilirsin.") }}</div>
    <div class="pf-grid">
      <section class="ds-card pf-card">
        <header class="pf-head">
          <div class="ds-row ds-g10 ds-f1">
            <Building2 :size="20" class="ds-i"/>
            <div class="ds-f1">
              <h3>{{ i18nT("Kayıtlı işletme bilgileri") }}</h3>
              <p class="ds-xs ds-muted">{{ draft.name || i18nT("İşletme bilgilerin") }}</p>
            </div>
          </div>
          <span v-if="editing" class="ds-badge info">{{ i18nT("1 alan düzenleniyor") }}</span>
        </header>
        <div v-for="f in fields" :key="f.name" :class="['pf-row', {editing: editing===f.name, dim: editing!==null && editing!==f.name}]">
          <form v-if="editing===f.name" class="ds-col ds-g8" @submit="save">
            <label class="ds-label" :for="`edit-${f.name}`">{{ i18nT(f.label) }}</label>
            <select v-if="f.type==='city' || f.type==='category'" :id="`edit-${f.name}`" v-model="value" v-focus-on-mount class="ds-field"><option value="">{{ i18nT("Seç") }}</option><option v-for="c in selectOptions(f)" :key="c.id" :value="c.id">{{ i18nT(c.name) }}</option></select>
            <textarea v-else-if="f.type==='textarea'" :id="`edit-${f.name}`" v-model="value" v-focus-on-mount class="ds-field" maxlength="2000"/>
            <input v-else :id="`edit-${f.name}`" v-focus-on-mount class="ds-field" :type="f.type" :required="f.required" maxlength="500" :value="value" @input="value=($event.target as HTMLInputElement).value"/>
            <div class="ds-row ds-g10 ds-wrap"><button class="ds-btn p sm" type="submit"><Check :size="16"/>{{ i18nT("Kaydet") }}</button><button class="ds-btn g sm" type="button" @click="cancel"><X :size="16"/>{{ i18nT("Vazgeç") }}</button></div>
            <div v-if="error" role="alert" class="ds-note err">{{ i18nT(error) }}</div>
          </form>
          <template v-else>
            <div class="pf-label">{{ i18nT(f.label) }}</div>
            <p :class="['pf-value', {'ds-muted': !shownFor(f)}]">{{ (f.name==='category' ? i18nT(shownFor(f) || '') : shownFor(f)) || i18nT("Henüz eklenmedi") }}</p>
            <button type="button" class="ds-iconbtn pf-pencil" :aria-label="i18nT('{0} düzenle',{'0':i18nT(f.label)})" :title="i18nT('{0} düzenle',{'0':i18nT(f.label)})" :disabled="!editable || editing!==null" @click="edit(f.name)"><Pencil :size="15"/></button>
          </template>
        </div>
        <div class="pf-foot">
          <div v-if="message" role="status" class="ds-note ok">{{ i18nT(message) }}</div>
          <div v-if="error && !editing" role="alert" class="ds-note err">{{ i18nT(error) }}</div>
          <p class="ds-xs ds-muted">{{ i18nT("Önizleme: bilgiler bu tarayıcıdaki taslaktır. Canlı profil yayınlama ve görsel yükleme henüz etkin değil.") }}</p>
        </div>
      </section>
      <aside class="ds-card ds-pad24 ds-col ds-g12 ds-passive" aria-disabled="true" :title="i18nT('Yakında')">
        <h3>{{ i18nT("Değişiklik geçmişi") }}</h3>
        <p class="ds-small ds-muted">{{ i18nT("Yakında") }}</p>
      </aside>
    </div>
  </div>
</template>

<style scoped>
p {margin: 0;}
h3 {margin: 0;}
.pf-grid {display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 20px; align-items: start;}
.pf-card {overflow: hidden;}
.pf-head {display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 20px;}
.pf-row {display: grid; grid-template-columns: 180px minmax(0, 1fr) 34px; align-items: center; gap: 16px; padding: 18px 20px; border-bottom: 1px solid #edf0f3;}
.pf-row.editing {display: block; background: #fffaf6;}
.pf-row.dim {opacity: .5;}
.pf-label {font-size: 13px; color: #586879;}
.pf-value {font-size: 15px; white-space: pre-wrap; overflow-wrap: anywhere;}
.pf-pencil {width: 34px; height: 34px;}
.pf-foot {display: flex; flex-direction: column; gap: 12px; padding: 20px;}
@media (max-width: 1100px) {
  .pf-grid {grid-template-columns: minmax(0, 1fr);}
}
@media (max-width: 760px) {
  .pf-row {grid-template-columns: minmax(0, 1fr) 34px; gap: 4px 12px;}
  .pf-label {grid-column: 1;}
  .pf-value {grid-column: 1;}
  .pf-pencil {grid-column: 2; grid-row: 1 / 3;}
}
</style>
