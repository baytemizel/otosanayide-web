<script setup lang="ts">
import {computed, onMounted, reactive, ref, watch} from 'vue';
import {ArrowRight, Check, KeyRound, Lock, Mail, MailCheck, Phone, User} from '@lucide/vue';
import AuthField from '~/components/v2/garage/AuthField.vue';
import {useApp} from '~/composables/useApp';
import {useSession} from '~/composables/useSession';
import {authErrorMessage, credentialErrors, EMAIL_PATTERN, MFA_CODE, PASSWORD_MIN, returnPath} from '~/lib/v2/auth';
import {browserSession} from '~/lib/session-instance';

// W10 form panel (Figma 123:106). One form for both modes; the "Giriş yap / Kayıt ol" switch
// moves between /giris and /kayit and keeps ?donus.
// Live: POST /api/auth/login (+ /mfa/verify when the account has two-step sign-in), /register (202:
// the account starts unverified and gets a verification mail) and /password/forgot. The API has no
// phone, Google or Apple sign-in and no display name, so those controls are disabled or hidden.
// Demo: any valid values open the local preview membership (no network), as before.
const props = defineProps<{mode: 'signin' | 'signup'}>();
const route = useRoute();
const app = useApp();
const session = useSession();
const live = !session.demo;

const method = ref<'email' | 'phone'>('email');
const form = reactive({name: '', email: '', phone: '', password: '', remember: true, code: ''});
const errors = reactive({name: '', email: '', phone: '', password: '', code: ''});
const signup = computed(() => props.mode === 'signup');

const busy = ref(false);
/** Form-level error (wrong password, rate limit, network). */
const formError = ref('');
/** Live: MFA challenge from /login; kept in memory only, a reload restarts the sign-in. */
const challenge = ref('');
/** Live: address a registration was sent for; the card then explains the verification mail. */
const registered = ref('');
const forgotStatus = ref('');
let leaving = false;

const donus = computed(() => returnPath(route.query.donus));
const keepQuery = computed(() => (donus.value ? {donus: donus.value} : {}));

const EMAIL = EMAIL_PATTERN;

function validate() {
  if (live) {
    const found = credentialErrors(form.email, form.password, signup.value);
    Object.assign(errors, {name: '', phone: '', ...found});
    return !found.email && !found.password;
  }
  errors.name = signup.value && !form.name.trim() ? 'Adını ve soyadını yaz.' : '';
  errors.email = '';
  errors.phone = '';
  if (method.value === 'email') {
    if (!form.email.trim()) errors.email = 'E-posta adresini yaz.';
    else if (!EMAIL.test(form.email.trim())) errors.email = 'Geçerli bir e-posta adresi yaz (ör. deniz@ornek.com).';
  } else {
    const digits = form.phone.replace(/\D/g, '');
    if (!digits) errors.phone = 'Telefon numaranı yaz.';
    else if (digits.length < 10) errors.phone = 'Telefon numarası 10 haneli olmalı.';
  }
  errors.password = form.password ? '' : (signup.value ? 'Bir şifre belirle.' : 'Şifreni yaz.');
  return !errors.name && !errors.email && !errors.phone && !errors.password;
}

function leave() {
  if (leaving) return;
  leaving = true;
  if (live && !session.emailVerified.value) app.notify('E-posta adresin henüz doğrulanmadı. Bağlantıyı Hesabım › Güvenlik bölümünden yeniden gönderebilirsin.');
  return navigateTo(donus.value ?? '/araclarim', {replace: live});
}

async function finish() {
  await session.signIn(form.email.trim(), form.password);
  return navigateTo(donus.value ?? '/araclarim');
}

async function submitLive() {
  if (busy.value) return;
  busy.value = true;
  formError.value = '';
  forgotStatus.value = '';
  const email = form.email.trim();
  try {
    if (signup.value) {
      await session.register(email, form.password);
      registered.value = email;
      form.password = '';
      return;
    }
    const result = await session.signIn(email, form.password);
    if (result.status === 'mfaRequired') {
      challenge.value = result.challenge;
      form.code = '';
      errors.code = '';
      return;
    }
    form.password = '';
    await leave();
  } catch (error) {
    formError.value = authErrorMessage(signup.value ? 'register' : 'login', error);
  } finally {
    busy.value = false;
  }
}

