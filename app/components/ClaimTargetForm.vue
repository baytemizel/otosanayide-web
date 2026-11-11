<script setup lang="ts">
import {ref} from 'vue';
import {categories, cities} from '@otosanayide/core';
import {claimTargetSchema} from '@otosanayide/core/claim-target';
import {useLocale} from '~/composables/useLocale';
import type {ClaimSeed, Target} from '~/lib/claim-target-editor-helpers';
import {vDefaultValue} from '~/lib/directives';

const props = defineProps<{claim: ClaimSeed; onLookup: (id: string) => Promise<Target>; onMap: (input: unknown) => Promise<void>}>();
const {t: i18nT} = useLocale();
const mode = ref<'existing' | 'new'>('existing');
const lookup = ref('');
const target = ref<Target | null>(null);
const busy = ref(false);
const error = ref('');
const identity = ref(false);
const duplicate = ref(false);
const reason = ref('');

async function find() {
  busy.value = true;
  error.value = '';
  target.value = null;
  try {
    const text = lookup.value.trim(),
      id = text.includes('://') ? new URL(text).pathname.match(/^\/servis\/([a-zA-Z0-9_-]{1,120})\/?$/)?.[1] : text;
    if (!id || !/^[a-zA-Z0-9_-]{1,120}$/.test(id)) throw Error('Geçerli servis bağlantısı veya kayıt kimliği gir.');
    target.value = await props.onLookup(id);
  } catch (e) {
    error.value = (e as Error).message;
  } finally {
    busy.value = false;
  }
}

async function submit(e: Event) {
  e.preventDefault();
  busy.value = true;
  error.value = '';
  try {
    const form = Object.fromEntries(new FormData(e.currentTarget as HTMLFormElement)),
      input = mode.value === 'existing' ? {mode: mode.value, claimId: props.claim.id, businessId: target.value?.id, identityChecked: identity.value, reason: reason.value} : {mode: mode.value, claimId: props.claim.id, identityChecked: identity.value, duplicateChecked: duplicate.value, reason: reason.value, profile: {name: form.name, city: form.city, district: form.district, address: form.address, phone: form.phone, website: '', hours: '', description: '', categories: [form.category], services: [], brands: [], location: null}};
    const parsed = claimTargetSchema.safeParse(input);
    if (!parsed.success) throw Error('İşletme adı, ilçe, adres, telefon, kategori, inceleme beyanları ve gerekçeyi kontrol et.');
    await props.onMap(parsed.data);
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    busy.value = false;
  }
}

function selectMode(next: 'existing' | 'new') {
  mode.value = next;
  identity.value = false;
  error.value = '';
}

function changeLookup(e: Event) {
  lookup.value = (e.target as HTMLInputElement).value;
  target.value = null;
  identity.value = false;
}
</script>

