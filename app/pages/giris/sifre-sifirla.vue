<script setup lang="ts">
import {computed, onBeforeUnmount, reactive, ref} from 'vue';
import {ArrowRight, Check, KeyRound, Lock, Mail} from '@lucide/vue';
import AuthField from '~/components/v2/garage/AuthField.vue';
import AuthShell from '~/components/v2/garage/AuthShell.vue';
import {useLocale} from '~/composables/useLocale';
import {useLinkToken} from '~/composables/v2/useLinkToken';
import {demoMode} from '~/lib/env';
import {authErrorMessage, EMAIL_PATTERN, PASSWORD_MIN, RESET_CODE, RESET_CODE_RESEND_SECONDS} from '~/lib/v2/auth';
import {browserSession} from '~/lib/session-instance';

// Password reset in the W10 card style (no web Figma frame of its own; the code steps follow mobile A20–A25).
// Live, two ways in:
// - an e-mailed link (?token=, taken out of the address bar): POST /api/auth/password/reset sets the new password;
// - "Şifremi unuttum" (no token): POST /api/auth/password/forgot {method:"code"} mails a 6-digit code (answer:
//   the masked address), POST /api/auth/password/verify-code turns it into a reset token kept in memory only,
//   then the same /password/reset. The password rule is the API's (at least 10 characters).
// A link without a token now starts the code flow instead of a dead end.
// Demo: a valid new password shows the success state; nothing is sent.
const {t} = useLocale();
useSeoMeta({title: () => t('Şifreni yenile')});
const live = !demoMode();
const min = live ? PASSWORD_MIN : 8;
const form = reactive({password: '', repeat: '', email: '', code: ''});
const errors = reactive({password: '', repeat: '', email: '', code: ''});
const done = ref(false);
const busy = ref(false);
const formError = ref('');
const link = live ? useLinkToken() : null;

/* ------------------------------------------------------------ live code flow */
/** The address typed on the sign-in form, handed over in memory (never in the URL). */
const handed = useState('v2-reset-email', () => '');
form.email = handed.value;
const step = ref<'email' | 'code' | 'password'>('email');
const maskedEmail = ref('');
/** Reset token from verify-code; memory only, 15 minutes at the API. */
const resetToken = ref('');
const notice = ref('');
const resendIn = ref(0);
let timer: ReturnType<typeof setInterval> | undefined;
onBeforeUnmount(() => clearInterval(timer));

/** live: 'pending' until the address bar was read, then the link or the code flow. */
const mode = computed(() => (!link ? 'demo' : link.token.value ? 'link' : link.missing.value ? 'code' : 'pending'));
const showPasswordForm = computed(() => mode.value === 'demo' || mode.value === 'link' || (mode.value === 'code' && step.value === 'password'));

function startCooldown() {
  clearInterval(timer);
  resendIn.value = RESET_CODE_RESEND_SECONDS;
  timer = setInterval(() => {
    resendIn.value = Math.max(0, resendIn.value - 1);
    if (!resendIn.value) clearInterval(timer);
  }, 1000);
}

async function sendCode(again = false) {
  if (busy.value || (again && resendIn.value)) return;
  const email = form.email.trim();
  errors.email = !email ? t('E-posta adresini yaz.') : EMAIL_PATTERN.test(email) ? '' : t('Geçerli bir e-posta adresi yaz (ör. deniz@ornek.com).');
  if (errors.email) return;
  busy.value = true;
  formError.value = '';
  notice.value = '';
  try {
    const answer = await browserSession().forgotPassword(email, 'code');
    maskedEmail.value = answer.maskedEmail ?? '';
    handed.value = email;
    step.value = 'code';
    form.code = '';
    errors.code = '';
    if (again) notice.value = t('Yeni kod gönderildi. Önceki kod artık geçersiz.');
    startCooldown();
  } catch (error) {
    formError.value = authErrorMessage('forgot', error, t);
  } finally {
    busy.value = false;
  }
}