async function verifyCode() {
  if (busy.value) return;
  const code = form.code.replace(/\s/g, '');
  errors.code = MFA_CODE.test(code) ? '' : 'Kimlik doğrulama uygulamandaki 6 haneli kodu yaz.';
  if (errors.code) return;
  busy.value = true;
  formError.value = '';
  try {
    await session.verifyMfa(challenge.value, code);
    challenge.value = '';
    form.password = '';
    await leave();
  } catch (error) {
    formError.value = authErrorMessage('mfa', error);
  } finally {
    busy.value = false;
  }
}

function backToForm() {
  challenge.value = '';
  form.code = '';
  formError.value = '';
}

async function forgot() {
  if (busy.value) return;
  formError.value = '';
  forgotStatus.value = '';
  const email = form.email.trim();
  errors.email = EMAIL.test(email) ? '' : 'Şifre yenileme bağlantısı için e-posta adresini yaz.';
  if (errors.email) return;
  busy.value = true;
  try {
    await browserSession().forgotPassword(email);
    forgotStatus.value = 'Bu adresle bir hesap varsa şifre yenileme bağlantısı gönderildi. E-postanı kontrol et.';
  } catch (error) {
    formError.value = authErrorMessage('forgot', error);
  } finally {
    busy.value = false;
  }
}

function submit() {
  if (!validate()) return;
  if (live) void submitLive();
  else void finish();
}

function switchMethod(next: 'email' | 'phone') {
  if (live && next === 'phone') return;
  method.value = next;
  errors.email = '';
  errors.phone = '';
}

// Live: a visitor who is already signed in goes on to ?donus or the garage.
onMounted(() => {
  if (!live) return;
  watch(() => [app.ready, app.member] as const, ([ready, member]) => {
    if (ready && member && !busy.value && !challenge.value) void leave();
  }, {immediate: true});
});
</script>

