<script setup lang="ts">
import {ref} from 'vue';
import {ArrowRight, Bell, CarFront, Globe, Heart, Inbox} from '@lucide/vue';
import AuthPasswordField from '~/components/AuthPasswordField.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {legalPath} from '~/lib/legal';
import {SessionRequestError} from '~/lib/session';
import {browserSession} from '~/lib/session-instance';

const {t: i18nT} = useLocale();
const app = useApp();
const router = useRouter();
const register = ref(false);
const error = ref('');
const busy = ref(false);
/** Kept in memory only; a reload restarts the sign-in. */
const challenge = ref('');
/** Address a registration was just sent for; the form then shows what happens next. */
const registered = ref('');
const terms = legalPath('kullanim-kosullari');
const privacy = legalPath('gizlilik');
useSeoMeta({title: () => i18nT('Giriş yap')});

function signedIn() {
  const user = browserSession().currentUser();
  if (user && !user.emailVerified) app.notify('E-posta adresin henüz doğrulanmadı. Bağlantıyı Hesabım › Güvenlik bölümünden yeniden gönderebilirsin.');
  return router.push('/araclarim');
}
const features = [
  {icon: CarFront, text: 'Birden fazla araç ve bakım geçmişi'},
  {icon: Bell, text: 'Push, e-posta ve takvim hatırlatmaları'},
  {icon: Heart, text: 'Favori listeleri ve karşılaştırma'},
  {icon: Inbox, text: 'Teklif ve randevu takibi'},
];

async function submit(e: Event) {
  e.preventDefault();
  const d = new FormData(e.currentTarget as HTMLFormElement);
  error.value = '';
  busy.value = true;
  try {
    const session = browserSession();
    const email = String(d.get('email'));
    const password = String(d.get('password'));
    if (register.value) {
      // The API sends the verification mail itself and opens no session until sign-in.
      await session.register(email, password);
      registered.value = email;
      register.value = false;
      return;
    }
    const result = await session.login(email, password);
    if (result.status === 'mfaRequired') {
      challenge.value = result.challenge;
      return;
    }
    await signedIn();
  } catch (e) {
    if (e instanceof SessionRequestError && e.status === 429) error.value = 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.';
    else if (register.value && e instanceof SessionRequestError && e.status === 400) error.value = 'E-posta adresini ve en az 10 karakterlik şifreni kontrol et.';
    else error.value = 'Giriş tamamlanamadı. Bilgilerini ve bağlantıyı kontrol et.';
  } finally {
    busy.value = false;
  }
}

async function verify(e: Event) {
  e.preventDefault();
  const d = new FormData(e.currentTarget as HTMLFormElement);
  error.value = '';
  busy.value = true;
  try {
    await browserSession().verifyMfa(challenge.value, String(d.get('code')));
    challenge.value = '';
    await signedIn();
  } catch (e) {
    error.value = e instanceof SessionRequestError && e.status === 429 ? 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.' : 'Kod doğrulanamadı. Kodu kontrol edip tekrar dene.';
  } finally {
    busy.value = false;
  }
}

function backToLogin() {
  challenge.value = '';
  registered.value = '';
  error.value = '';
}

async function forgot(e: Event) {
  const form = (e.currentTarget as HTMLButtonElement).form;
  const email = String(new FormData(form!).get('email') ?? '');
  try {
    await browserSession().forgotPassword(email);
    app.notify('Uygun bir hesap varsa kurtarma e-postası gönderildi.');
  } catch {
    error.value = 'E-posta adresini kontrol et.';
  }
}

function enterDemo() {
  app.loginDemo();
  void router.push('/araclarim');
}
</script>

