<script setup lang="ts">
import {ref} from 'vue';
import type {z} from 'zod';
import {fetchPushDevices, type pushDevice} from '@otosanayide/core/push-notifications';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch, apiOrigin} from '~/lib/api';
import {publicEnv} from '~/lib/env';
import {browserPushConsent, disableBrowserPush, discardBrowserPush, enableBrowserPush} from '~/lib/push-browser';

const app = useApp();
const {t, locale} = useLocale();
const devices = ref<z.infer<typeof pushDevice>[]>([]);
const busy = ref(false);
const error = ref('');
let active = true;
let lock = false;

useClientEffect(() => [], () => {
  active = true;
  return () => {
    active = false;
  };
});

async function run(action: 'load' | 'register' | 'revoke', device?: z.infer<typeof pushDevice>) {
  const user = app.user;
  if (!user || lock) return;
  lock = true;
  busy.value = true;
  error.value = '';
  const check = app.accountGuard(user.uid), guard = () => {
    check();
    if (!active) throw Error('session_changed');
  };
  try {
    const options = {origin: apiOrigin(), request: apiFetch, locale: locale.value, token: () => user.getIdToken(), guard};
    let result;
    if (action === 'register') {
      const pending = await enableBrowserPush(user.uid);
      try {
        guard();
        result = await fetchPushDevices(options, {action: 'register', deviceId: pending.consent.deviceId, token: pending.token, provider: 'fcm', platform: 'web', locale: locale.value, appId: publicEnv().firebaseAppId});
        guard();
        pending.commit();
      } catch (failure) {
        await discardBrowserPush().catch(() => {});
        throw failure;
      }
    } else if (action === 'revoke' && device) {
      const local = browserPushConsent();
      if (local?.deviceId === device.deviceId) await disableBrowserPush();
      result = await fetchPushDevices(options, {action: 'revoke', deviceId: device.deviceId, expectedVersion: device.version, expectedGeneration: device.generation});
    } else result = await fetchPushDevices(options);
    guard();
    devices.value = result.devices;
  } catch {
    if (active) error.value = 'Bildirim ayarları güncellenemedi. İzinlerini kontrol edip yeniden dene.';
  } finally {
    lock = false;
    if (active) busy.value = false;
  }
}
</script>

<template>
  <section v-if="!(app.demo||!app.user?.emailVerified||!publicEnv().pushEnabled)" class="ds-card ds-pad24 ds-col ds-g12">
    <h2>{{ t('Cihaz bildirimleri') }}</h2>
    <p class="ds-small ds-muted">{{ t('Bu tarayıcı için izin ver. Bildirimlerde araç veya özel bakım bilgilerin gösterilmez. İstediğin cihazı hesabından kaldırabilirsin.') }}</p>
    <div class="ds-row ds-g10 ds-wrap"><button type="button" class="ds-btn p" :disabled="busy" @click="void run('register')">{{ t('Bu tarayıcıda etkinleştir') }}</button><button type="button" class="ds-btn s" :disabled="busy" @click="void run('load')">{{ t('Kayıtlı cihazları göster') }}</button></div>
    <p v-if="error" class="ds-note err" role="alert">{{ t(error) }}</p>
    <div v-for="device in devices" :key="device.deviceId" class="device ds-row ds-sb ds-g12 ds-wrap"><p class="ds-small">{{ device.platform }} · {{ t(device.enabled?'Etkin':'Kapalı') }} · {{ new Date(device.updatedAtMs).toLocaleDateString(locale==='en'?'en-GB':'tr-TR') }}</p><button v-if="device.enabled" type="button" class="ds-btn d sm" :disabled="busy" @click="void run('revoke',device)">{{ t('Bu cihazı kaldır') }}</button></div>
  </section>
</template>

<style scoped>
h2 {margin: 0; font: 700 19px/24.7px Arimo, Arial, sans-serif; letter-spacing: 0;}
p {margin: 0;}
.device {padding: 12px 14px; border: 1px solid #dfe5eb; border-radius: 10px;}
</style>