async function verifyCode() {
  if (busy.value) return;
  const code = form.code.replace(/\s/g, '');
  errors.code = RESET_CODE.test(code) ? '' : t('E-postadaki 6 haneli kodu yaz.');
  if (errors.code) return;
  busy.value = true;
  formError.value = '';
  notice.value = '';
  try {
    resetToken.value = await browserSession().verifyResetCode(form.email.trim(), code);
    form.code = '';
    step.value = 'password';
  } catch (error) {
    formError.value = authErrorMessage('code', error, t);
  } finally {
    busy.value = false;
  }
}

function otherAddress() {
  step.value = 'email';
  formError.value = '';
  notice.value = '';
  form.code = '';
}

/* ------------------------------------------------------------ new password (all modes) */
async function submit() {
  if (busy.value) return;
  errors.password = !form.password ? t('Yeni şifreni yaz.') : form.password.length < min ? t('Şifre en az {min} karakter olmalı.', {min}) : '';
  errors.repeat = !form.repeat ? t('Şifreni tekrar yaz.') : form.repeat !== form.password ? t('Şifreler aynı değil.') : '';
  if (errors.password || errors.repeat) return;
  if (!link) {
    done.value = true;
    return;
  }
  const byCode = mode.value === 'code';
  const token = byCode ? resetToken.value : link.token.value;
  if (!token) return;
  busy.value = true;
  formError.value = '';
  try {
    await browserSession().resetPassword(token, form.password);
    if (byCode) {
      resetToken.value = '';
      handed.value = '';
    } else {
      link.token.value = '';
    }
    form.password = '';
    form.repeat = '';
    done.value = true;
  } catch (error) {
    formError.value = authErrorMessage(byCode ? 'resetCode' : 'reset', error, t);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <AuthShell>
    <div v-if="done" class="state" role="status">
      <span class="badge" aria-hidden="true"><Check :size="26" :stroke-width="2.5"/></span>
      <p class="t-mono-md t-eyebrow">{{ t('Şifre yenileme') }}</p>
      <h1 class="t-h3">{{ t('Şifren güncellendi') }}</h1>
      <p class="t-body-md t-muted">{{ live ? t('Yeni şifrenle giriş yapabilirsin.') : t('Güvenlik için diğer cihazlardaki oturumların kapatıldı. Yeni şifrenle giriş yapabilirsin.') }}</p>
      <NuxtLink to="/giris" class="btn btn-primary btn-lg wide">{{ t('Giriş yap') }}<ArrowRight aria-hidden="true"/></NuxtLink>
    </div>

    <div v-else-if="mode === 'pending'" class="state" aria-busy="true">
      <p class="t-mono-md t-eyebrow">{{ t('Şifre yenileme') }}</p>
      <h1 class="t-h3">{{ t('Şifreni yenile') }}</h1>
    </div>

    <form v-else-if="mode === 'code' && step === 'email'" class="state" novalidate @submit.prevent="sendCode()">
      <p class="t-mono-md t-eyebrow">{{ t('Şifre yenileme') }}</p>
      <h1 class="t-h3">{{ t('Şifreni mi unuttun?') }}</h1>
      <p class="t-body-md t-muted">{{ t('Hesabının e-posta adresini yaz; şifreni yenilemen için 6 haneli bir doğrulama kodu gönderelim.') }}</p>
      <div class="fields">
        <AuthField id="reset-email" v-model="form.email" :label="t('E-posta adresi')" :icon="Mail" type="email" inputmode="email" :placeholder="t('deniz@ornek.com')" autocomplete="email" :error="errors.email"/>
      </div>
      <p v-if="formError" class="form-err t-body-sm" role="alert">{{ formError }}</p>
      <button type="submit" class="btn btn-primary btn-lg wide" :disabled="busy">{{ busy ? t('Gönderiliyor…') : t('Kod gönder') }}<ArrowRight aria-hidden="true"/></button>
      <NuxtLink to="/giris" class="back t-label-sm">{{ t('Girişe dön') }}</NuxtLink>
    </form>

    <form v-else-if="mode === 'code' && step === 'code'" class="state" novalidate @submit.prevent="verifyCode">
      <p class="t-mono-md t-eyebrow">{{ t('Şifre yenileme') }}</p>
      <h1 class="t-h3">{{ t('Kodu gir') }}</h1>
      <p v-if="maskedEmail" class="t-body-md t-muted">
        <template v-for="(part, i) in t('Bu adresle bir hesap varsa {email} 6 haneli bir kod gönderdik. Kod 10 dakika geçerlidir.').split(/(\{email\})/)" :key="i"><strong v-if="part === '{email}'">{{ maskedEmail }}</strong><template v-else>{{ part }}</template></template>
      </p>
      <p v-else class="t-body-md t-muted">{{ t('Bu adresle bir hesap varsa e-posta adresine 6 haneli bir kod gönderdik. Kod 10 dakika geçerlidir.') }}</p>
      <div class="fields">
        <AuthField id="reset-code" v-model="form.code" :label="t('Doğrulama kodu')" :icon="KeyRound" inputmode="numeric" placeholder="123456" autocomplete="one-time-code" :error="errors.code"/>
      </div>
      <p v-if="notice" class="form-ok t-body-sm" role="status">{{ notice }}</p>
      <p v-if="formError" class="form-err t-body-sm" role="alert">{{ formError }}</p>
      <button type="submit" class="btn btn-primary btn-lg wide" :disabled="busy">{{ busy ? t('Doğrulanıyor…') : t('Kodu doğrula') }}<ArrowRight aria-hidden="true"/></button>
      <div class="links">
        <button type="button" class="back t-label-sm" :disabled="busy || resendIn > 0" @click="sendCode(true)">{{ resendIn ? t('Kodu tekrar gönder ({seconds} sn)', {seconds: resendIn}) : t('Kodu tekrar gönder') }}</button>
        <button type="button" class="back t-label-sm" :disabled="busy" @click="otherAddress">{{ t('Farklı adres yaz') }}</button>
      </div>
    </form>

    <form v-else-if="showPasswordForm" class="state" novalidate @submit.prevent="submit">
      <p class="t-mono-md t-eyebrow">{{ t('Şifre yenileme') }}</p>
      <h1 class="t-h3">{{ t('Şifreni yenile') }}</h1>
      <p class="t-body-md t-muted">{{ t('Hesabın için yeni bir şifre belirle.') }}</p>
      <div class="fields">
        <AuthField id="reset-password" v-model="form.password" :label="t('Yeni şifre')" :icon="Lock" type="password" placeholder="••••••••••" autocomplete="new-password" :error="errors.password" :hint="live ? t('En az {min} karakter.', {min}) : t('En az 8 karakter; harf ve rakam karışık olsun.')"/>
        <AuthField id="reset-repeat" v-model="form.repeat" :label="t('Yeni şifre (tekrar)')" :icon="Lock" type="password" placeholder="••••••••••" autocomplete="new-password" :error="errors.repeat"/>
      </div>
      <p v-if="formError" class="form-err t-body-sm" role="alert">{{ formError }}</p>
      <button type="submit" class="btn btn-primary btn-lg wide" :disabled="busy">{{ busy ? t('Güncelleniyor…') : t('Şifreyi güncelle') }}<ArrowRight aria-hidden="true"/></button>
      <NuxtLink to="/giris" class="back t-label-sm">{{ t('Girişe dön') }}</NuxtLink>
    </form>
  </AuthShell>
</template>

<style scoped>
.state{flex:1;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:16px}
.fields{align-self:stretch;display:flex;flex-direction:column;gap:20px;margin-top:8px}
.badge{width:64px;height:64px;border-radius:999px;display:grid;place-items:center;background:var(--lime-400);color:var(--ink-900);margin-bottom:8px}
.wide{width:100%;margin-top:8px}
.form-err{align-self:stretch;padding:10px 14px;border-radius:14px;background:var(--orange-100);font-weight:600;color:var(--ink-800)}
.form-ok{align-self:stretch;padding:10px 14px;border-radius:14px;background:var(--lime-100);font-weight:600;color:var(--ink-800)}
.back{align-self:center;color:var(--orange-600)}
.back:hover{text-decoration:underline}
.back:disabled{opacity:.5;cursor:not-allowed;text-decoration:none}
.links{align-self:stretch;display:flex;justify-content:center;flex-wrap:wrap;gap:8px 24px}
</style>
