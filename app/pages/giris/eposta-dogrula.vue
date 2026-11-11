<script setup lang="ts">
import {ref} from 'vue';
import {useLinkToken} from '~/composables/useLinkToken';
import {useLocale} from '~/composables/useLocale';
import {browserSession} from '~/lib/session-instance';

const {t: i18nT} = useLocale();
const status = ref<'working' | 'done' | 'failed'>('working');
/** An e-mail change (web-03) revokes every session when confirmed: the member signs in again. */
const signedOut = ref(false);

const {missing} = useLinkToken(async token => {
  try {
    const session = browserSession();
    await session.start();
    const before = session.currentUser();
    await session.verifyEmail(token);
    status.value = 'done';
    // A session in this browser still says "unverified" until its identity is reloaded.
    try {
      await session.reloadIdentity();
    } catch {
      /* The next refresh picks it up. */
    }
    signedOut.value = !!before && !session.currentUser();
  } catch {
    status.value = 'failed';
  }
});
</script>

<template>
  <div id="content" class="auth-center">
    <div class="ds-card auth-card ds-col ds-g16">
      <h1 class="ds-serif">{{ i18nT("E-posta doğrulama") }}</h1>
      <p v-if="missing || status === 'failed'" class="ds-note err" role="alert">{{ i18nT("Bağlantı geçersiz veya süresi dolmuş.") }}</p>
      <p v-else-if="status === 'done'" class="ds-note ok" role="status">{{ i18nT("E-posta adresin doğrulandı.") }}</p>
      <p v-if="signedOut" class="ds-small ds-muted">{{ i18nT("Güvenlik için bütün oturumların kapatıldı. Yeni e-posta adresinle yeniden giriş yap.") }}</p>
      <p v-else class="ds-small ds-muted" role="status">{{ i18nT("E-posta adresin doğrulanıyor…") }}</p>
      <NuxtLink v-if="missing || status !== 'working'" class="ds-btn p lg" to="/giris">{{ i18nT("Girişe dön") }}</NuxtLink>
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
