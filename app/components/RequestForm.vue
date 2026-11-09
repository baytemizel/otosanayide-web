<script setup lang="ts">
import {ref} from 'vue';
import {requestSchema, type Business} from '@otosanayide/core';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';

const props = defineProps<{business: Business; kind: 'quotes' | 'appointments'}>();

const {t: i18nT} = useLocale();
const app = useApp();
let requestKey = '';
const busy = ref(false);
const error = ref('');
const sent = ref(false);

async function submit(e: Event) {
  e.preventDefault();
  error.value = '';
  busy.value = true;
  try {
    const user = app.user;
    if (app.demo || !user) throw Error('Talep göndermek için doğrulanmış canlı hesap gerekli.');
    if (!requestKey) requestKey = crypto.randomUUID();
    const f = Object.fromEntries(new FormData(e.currentTarget as HTMLFormElement));
    const value = requestSchema.parse({...f, businessId: props.business.id, kind: props.kind, ...(!f.preferredDate ? {preferredDate: undefined} : {})});
    const r = await apiFetch('/api/requests', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}`}, body: JSON.stringify({...value, requestKey})});
    const result = await r.json();
    if (!r.ok) throw Error(result.error ?? 'Talep gönderilemedi.');
    sent.value = true;
  } catch (e) {
    error.value = e instanceof Error ? (e.message.startsWith('[') ? 'Alanları kontrol et; açıklama en az 10 karakter olmalı.' : e.message) : 'Talep gönderilemedi.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="container page">
    <h1>{{ kind==='quotes'?i18nT('Teklif iste'):i18nT('Randevu iste') }}</h1>
    <p>{{ business.name }} · {{ business.city }}</p>
    <p v-if="!app.ready">{{ i18nT('Hesabın yükleniyor…') }}</p>
    <NuxtLink v-else-if="!app.member" class="button primary" to="/giris">{{ i18nT('Ücretsiz hesabına giriş yap') }}</NuxtLink>
    <div v-else-if="sent" class="panel" role="status">
      <h2>{{ i18nT('Talebin iletildi.') }}</h2>
      <NuxtLink class="text-link" to="/taleplerim">{{ i18nT('Teklif ve randevular') }}</NuxtLink>
      <p>{{ i18nT('İşletmenin yanıtı bekleniyor. Bu işlem onaylanmış randevu veya fiyat taahhüdü oluşturmaz.') }}</p>
    </div>
    <form v-else class="panel stack" @submit="submit">
      <label>{{ i18nT('İstediğin hizmet') }}<input name="service" required minlength="2" maxlength="120"/></label>
      <label>{{ i18nT('Aracın') }}<input name="vehicle" required minlength="2" maxlength="120" :placeholder="i18nT('Marka, model ve yıl')"/></label>
      <label v-if="kind==='appointments'">{{ i18nT('Tercih ettiğin tarih') }}<input name="preferredDate" type="date" required/></label>
      <label>{{ i18nT('Açıklama') }}<textarea name="message" minlength="10" maxlength="2000" required :placeholder="i18nT('İhtiyacını anlat. Plaka veya özel bilgi eklemene gerek yok.')"/></label>
      <p class="small muted">{{ i18nT('İşletmenin kabulü olmadan randevu kesinleşmez. Bu adımda ödeme alınmaz.') }}</p>
      <p v-if="error" class="error" role="alert">{{ i18nT(error) }}</p>
      <button :disabled="busy" class="button primary">{{ busy?i18nT('Gönderiliyor…'):i18nT('Talebi gönder') }}</button>
    </form>
  </div>
</template>
