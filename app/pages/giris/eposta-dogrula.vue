<script setup lang="ts">
import {ref} from 'vue';
import {useLinkToken} from '~/composables/useLinkToken';
import {useLocale} from '~/composables/useLocale';
import {browserSession} from '~/lib/session-instance';

const {t: i18nT} = useLocale();
const status = ref<'working' | 'done' | 'failed'>('working');

const {missing} = useLinkToken(async token => {
  try {
    await browserSession().verifyEmail(token);
    status.value = 'done';
  } catch {
    status.value = 'failed';
  }
});
</script>

<template>
  <div class="container page" id="content">
    <h1>{{ i18nT("E-posta doğrulama") }}</h1>
    <p v-if="missing || status === 'failed'" class="error" role="alert">{{ i18nT("Bağlantı geçersiz veya süresi dolmuş.") }}</p>
    <p v-else-if="status === 'done'" role="status">{{ i18nT("E-posta adresin doğrulandı.") }}</p>
    <p v-else role="status">{{ i18nT("E-posta adresin doğrulanıyor…") }}</p>
    <NuxtLink v-if="missing || status !== 'working'" class="button primary" to="/giris">{{ i18nT("Girişe dön") }}</NuxtLink>
  </div>
</template>