<template>
  <div id="content" class="w10">
    <div class="w10-inner">
      <section class="w10-story ds-col ds-g20">
        <h1 class="ds-serif">{{ i18nT("Ücretsiz hesabınla daha fazlası") }}</h1>
        <p class="w10-lead">{{ i18nT("Favoriler, araçlarım, bakım hatırlatmaları, yorum ve teklif takibi. Keşif, telefon ve yol tarifi için üyelik gerekmez.") }}</p>
        <div v-for="feature in features" :key="feature.text" class="ds-row ds-g12">
          <span class="w10-icon"><component :is="feature.icon" :size="20"/></span>
          <span class="ds-small ds-b">{{ i18nT(feature.text) }}</span>
        </div>
      </section>
      <section class="ds-card w10-card ds-col ds-g16">
        <template v-if="challenge">
          <h2 class="ds-serif">{{ i18nT("İki adımlı doğrulama") }}</h2>
          <p class="ds-small ds-muted">{{ i18nT("Kimlik doğrulama uygulamandaki 6 haneli kodu gir.") }}</p>
          <form class="ds-col ds-g16" @submit="verify">
            <div>
              <label class="ds-label w10-label" for="login-code">{{ i18nT("Doğrulama kodu") }}</label>
              <input id="login-code" class="ds-field" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required/>
            </div>
            <p v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</p>
            <button :disabled="busy" class="ds-btn p lg w10-wide">{{ busy ? i18nT("İşleniyor…") : i18nT("Doğrula") }}</button>
            <button class="w10-link w10-center" type="button" @click="backToLogin">{{ i18nT("Girişe dön") }}</button>
          </form>
        </template>
        <template v-else-if="registered">
          <h2 class="ds-serif">{{ i18nT("E-postanı kontrol et") }}</h2>
          <p class="ds-note ok" role="status">{{ i18nT("{0} adresine bir e-posta gönderdik.", {'0': registered}) }}</p>
          <p class="ds-small ds-muted">{{ i18nT("Hesap yeni oluşturulduysa e-postada doğrulama bağlantısı vardır; bağlantı 24 saat geçerlidir. Adres zaten kayıtlıysa yalnız bilgilendirme gönderilir.") }}</p>
          <p class="ds-small ds-muted">{{ i18nT("Doğrulamadan da giriş yapabilirsin. Yorum, fotoğraf ve iki adımlı doğrulama için doğrulanmış e-posta gerekir. E-posta gelmezse giriş yaptıktan sonra Hesabım › Güvenlik bölümünden yeniden gönder.") }}</p>
          <button class="ds-btn p lg w10-wide" type="button" @click="backToLogin">{{ i18nT("Giriş yap") }}</button>
        </template>
        <template v-else>
          <h2 class="ds-serif">{{ register ? i18nT("Ücretsiz hesap oluştur") : i18nT("Giriş yap") }}</h2>
          <template v-if="app.demo">
            <p class="ds-small ds-muted">{{ i18nT("Bu yerel geliştirme önizlemesinde gerçek hesap açılmaz. Demo hesabıyla araç ve bakım akışını deneyebilirsin.") }}</p>
            <button class="ds-btn p lg w10-wide" type="button" @click="enterDemo">{{ i18nT("Demo hesabıyla keşfet ") }}<ArrowRight :size="18"/></button>
            <p class="ds-xs ds-muted">{{ i18nT("Gerçek şifre veya kişisel belge girme. Kayıtlar yalnızca bu tarayıcıda saklanır.") }}</p>
          </template>
          <form v-else class="ds-col ds-g16" @submit="submit">
            <div class="ds-seg w10-seg" role="group" :aria-label="i18nT('Giriş yöntemi')">
              <button type="button" class="on" aria-pressed="true">{{ i18nT("E-posta") }}</button>
              <button type="button" class="ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT("Telefon") }}</button>
            </div>
            <div>
              <label class="ds-label w10-label" for="login-email">{{ i18nT("E-posta adresi") }}</label>
              <input id="login-email" class="ds-field" name="email" type="email" autocomplete="email" required/>
            </div>
            <div>
              <label class="ds-label w10-label" for="login-password">{{ i18nT("Şifre") }}</label>
              <AuthPasswordField id="login-password" :autocomplete="register ? 'new-password' : 'current-password'"/>
              <div class="w10-under"><button class="w10-link" type="button" @click="forgot">{{ i18nT("Şifremi unuttum") }}</button></div>
            </div>
            <p v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</p>
            <button :disabled="busy" class="ds-btn p lg w10-wide">{{ busy ? i18nT("İşleniyor…") : register ? i18nT("Hesap oluştur") : i18nT("Giriş yap") }}</button>
            <div class="ds-row ds-g12"><span class="ds-divider ds-f1"/><span class="ds-xs ds-muted">{{ i18nT("veya") }}</span><span class="ds-divider ds-f1"/></div>
            <button type="button" class="ds-btn s lg w10-wide ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')"><Globe :size="18"/>{{ i18nT("Google ile devam et") }}</button>
            <button type="button" class="ds-btn s lg w10-wide ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT("Apple ile devam et") }}</button>
            <p class="ds-xs ds-muted w10-terms">
              <button v-if="register" class="w10-link" type="button" @click="register = !register">{{ i18nT("Zaten hesabım var") }}</button>
              <template v-else>{{ i18nT("Hesabın yok mu?") }} <button class="w10-link" type="button" @click="register = !register">{{ i18nT("Ücretsiz kayıt ol") }}</button></template>
              · {{ i18nT("Devam ederek") }} <NuxtLink v-if="terms" class="w10-legal" :to="terms">{{ i18nT("Kullanım koşulları") }}</NuxtLink><span v-else class="ds-passive w10-legal" aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT("Kullanım koşulları") }}</span> {{ i18nT("ve") }} <NuxtLink v-if="privacy" class="w10-legal" :to="privacy">{{ i18nT("Gizlilik bildirimi") }}</NuxtLink><span v-else class="ds-passive w10-legal" aria-disabled="true" :title="i18nT('Yakında')">{{ i18nT("Gizlilik bildirimi") }}</span>{{ i18nT("ni kabul edersin.") }}
            </p>
          </form>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.w10 {padding: 72px max(16px, calc((100% - 1160px) / 2)) 96px; background: linear-gradient(#f4f6f8, #fff);}
.w10-inner {display: flex; align-items: flex-start; justify-content: space-between; gap: 40px;}
.w10-story {width: 440px; flex: 0 1 440px; min-width: 0;}
h1 {margin: 0; font-size: 34px; line-height: 38.08px;}
h2 {margin: 0; font-size: 24px; line-height: 31.2px;}
p {margin: 0;}
.w10-lead {color: #586879; font-size: 15px; line-height: 22.5px;}
.w10-icon {display: grid; place-items: center; flex: none; width: 40px; height: 40px; border-radius: 12px; background: #fff3ec; color: #c4460b;}
.w10-card {width: 460px; flex: 0 1 460px; min-width: 0; padding: 32px; box-shadow: 0 16px 20px rgba(16, 36, 58, .08);}
.w10-seg button {flex: 1; justify-content: center;}
.w10-label {display: block;}
input.ds-field:focus-visible {outline: 0; border-color: #2459b4; box-shadow: 0 0 0 1px #2459b4;}
.w10-under {padding-top: 6px;}
.w10-link {padding: 0; border: 0; background: none; color: #10243a; font-size: 12px; font-weight: 700; line-height: 18px;}
.w10-center {align-self: center;}
.w10-wide {width: 100%;}
.w10-terms {text-align: center;}
.w10-legal {text-decoration: underline;}
@media (max-width: 1100px) {
  .w10 {padding-left: 24px; padding-right: 24px;}
}
@media (max-width: 760px) {
  .w10 {padding: 32px 16px 56px;}
  .w10-inner {flex-direction: column-reverse; align-items: stretch;}
  .w10-story, .w10-card {width: 100%; flex: none;}
}
@media (max-width: 480px) {
  .w10-card {padding: 20px;}
  h1 {font-size: 28px; line-height: 32px;}
}
</style>
