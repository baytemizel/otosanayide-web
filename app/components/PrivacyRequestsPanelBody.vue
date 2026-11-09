<script setup lang="ts">
import {ref} from 'vue';
import {accountJson, AccountRequestError} from '@otosanayide/core/account-client';
import {privacyOwnerAction, privacyOwnerResponse, privacyLabels, privacyScopeLabels, privacyReasonLabels, type PrivacyOwnRequest} from '@otosanayide/core/privacy-requests';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';

const app = useApp();
const {t, locale} = useLocale();
const request = ref<PrivacyOwnRequest | null>(null);
const loaded = ref(false);
const scope = ref<'garage' | 'account'>('garage');
const pending = ref<ReturnType<typeof privacyOwnerAction.parse> | null>(null);
const ack = ref(false);
const busy = ref(false);
const notice = ref('');
let mounted = true;
let lock = false;
const scopes = ['garage', 'account'] as const;

useClientEffect(() => [], () => {
  mounted = true;
  return () => {
    mounted = false;
  };
});

async function perform(write: boolean) {
  if (lock) return;
  lock = true;
  busy.value = true;
  notice.value = '';
  try {
    if (app.demo) {
      notice.value = 'Önizlemede silme talebi gönderilmez. Gerçek hesap ve bağlantı gerekir.';
      return;
    }
    const user = app.user;
    if (!user?.emailVerified) throw Error('unverified');
    const check = app.accountGuard(user.uid);
    let token = '';
    if (write && !pending.value) throw Error('missing_action');
    const body = pending.value;
    const result = await accountJson({
      guard: () => {
        check();
        if (!mounted) throw Error('unmounted');
      },
      token: async () => {
        token = await user.getIdToken();
        return token;
      },
      request: signal => apiFetch('/api/me/privacy', {method: write ? 'POST' : 'GET', redirect: 'error', signal, headers: {Authorization: `Bearer ${token}`, 'Accept-Language': locale.value, ...(write ? {'Content-Type': 'application/json'} : {})}, ...(write ? {body: JSON.stringify(body)} : {})}),
      decode: raw => privacyOwnerResponse.parse(raw),
    });
    result.check();
    request.value = result.value.request;
    loaded.value = true;
    pending.value = null;
    ack.value = false;
    if (write) notice.value = 'Talep durumu güncellendi. Verilerin henüz silinmedi.';
  } catch (error) {
    if (mounted) {
      loaded.value = false;
      pending.value = null;
      ack.value = false;
      notice.value = error instanceof AccountRequestError && error.status === 428 ? 'Güvenlik için çıkış yapıp tekrar giriş yap. Sonra talebini yeniden kontrol et.' : error instanceof AccountRequestError && error.status === 503 ? 'Veri talepleri henüz kullanıma açılmadı.' : 'Talep durumu değişti. Yeniden kontrol et.';
    }
  } finally {
    lock = false;
    if (mounted) busy.value = false;
  }
}

function prepare(action: 'submit' | 'cancel' | 'confirm') {
  ack.value = false;
  notice.value = '';
  pending.value = privacyOwnerAction.parse(action === 'submit' ? {action, scope: scope.value, operationId: crypto.randomUUID(), acknowledged: true, confirmedScope: true} : {action, requestId: request.value!.id, expectedVersion: request.value!.version, operationId: crypto.randomUUID(), ...(action === 'confirm' ? {acknowledged: true, confirmedScope: true} : {})});
}
</script>

<template>
  <section class="panel stack" :aria-label="t('Veri ve hesap silme talepleri')">
    <h2>{{ t('Veri ve hesap silme talepleri') }}</h2>
    <p class="muted">{{ t('Buradan silme talebi oluşturabilir, durumunu takip edebilir ve iptal edebilirsin. Talep vermek verileri hemen silmez. Kalıcı silme işlemi henüz kullanıma açık değil.') }}</p>
    <button class="button secondary" :disabled="busy" @click="void perform(false)">{{ t('Talep durumunu kontrol et') }}</button>
    <div v-if="loaded&&request" class="panel stack">
      <h3>{{ t(privacyLabels[request.status]) }}</h3>
      <p>{{ t(privacyScopeLabels[request.scope]) }}</p>
      <p class="small muted">{{ new Date(request.updatedAtMs).toLocaleString(locale==='en'?'en-GB':'tr-TR') }} · {{ t('Sürüm') }} {{ request.version }}</p>
      <p v-if="request.reason">{{ t(privacyReasonLabels[request.reason]) }}</p>
      <template v-if="request.status!=='cancelled'&&!pending">
        <button v-if="request.status==='needs_confirmation'" class="button secondary" :disabled="busy" @click="prepare('confirm')">{{ t('Kapsamı tekrar onayla') }}</button>
        <button class="button secondary" :disabled="busy" @click="prepare('cancel')">{{ t('Silme talebini iptal et') }}</button>
      </template>
    </div>
    <template v-if="loaded&&(!request||request.status==='cancelled')&&!pending">
      <fieldset :disabled="busy">
        <legend>{{ t('İncelenecek kapsamı seç') }}</legend>
        <label v-for="value in scopes" :key="value" class="check"><input v-model="scope" type="radio" name="privacy-scope" :value="value"/>{{ t(privacyScopeLabels[value]) }}</label>
      </fieldset>
      <button class="button secondary" :disabled="busy" @click="prepare('submit')">{{ t('Silme talebini hazırla') }}</button>
    </template>
    <div v-if="pending" class="panel stack">
      <h3>{{ t(pending.action==='cancel'?'Talebi iptal etme onayı':'Silme talebi onayı') }}</h3>
      <p>{{ t(privacyScopeLabels[pending.action==='submit'?pending.scope:request!.scope]) }}</p>
      <p>{{ t('Cihazdaki garaj ve fotoğraflar bu taleple silinmez. İşletme yetkileri, yorumlar ve reklam/ödeme kayıtları kapsamına göre ayrıca incelenir. Şu anda otomatik kalıcı silme yapılmaz.') }}</p>
      <p>{{ app.user?.email }}</p>
      <label class="check"><input v-model="ack" type="checkbox" :disabled="busy"/>{{ t('Kapsamı ve henüz kalıcı silme yapılmadığını anladım.') }}</label>
      <button class="button primary" :disabled="busy||!ack" @click="void perform(true)">{{ t(pending.action==='cancel'?'Onayla ve talebi iptal et':'Onayla ve talebi gönder') }}</button>
      <button class="button secondary" :disabled="busy" @click="pending=null;ack=false">{{ t('Vazgeç') }}</button>
    </div>
    <p v-if="!!notice" role="status">{{ t(notice) }}</p>
  </section>
</template>