<template>
  <div class="auth-form">
    <nav class="mode" aria-label="Hesap">
      <NuxtLink :to="{path: '/giris', query: keepQuery}" class="mode-link" :class="{on: !signup}" :aria-current="!signup ? 'page' : undefined">Giriş yap</NuxtLink>
      <NuxtLink :to="{path: '/kayit', query: keepQuery}" class="mode-link" :class="{on: signup}" :aria-current="signup ? 'page' : undefined">Kayıt ol</NuxtLink>
    </nav>

    <div v-if="registered" class="state" role="status">
      <span class="badge" aria-hidden="true"><MailCheck :size="26"/></span>
      <h1 class="t-h3">E-postanı kontrol et</h1>
      <p class="t-body-md"><strong>{{ registered }}</strong> adresine bir e-posta gönderdik.</p>
      <p class="t-body-sm t-muted">Hesap yeni oluşturulduysa e-postada doğrulama bağlantısı vardır. Adres zaten kayıtlıysa yalnız bilgilendirme gönderilir.</p>
      <p class="t-body-sm t-muted">Doğrulamadan da giriş yapabilirsin. Yorum, fotoğraf ve iki adımlı doğrulama için doğrulanmış e-posta gerekir. E-posta gelmezse giriş yaptıktan sonra Hesabım › Güvenlik bölümünden yeniden gönder.</p>
      <NuxtLink :to="{path: '/giris', query: keepQuery}" class="btn btn-primary btn-lg submit">Giriş yap<ArrowRight aria-hidden="true"/></NuxtLink>
    </div>

    <form v-else-if="challenge" class="fields" novalidate @submit.prevent="verifyCode">
      <h1 class="t-h3">İki adımlı doğrulama</h1>
      <p class="t-body-md t-muted">Kimlik doğrulama uygulamandaki 6 haneli kodu gir.</p>
      <AuthField id="auth-code" v-model="form.code" label="Doğrulama kodu" :icon="KeyRound" inputmode="numeric" placeholder="123456" autocomplete="one-time-code" :error="errors.code"/>
      <p v-if="formError" class="form-err t-body-sm" role="alert">{{ formError }}</p>
      <button type="submit" class="btn btn-primary btn-lg submit" :disabled="busy">{{ busy ? 'Doğrulanıyor…' : 'Doğrula' }}<ArrowRight aria-hidden="true"/></button>
      <button type="button" class="back t-label-sm" @click="backToForm">Girişe dön</button>
    </form>

    <template v-else>
      <h1 class="sr-only">{{ signup ? 'Kayıt ol' : 'Giriş yap' }}</h1>

      <div class="method" role="tablist" aria-label="Giriş yöntemi">
        <button type="button" role="tab" class="method-tab t-label-md" :class="{on: method === 'email'}" :aria-selected="method === 'email'" @click="switchMethod('email')">E-posta</button>
        <button
          type="button"
          role="tab"
          class="method-tab t-label-md"
          :class="{on: method === 'phone', off: live}"
          :aria-selected="method === 'phone'"
          :aria-disabled="live ? 'true' : undefined"
          :title="live ? 'Telefonla giriş henüz yok' : undefined"
          @click="switchMethod('phone')">Telefon</button>
      </div>

      <form class="fields" novalidate @submit.prevent="submit">
        <AuthField v-if="signup && !live" id="auth-name" v-model="form.name" label="Ad soyad" :icon="User" placeholder="Deniz Kaya" autocomplete="name" :error="errors.name"/>
        <AuthField v-if="method === 'email'" id="auth-email" v-model="form.email" label="E-posta adresi" :icon="Mail" type="email" inputmode="email" placeholder="deniz@ornek.com" autocomplete="email" :error="errors.email"/>
        <AuthField v-else id="auth-phone" v-model="form.phone" label="Telefon numarası" :icon="Phone" type="tel" inputmode="tel" placeholder="5XX XXX XX XX" autocomplete="tel-national" :error="errors.phone"/>
        <AuthField
          id="auth-password"
          v-model="form.password"
          label="Şifre"
          :icon="Lock"
          type="password"
          placeholder="••••••••••"
          :autocomplete="signup ? 'new-password' : 'current-password'"
          :error="errors.password"
          :hint="signup ? (live ? `En az ${PASSWORD_MIN} karakter.` : 'En az 8 karakter; harf ve rakam karışık olsun.') : undefined"/>

        <div v-if="!signup" class="row">
          <label v-if="!live" class="remember t-body-sm">
            <input v-model="form.remember" type="checkbox" class="box">
            <span class="box-face" aria-hidden="true"><Check :size="14" :stroke-width="2.5"/></span>
            Beni hatırla
          </label>
          <button v-if="live" type="button" class="forgot t-label-sm" :disabled="busy" @click="forgot">Şifremi unuttum</button>
          <NuxtLink v-else to="/giris/sifre-sifirla" class="forgot t-label-sm">Şifremi unuttum</NuxtLink>
        </div>
        <p v-else class="terms t-body-sm t-muted">
          Kayıt olarak <NuxtLink to="/yasal/kullanim-kosullari">Kullanım koşullarını</NuxtLink> ve
          <NuxtLink to="/yasal/gizlilik">Gizlilik bildirimini</NuxtLink> kabul edersin.
        </p>

        <p v-if="forgotStatus" class="form-ok t-body-sm" role="status">{{ forgotStatus }}</p>
        <p v-if="formError" class="form-err t-body-sm" role="alert">{{ formError }}</p>

        <button type="submit" class="btn btn-primary btn-lg submit" :disabled="busy">{{ busy ? 'İşleniyor…' : signup ? 'Kayıt ol' : 'Giriş yap' }}<ArrowRight aria-hidden="true"/></button>
      </form>

      <div class="or" aria-hidden="true"><span/><p class="t-body-sm t-muted">veya</p><span/></div>
      <template v-if="live">
        <button type="button" class="social t-label-md" disabled aria-disabled="true">Google ile devam et</button>
        <button type="button" class="social t-label-md" disabled aria-disabled="true">Apple ile devam et</button>
        <p class="t-body-sm t-muted social-note">Google, Apple ve telefonla giriş henüz yok; e-posta ile devam et.</p>
      </template>
      <template v-else>
        <button type="button" class="social t-label-md" @click="finish">Google ile devam et</button>
        <button type="button" class="social t-label-md" @click="finish">Apple ile devam et</button>
      </template>

      <p v-if="!signup" class="switch-line"><span class="t-body-sm t-muted">Hesabın yok mu?</span> <NuxtLink :to="{path: '/kayit', query: keepQuery}" class="t-label-sm">Ücretsiz kayıt ol</NuxtLink></p>
      <p v-else class="switch-line"><span class="t-body-sm t-muted">Zaten hesabın var mı?</span> <NuxtLink :to="{path: '/giris', query: keepQuery}" class="t-label-sm">Giriş yap</NuxtLink></p>
    </template>
  </div>
