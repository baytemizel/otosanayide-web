<script setup lang="ts">
import {ref} from 'vue';
import {useLinkToken} from '~/composables/useLinkToken';
import {useLocale} from '~/composables/useLocale';
import {browserSession} from '~/lib/session-instance';

const {t: i18nT} = useLocale();
const {token, missing} = useLinkToken();
const done = ref(false);
const busy = ref(false);
const error = ref('');

async function submit(e: Event) {
  e.preventDefault();
  const d = new FormData(e.currentTarget as HTMLFormElement);
  error.value = '';
  busy.value = true;
  try {
    await browserSession().resetPassword(token.value, String(d.get('password')));
    token.value = '';
    done.value = true;
  } catch {
    error.value = 'Şifre güncellenemedi. Bağlantıyı ve şifreni kontrol et.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div class="container page" id="content">
    <h1>{{ i18nT("Şifreni yenile") }}</h1>
    <p v-if="missing" class="error" role="alert">{{ i18nT("Bağlantı geçersiz veya süresi dolmuş.") }}</p>
    <p v-else-if="done" role="status">{{ i18nT("Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.") }}</p>
    <form v-else class="stack" @submit="submit">
      <label>{{ i18nT("Yeni şifre") }}<input name="password" type="password" minlength="10" autocomplete="new-password" required/></label>
      <p v-if="error" class="error" role="alert">{{ i18nT(error) }}</p>
      <button :disabled="busy || !token" class="button primary">{{ busy ? i18nT("İşleniyor…") : i18nT("Şifreyi güncelle") }}</button>
    </form>
    <NuxtLink v-if="missing || done" class="button primary" to="/giris">{{ i18nT("Girişe dön") }}</NuxtLink>
  </div>
</template>