<template>
  <section class="ds-card ds-pad24 ds-col ds-g16">
    <h3>{{ i18nT('Başvuruyu doğru işletmeye bağla') }}</h3>
    <p class="ds-small ds-muted">{{ i18nT('Önce mevcut kaydı kontrol et. Yeni kayıt oluşturmak işletmeyi yayımlamaz ve sahiplik yetkisi vermez.') }}</p>
    <div class="ds-seg mode">
      <button type="button" :class="{on: mode==='existing'}" :aria-pressed="mode==='existing'" :disabled="busy" @click="selectMode('existing')">{{ i18nT('Mevcut işletme') }}</button>
      <button type="button" :class="{on: mode==='new'}" :aria-pressed="mode==='new'" :disabled="busy" @click="selectMode('new')">{{ i18nT('Yeni işletme kaydı') }}</button>
    </div>
    <div v-if="mode==='existing'" class="stack">
      <label>{{ i18nT('Servis bağlantısı veya kayıt kimliği') }}<input class="ds-field" :value="lookup" maxlength="500" :disabled="busy" @input="changeLookup"/></label>
      <div><button class="ds-btn s sm" :disabled="busy||!lookup.trim()" @click="find">{{ i18nT('Kaydı getir') }}</button></div>
      <div v-if="target" class="ds-note target">
        <strong>{{ target.name }}</strong>
        <p>{{ target.city }} / {{ target.district }} · {{ target.address }}</p>
        <p>{{ target.phone||i18nT('Telefon belirtilmemiş') }} · {{ target.published?i18nT('Yayında'):i18nT('Yayımlanmamış') }}</p>
        <p v-if="!target.eligible" role="alert" class="ds-red">{{ i18nT('Bu kayıt örnek veya sahipliği verilmiş olduğu için bağlanamaz.') }}</p>
      </div>
    </div>
    <form class="stack" @submit="submit">
      <template v-if="mode==='new'">
        <div class="form-grid">
          <label>{{ i18nT('Yeni işletme adı') }}<input v-default-value="claim.name" class="ds-field" name="name" required minlength="2" maxlength="160"/></label>
          <label>{{ i18nT('Yeni işletmenin ili') }}<select v-default-value="claim.city" class="ds-field" name="city"><option v-for="c in cities" :key="c" :value="c">{{ c }}</option></select></label>
          <label>{{ i18nT('Yeni işletmenin ilçesi') }}<input class="ds-field" name="district" required minlength="2" maxlength="100"/></label>
          <label>{{ i18nT('Yeni işletmenin telefonu') }}<input v-default-value="claim.phone" class="ds-field" name="phone" type="tel" required maxlength="30"/></label>
          <label class="span-all">{{ i18nT('Yeni işletmenin açık adresi') }}<textarea v-default-value="claim.address" class="ds-field" name="address" required minlength="10" maxlength="500"/></label>
          <label>{{ i18nT('İlk hizmet kategorisi') }}<select v-default-value="''" class="ds-field" name="category" required><option value="" disabled>{{ i18nT('Kategori seç') }}</option><option v-for="c in categories" :key="c.id" :value="c.id">{{ i18nT(c.name) }}</option></select></label>
        </div>
        <label class="evidence-attestation"><input v-model="duplicate" class="ds-check chk" type="checkbox"/>{{ i18nT('Mevcut kayıtları kontrol ettim; bu başvuru için yeni kayıt gerekiyor.') }}</label>
        <p class="ds-xs ds-muted">{{ i18nT('Yeni kayıt ayrıca mükerrer kontrolü ve yayın incelemesi bekler. İsim benzerliği tek başına aynı işletme kanıtı değildir.') }}</p>
      </template>
      <label class="evidence-attestation"><input v-model="identity" class="ds-check chk" type="checkbox"/>{{ i18nT('Başvurudaki işletme adı ve adresin seçilen kayıtla eşleşmesini kontrol ettim.') }}</label>
      <label>{{ i18nT('Eşleme gerekçesi') }}<textarea v-model="reason" class="ds-field" minlength="10" maxlength="1000" required/></label>
      <div v-if="error" role="alert" class="ds-note err">{{ i18nT(error) }}</div>
      <div><button class="ds-btn p" :disabled="busy||!identity||(mode==='existing'?!target?.eligible:!duplicate)">{{ busy?i18nT('Kaydediliyor…'):mode==='existing'?i18nT('İşletmeyi başvuruya bağla'):i18nT('Yayımlanmamış kayıt oluştur ve bağla') }}</button></div>
    </form>
  </section>
</template>

<style scoped>
p {margin: 0;}
h3 {margin: 0;}
.mode {align-self: flex-start;}
.target {flex-direction: column; gap: 4px;}
input.ds-check.chk {width: 20px; height: 20px; min-height: 0; padding: 0;}
@media (max-width: 480px) {
  .ds-btn {height: auto; min-height: 44px; padding-top: 8px; padding-bottom: 8px; white-space: normal;}
}
</style>