</template>

<style scoped>
.auth-form{display:flex;flex-direction:column;gap:20px}
.mode{display:flex;gap:4px;padding:4px;border-radius:999px;background:var(--cream-100)}
.mode-link{flex:1 1 0;display:flex;align-items:center;justify-content:center;padding:12px;border-radius:999px;font-weight:600;font-size:15px;line-height:1.2;color:var(--ink-700);transition:background-color .15s ease}
.mode-link.on{background:var(--ink-900);color:var(--white)}
.mode-link:not(.on):hover{background:rgba(255,255,255,.6)}
.method{display:flex;gap:20px}
.method-tab{display:flex;flex-direction:column;gap:8px;color:var(--ink-500)}
.method-tab::after{content:"";height:3px;border-radius:2px;background:transparent}
.method-tab.on{color:var(--ink-900)}
.method-tab.on::after{background:var(--orange-500)}
.method-tab.off{opacity:.5;cursor:not-allowed}
.fields{display:flex;flex-direction:column;gap:20px}
.row{display:flex;align-items:center;justify-content:space-between;gap:10px}
.remember{position:relative;display:inline-flex;align-items:center;gap:10px;color:var(--ink-800);cursor:pointer}
.box{position:absolute;opacity:0;width:22px;height:22px;margin:0;cursor:pointer}
.box-face{flex:none;width:22px;height:22px;border-radius:7px;border:1.5px solid var(--ink-300);background:var(--white);display:grid;place-items:center;color:transparent}
.box:checked + .box-face{background:var(--orange-500);border-color:var(--orange-500);color:var(--ink-900)}
.box:focus-visible + .box-face{outline:2px solid var(--orange-500);outline-offset:3px}
.forgot{color:var(--orange-600);margin-left:auto}
.forgot:disabled{opacity:.5;cursor:not-allowed}
.forgot:hover,.switch-line a:hover,.terms a:hover{text-decoration:underline}
.terms a{color:var(--orange-600);font-weight:600}
.submit{width:100%}
.or{display:flex;align-items:center;gap:14px}
.or span{flex:1;height:1px;background:var(--cream-200)}
.social{display:flex;align-items:center;justify-content:center;width:100%;padding:15px;border:1px solid var(--cream-200);border-radius:999px;color:var(--ink-900);background:var(--white);transition:border-color .15s ease}
.social:hover{border-color:var(--ink-900)}
.social:disabled{opacity:.5;cursor:not-allowed}
.social:disabled:hover{border-color:var(--cream-200)}
.social-note{text-align:center}
.state{display:flex;flex-direction:column;align-items:flex-start;gap:14px}
.badge{width:64px;height:64px;border-radius:999px;display:grid;place-items:center;background:var(--lime-400);color:var(--ink-900);margin-bottom:4px}
.form-err{padding:10px 14px;border-radius:14px;background:var(--orange-100);font-weight:600;color:var(--ink-800)}
.form-ok{padding:10px 14px;border-radius:14px;background:var(--lime-100);font-weight:600;color:var(--ink-800)}
.back{align-self:center;color:var(--orange-600)}
.back:hover{text-decoration:underline}
.switch-line{display:flex;justify-content:center;align-items:baseline;gap:6px;flex-wrap:wrap}
.switch-line a{color:var(--orange-600)}
</style>
