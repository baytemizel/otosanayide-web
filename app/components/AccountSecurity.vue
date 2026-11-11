<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import {BadgeCheck, Copy, KeyRound, Mail, ShieldCheck, TriangleAlert} from '@lucide/vue';
import AuthPasswordField from '~/components/AuthPasswordField.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {groupSecret, securityErrorMessage, totpCode} from '~/lib/account-security';
import {contractReady} from '~/lib/contract';
import {SessionRequestError, type TotpEnrollment} from '~/lib/session';
import {browserSession} from '~/lib/session-instance';

const {t: i18nT} = useLocale();
const app = useApp();

const verified = computed(() => app.user?.emailVerified === true);
const busy = ref<'' | 'resend' | 'reload' | 'reset' | 'enroll' | 'confirm' | 'disable' | 'password' | 'email'>('');
const message = ref<{tone: 'ok' | 'err' | 'info'; text: string} | null>(null);
/** unknown: the API cannot tell yet (web-01); the first enroll answer settles it. */
const totp = ref<'unknown' | 'off' | 'on'>('unknown');
const enrollment = ref<TotpEnrollment | null>(null);
const resentAt = ref(0);
const copied = ref(false);
let alive = true;

onMounted(() => {
  if (!contractReady.mfaStatus || !app.user || app.demo) return;
  browserSession().mfaStatus()
    .then(status => {
      if (alive) totp.value = status.totp.enabled ? 'on' : 'off';
    })
    .catch(() => {
      /* Status stays unknown; enrolling still works and answers 409 when already on. */
    });
});
onBeforeUnmount(() => {
  alive = false;
  enrollment.value = null;
});

async function run(kind: typeof busy.value, task: () => Promise<void>) {
  if (busy.value) return;
  busy.value = kind;
  message.value = null;
  try {
    await task();
  } catch (error) {
    if (alive) message.value = {tone: 'err', text: securityErrorMessage(error)};
  } finally {
    if (alive) busy.value = '';
  }
}

const resendLocked = computed(() => resentAt.value > 0 && Date.now() - resentAt.value < 60_000);
const resend = () => run('resend', async () => {
  await browserSession().resendVerification();
  resentAt.value = Date.now();
  message.value = {tone: 'ok', text: 'Doğrulama bağlantısını e-posta adresine gönderdik. Bağlantı 24 saat geçerlidir.'};
});
const reload = () => run('reload', async () => {
  await browserSession().reloadIdentity();
  message.value = app.user?.emailVerified ? {tone: 'ok', text: 'E-posta adresin doğrulandı.'} : {tone: 'info', text: 'E-posta adresin henüz doğrulanmadı.'};
});
const sendReset = () => run('reset', async () => {
  const email = app.user?.email;
  if (!email) throw new SessionRequestError(401);
  await browserSession().forgotPassword(email);
  message.value = {tone: 'ok', text: 'Şifre yenileme bağlantısını e-posta adresine gönderdik.'};
});

const enroll = () => run('enroll', async () => {
  try {
    enrollment.value = await browserSession().enrollTotp();
    copied.value = false;
  } catch (error) {
    if (error instanceof SessionRequestError && error.status === 409) {
      totp.value = 'on';
      message.value = {tone: 'info', text: 'İki adımlı doğrulama zaten etkin.'};
      return;
    }
    throw error;
  }
});

function codeOf(e: Event) {
  const value = String(new FormData(e.currentTarget as HTMLFormElement).get('code') ?? '').trim();
  if (!totpCode.test(value)) throw new SessionRequestError(400);
  return value;
}

const confirm = (e: Event) => {
  e.preventDefault();
  void run('confirm', async () => {
    await browserSession().confirmTotp(codeOf(e));
    enrollment.value = null;
    totp.value = 'on';
    message.value = {tone: 'ok', text: 'İki adımlı doğrulama açıldı. Sonraki girişlerde kod istenecek.'};
  });
};
const disable = (e: Event) => {
  e.preventDefault();
  void run('disable', async () => {
    await browserSession().disableTotp(codeOf(e));
    totp.value = 'off';
    message.value = {tone: 'ok', text: 'İki adımlı doğrulama kapatıldı.'};
  });
};
function cancelEnrollment() {
  enrollment.value = null;
  message.value = null;
}
async function copySecret() {
  if (!enrollment.value) return;
  try {
    await navigator.clipboard.writeText(enrollment.value.secret);
    copied.value = true;
  } catch {
    message.value = {tone: 'err', text: 'Kopyalanamadı. Anahtarı elle yaz.'};
  }
}

