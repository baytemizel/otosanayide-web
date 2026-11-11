<script setup lang="ts">
import {ref} from 'vue';
import AuthPasswordField from '~/components/AuthPasswordField.vue';
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
  <div id="content" class="auth-center">
    <div class="ds-card auth-card ds-col ds-g16">
      <h1 class="ds-serif">{{ i18nT("Şifreni yenile") }}</h1>
      <p v-if="missing" class="ds-note err" role="alert">{{ i18nT("Bağlantı geçersiz veya süresi dolmuş.") }}</p>
      <p v-else-if="done" class="ds-note ok" role="status">{{ i18nT("Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.") }}</p>
      <form v-else class="ds-col ds-g16" @submit="submit">
        <div>
          <label class="ds-label field-label" for="new-password">{{ i18nT("Yeni şifre") }}</label>
          <AuthPasswordField id="new-password" autocomplete="new-password" :invalid="!!error"/>
        </div>
        <p v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</p>
        <button :disabled="busy || !token" class="ds-btn p lg">{{ busy ? i18nT("İşleniyor…") : i18nT("Şifreyi güncelle") }}</button>
      </form>
      <NuxtLink v-if="missing || done" class="ds-btn p lg" to="/giris">{{ i18nT("Girişe dön") }}</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.auth-center {display: flex; justify-content: center; padding: 72px 16px 96px; background: linear-gradient(#f4f6f8, #fff); min-height: 65vh;}
.auth-card {width: 100%; max-width: 460px; align-self: flex-start; padding: 32px; box-shadow: 0 16px 20px rgba(16, 36, 58, .08);}
h1 {margin: 0; font-size: 24px; line-height: 31.2px;}
p {margin: 0;}
.field-label {display: block;}
.ds-btn {width: 100%;}
@media (max-width: 480px) {
  .auth-center {padding: 32px 16px 56px;}
  .auth-card {padding: 20px;}
}
</style>
