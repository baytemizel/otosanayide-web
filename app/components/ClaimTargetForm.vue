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
  <section class="panel">
    <h3>{{ i18nT('Başvuruyu doğru işletmeye bağla') }}</h3>
    <p>{{ i18nT('Önce mevcut kaydı kontrol et. Yeni kayıt oluşturmak işletmeyi yayımlamaz ve sahiplik yetkisi vermez.') }}</p>
    <div class="row" :style="{flexWrap:'wrap'}">
      <button type="button" :class="`button ${mode==='existing'?'primary':'secondary'} compact`" :disabled="busy" @click="selectMode('existing')">{{ i18nT('Mevcut işletme') }}</button>
      <button type="button" :class="`button ${mode==='new'?'primary':'secondary'} compact`" :disabled="busy" @click="selectMode('new')">{{ i18nT('Yeni işletme kaydı') }}</button>
    </div>
    <div v-if="mode==='existing'" class="stack">
      <label>{{ i18nT('Servis bağlantısı veya kayıt kimliği') }}<input :value="lookup" maxlength="500" :disabled="busy" @input="changeLookup"/></label>
      <button class="button secondary" :disabled="busy||!lookup.trim()" @click="find">{{ i18nT('Kaydı getir') }}</button>
      <div v-if="target" class="notice">
        <strong>{{ target.name }}</strong>
        <p>{{ target.city }} / {{ target.district }} · {{ target.address }}</p>
        <p>{{ target.phone||i18nT('Telefon belirtilmemiş') }} · {{ target.published?i18nT('Yayında'):i18nT('Yayımlanmamış') }}</p>
        <p v-if="!target.eligible" role="alert">{{ i18nT('Bu kayıt örnek veya sahipliği verilmiş olduğu için bağlanamaz.') }}</p>
      </div>
    </div>
    <form class="stack" @submit="submit">
      <template v-if="mode==='new'">
        <div class="form-grid">
          <label>{{ i18nT('Yeni işletme adı') }}<input v-default-value="claim.name" name="name" required minlength="2" maxlength="160"/></label>
          <label>{{ i18nT('Yeni işletmenin ili') }}<select v-default-value="claim.city" name="city"><option v-for="c in cities" :key="c" :value="c">{{ c }}</option></select></label>
          <label>{{ i18nT('Yeni işletmenin ilçesi') }}<input name="district" required minlength="2" maxlength="100"/></label>
          <label>{{ i18nT('Yeni işletmenin telefonu') }}<input v-default-value="claim.phone" name="phone" type="tel" required maxlength="30"/></label>
          <label class="span-all">{{ i18nT('Yeni işletmenin açık adresi') }}<textarea v-default-value="claim.address" name="address" required minlength="10" maxlength="500"/></label>
          <label>{{ i18nT('İlk hizmet kategorisi') }}<select v-default-value="''" name="category" required><option value="" disabled>{{ i18nT('Kategori seç') }}</option><option v-for="c in categories" :key="c.id" :value="c.id">{{ i18nT(c.name) }}</option></select></label>
        </div>
        <label class="evidence-attestation"><input v-model="duplicate" type="checkbox"/>{{ i18nT('Mevcut kayıtları kontrol ettim; bu başvuru için yeni kayıt gerekiyor.') }}</label>
        <p class="small muted">{{ i18nT('Yeni kayıt ayrıca mükerrer kontrolü ve yayın incelemesi bekler. İsim benzerliği tek başına aynı işletme kanıtı değildir.') }}</p>
      </template>
      <label class="evidence-attestation"><input v-model="identity" type="checkbox"/>{{ i18nT('Başvurudaki işletme adı ve adresin seçilen kayıtla eşleşmesini kontrol ettim.') }}</label>
      <label>{{ i18nT('Eşleme gerekçesi') }}<textarea v-model="reason" minlength="10" maxlength="1000" required/></label>
      <p v-if="error" role="alert" class="error">{{ i18nT(error) }}</p>
      <button class="button primary" :disabled="busy||!identity||(mode==='existing'?!target?.eligible:!duplicate)">{{ busy?i18nT('Kaydediliyor…'):mode==='existing'?i18nT('İşletmeyi başvuruya bağla'):i18nT('Yayımlanmamış kayıt oluştur ve bağla') }}</button>
    </form>
  </section>
</template>