const changePassword = (e: Event) => {
  e.preventDefault();
  const form = e.currentTarget as HTMLFormElement;
  const d = new FormData(form);
  void run('password', async () => {
    const code = String(d.get('code') ?? '').trim();
    try {
      await browserSession().changePassword(String(d.get('currentPassword')), String(d.get('password')), code || undefined);
    } catch (error) {
      // web-02: 403 means a TOTP code is required; 400 covers a wrong password or code.
      if (error instanceof SessionRequestError && error.status === 403) {
        totp.value = 'on';
        message.value = {tone: 'info', text: 'İki adımlı doğrulama kodu gerekli.'};
        return;
      }
      if (error instanceof SessionRequestError && error.status === 400) {
        message.value = {tone: 'err', text: 'Şifre veya doğrulama kodu hatalı.'};
        return;
      }
      throw error;
    }
    form.reset();
    message.value = {tone: 'ok', text: 'Şifren güncellendi. Diğer cihazlardaki oturumlar kapatıldı.'};
  });
};
const changeEmail = (e: Event) => {
  e.preventDefault();
  const form = e.currentTarget as HTMLFormElement;
  const d = new FormData(form);
  void run('email', async () => {
    const code = String(d.get('code') ?? '').trim();
    try {
      await browserSession().changeEmail(String(d.get('newEmail')).trim(), String(d.get('password')), code || undefined);
    } catch (error) {
      // web-03: like the password change, a wrong password or code is 400 and a missing code 403.
      if (error instanceof SessionRequestError && error.status === 403) {
        totp.value = 'on';
        message.value = {tone: 'info', text: 'İki adımlı doğrulama kodu gerekli.'};
        return;
      }
      if (error instanceof SessionRequestError && error.status === 400) {
        message.value = {tone: 'err', text: 'Şifreyi, kodu ve yeni adresin mevcut adresten farklı olduğunu kontrol et.'};
        return;
      }
      throw error;
    }
    form.reset();
    message.value = {tone: 'ok', text: 'Yeni adrese onay bağlantısı gönderdik. Bağlantıyı açana kadar mevcut adresin geçerli kalır; onaydan sonra bütün oturumların kapanır ve yeniden giriş yaparsın.'};
  });
};
</script>

<template>
  <section id="guvenlik" class="ds-card ds-pad24 ds-col ds-g16 security" :aria-busy="!!busy">
    <h2>{{ i18nT('Güvenlik') }}</h2>
    <p v-if="app.demo" class="ds-small ds-muted">{{ i18nT('Önizleme hesabında giriş ve güvenlik ayarları yoktur.') }}</p>
    <template v-else-if="app.user">
      <p v-if="message" class="ds-note" :class="message.tone" :role="message.tone === 'err' ? 'alert' : 'status'">{{ i18nT(message.text) }}</p>

      <div class="ds-row ds-g12 ds-wrap item">
        <Mail class="ds-i" :size="18" aria-hidden="true"/>
        <div class="ds-f1 ds-col ds-g4">
          <span class="ds-small ds-b">{{ i18nT('E-posta adresi') }}</span>
          <span class="ds-small ds-muted mail">{{ app.user.email }}</span>
        </div>
        <span v-if="verified" class="ds-badge ok"><BadgeCheck :size="13"/>{{ i18nT('Doğrulandı') }}</span>
        <span v-else class="ds-badge warn"><TriangleAlert :size="13"/>{{ i18nT('Doğrulanmadı') }}</span>
      </div>
      <div v-if="!verified" class="ds-note warn ds-col ds-g8">
        <span>{{ i18nT('Yorum, fotoğraf ve iki adımlı doğrulama için e-posta adresini doğrulaman gerekir. Gelen kutunu ve gereksiz klasörünü kontrol et.') }}</span>
        <div class="ds-row ds-g8 ds-wrap">
          <button type="button" class="ds-btn s sm" :disabled="!!busy || resendLocked" @click="resend">{{ busy === 'resend' ? i18nT('Gönderiliyor…') : i18nT('Doğrulama e-postasını yeniden gönder') }}</button>
          <button type="button" class="ds-btn g sm" :disabled="!!busy" @click="reload">{{ i18nT('Doğruladım, durumu yenile') }}</button>
        </div>
      </div>

      <div class="ds-divider"/>
      <div class="ds-row ds-g12 ds-wrap item">
        <ShieldCheck class="ds-i" :size="18" aria-hidden="true"/>
        <div class="ds-f1 ds-col ds-g4">
          <span class="ds-small ds-b">{{ i18nT('İki adımlı doğrulama') }}</span>
          <span class="ds-xs ds-muted">{{ i18nT('Girişte kimlik doğrulama uygulamasındaki 6 haneli kod da istenir. Kurtarma kodu yoktur; cihazını kaybedersen destekle iletişime geçmen gerekir.') }}</span>
        </div>
        <span v-if="totp === 'on'" class="ds-badge ok">{{ i18nT('Etkin') }}</span>
        <span v-else-if="totp === 'off'" class="ds-badge neu">{{ i18nT('Kapalı') }}</span>
      </div>
      <template v-if="totp !== 'on'">
        <div v-if="!enrollment">
          <button type="button" class="ds-btn s sm" :disabled="!!busy || !verified" @click="enroll">{{ busy === 'enroll' ? i18nT('İşleniyor…') : i18nT('İki adımlı doğrulamayı kur') }}</button>
          <p v-if="!verified" class="ds-xs ds-muted hint">{{ i18nT('Önce e-posta adresini doğrula.') }}</p>
          <p v-else-if="totp === 'unknown'" class="ds-xs ds-muted hint">{{ i18nT('Zaten açıksa kurulum yerine kapatma seçeneği gösterilir.') }}</p>
        </div>
        <div v-else class="ds-col ds-g12 enroll">
          <ol class="ds-small steps">
            <li>{{ i18nT('Kimlik doğrulama uygulamasında yeni hesap ekle ve aşağıdaki anahtarı gir ya da bağlantıyı bu cihazda aç.') }}</li>
            <li>{{ i18nT('Uygulamanın gösterdiği 6 haneli kodu yaz.') }}</li>
          </ol>
          <div class="ds-row ds-g8 ds-wrap">
            <code class="secret" :aria-label="i18nT('Kurulum anahtarı')">{{ groupSecret(enrollment.secret) }}</code>
            <button type="button" class="ds-btn g sm" @click="copySecret"><Copy :size="15"/>{{ copied ? i18nT('Kopyalandı') : i18nT('Kopyala') }}</button>
            <a class="ds-btn g sm" :href="enrollment.otpauthUri">{{ i18nT('Uygulamada aç') }}</a>
          </div>
          <form class="ds-row ds-g8 ds-wrap code-form" @submit="confirm">
            <label class="ds-col ds-g4">
              <span class="ds-label">{{ i18nT('Doğrulama kodu') }}</span>
              <input class="ds-field code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required/>
            </label>
            <button class="ds-btn p sm" :disabled="!!busy">{{ busy === 'confirm' ? i18nT('İşleniyor…') : i18nT('Onayla ve aç') }}</button>
            <button type="button" class="ds-btn g sm" :disabled="!!busy" @click="cancelEnrollment">{{ i18nT('Vazgeç') }}</button>
          </form>
        </div>
      </template>
      <form v-else class="ds-row ds-g8 ds-wrap code-form" @submit="disable">
        <label class="ds-col ds-g4">
          <span class="ds-label">{{ i18nT('Kapatmak için güncel kod') }}</span>
          <input class="ds-field code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required/>
        </label>
        <button class="ds-btn d sm" :disabled="!!busy">{{ busy === 'disable' ? i18nT('İşleniyor…') : i18nT('İki adımlı doğrulamayı kapat') }}</button>
      </form>

      <div class="ds-divider"/>
      <div class="ds-row ds-g12 ds-wrap item">
        <KeyRound class="ds-i" :size="18" aria-hidden="true"/>
        <div class="ds-f1 ds-col ds-g4">
          <span class="ds-small ds-b">{{ i18nT('Şifre') }}</span>
          <span class="ds-xs ds-muted">{{ i18nT('En az 10 karakter.') }}</span>
        </div>
      </div>
      <form v-if="contractReady.passwordChange" class="ds-col ds-g12 change-form" @submit="changePassword">
        <div><label class="ds-label" for="security-current">{{ i18nT('Mevcut şifre') }}</label><AuthPasswordField id="security-current" name="currentPassword" :minlength="1" autocomplete="current-password"/></div>
        <div><label class="ds-label" for="security-new">{{ i18nT('Yeni şifre') }}</label><AuthPasswordField id="security-new" autocomplete="new-password"/></div>
        <label v-if="totp === 'on'" class="ds-col ds-g4"><span class="ds-label">{{ i18nT('Doğrulama kodu') }}</span><input class="ds-field code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required/></label>
        <div><button class="ds-btn s sm" :disabled="!!busy">{{ busy === 'password' ? i18nT('İşleniyor…') : i18nT('Şifreyi değiştir') }}</button></div>
      </form>
      <div v-else class="ds-row ds-g8 ds-wrap">
        <button type="button" class="ds-btn s sm ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT('Şifreyi değiştir') }}</button>
        <button type="button" class="ds-btn g sm" :disabled="!!busy" @click="sendReset">{{ busy === 'reset' ? i18nT('Gönderiliyor…') : i18nT('Yenileme bağlantısı gönder') }}</button>
      </div>

      <div class="ds-divider"/>
      <div class="ds-row ds-g12 ds-wrap item">
        <Mail class="ds-i" :size="18" aria-hidden="true"/>
        <div class="ds-f1 ds-col ds-g4">
          <span class="ds-small ds-b">{{ i18nT('E-posta adresini değiştir') }}</span>
          <span class="ds-xs ds-muted">{{ i18nT('Yeni adres, gönderilen bağlantı açılınca geçerli olur.') }}</span>
        </div>
      </div>
      <form v-if="contractReady.emailChange" class="ds-col ds-g12 change-form" @submit="changeEmail">
        <label class="ds-col ds-g4"><span class="ds-label">{{ i18nT('Yeni e-posta adresi') }}</span><input class="ds-field" name="newEmail" type="email" autocomplete="email" maxlength="254" required/></label>
        <div><label class="ds-label" for="security-email-password">{{ i18nT('Mevcut şifre') }}</label><AuthPasswordField id="security-email-password" :minlength="1" autocomplete="current-password"/></div>
        <label v-if="totp === 'on'" class="ds-col ds-g4"><span class="ds-label">{{ i18nT('Doğrulama kodu') }}</span><input class="ds-field code" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required/></label>
        <div><button class="ds-btn s sm" :disabled="!!busy">{{ busy === 'email' ? i18nT('İşleniyor…') : i18nT('Onay bağlantısı gönder') }}</button></div>
      </form>
      <div v-else><button type="button" class="ds-btn s sm ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT('E-posta adresini değiştir') }}</button></div>
    </template>
  </section>
</template>

<style scoped>
.security h2 {margin: 0; font: 700 19px/24.7px Arimo, Arial, sans-serif; letter-spacing: 0;}
.security p {margin: 0;}
.item {align-items: flex-start;}
.mail {overflow-wrap: anywhere;}
.hint {margin-top: 6px !important;}
.steps {margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 4px;}
.secret {padding: 8px 12px; border: 1px solid #dfe5eb; border-radius: 8px; background: #f4f6f8; font: 600 14px/20px ui-monospace, Menlo, monospace; letter-spacing: .04em; overflow-wrap: anywhere;}
.code-form {align-items: flex-end;}
.code {width: 140px; letter-spacing: .2em;}
.change-form {max-width: 420px;}
</style>
