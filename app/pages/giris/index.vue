<script setup lang="ts">
import {ref} from 'vue';
import {ArrowRight, ShieldCheck} from '@lucide/vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {browserSession} from '~/lib/session-instance';

const {t: i18nT} = useLocale();
const app = useApp();
const router = useRouter();
const register = ref(false);
const error = ref('');
const busy = ref(false);
/** Kept in memory only; a reload restarts the sign-in. */
const challenge = ref('');

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
      app.notify('E-posta doğrulama bağlantısını gönderdik.');
      register.value = false;
      return;
    }
    const result = await session.login(email, password);
    if (result.status === 'mfaRequired') {
      challenge.value = result.challenge;
      return;
    }
    await router.push('/araclarim');
  } catch {
    error.value = 'Giriş tamamlanamadı. Bilgilerini ve bağlantıyı kontrol et.';
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
    await router.push('/araclarim');
  } catch {
    error.value = 'Kod doğrulanamadı. Kodu kontrol edip tekrar dene.';
  } finally {
    busy.value = false;
  }
}

function backToLogin() {
  challenge.value = '';
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
  <div class="auth-page" id="content">
    <section class="auth-story">
      <h1>{{ i18nT("Aracın için") }}<br/>{{ i18nT("iyi bir başlangıç.") }}</h1>
      <p>{{ i18nT("Sevdiğin servisler, bakım geçmişin ve hatırlatmaların. Hepsi ücretsiz hesabında.") }}</p>
      <ShieldCheck :size="42"/>
      <p class="small">{{ i18nT("Aramak ve işletmeleri incelemek için üyelik gerekmez.") }}</p>
    </section>
    <section class="auth-form">
      <template v-if="challenge">
        <h2>{{ i18nT("İki adımlı doğrulama") }}</h2>
        <p>{{ i18nT("Kimlik doğrulama uygulamandaki 6 haneli kodu gir.") }}</p>
        <form class="stack" @submit="verify">
          <label>{{ i18nT("Doğrulama kodu") }}<input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required/></label>
          <p v-if="error" class="error" role="alert">{{ i18nT(error) }}</p>
          <button :disabled="busy" class="button primary">{{ busy ? i18nT("İşleniyor…") : i18nT("Doğrula") }}</button>
          <button class="text-button" type="button" @click="backToLogin">{{ i18nT("Girişe dön") }}</button>
        </form>
      </template>
      <template v-else>
        <h2>{{ register ? i18nT("Ücretsiz hesap oluştur") : i18nT("Tekrar hoş geldin.") }}</h2>
        <template v-if="app.demo">
          <p>{{ i18nT("Bu yerel geliştirme önizlemesinde gerçek hesap açılmaz. Demo hesabıyla araç ve bakım akışını deneyebilirsin.") }}</p>
          <button class="button primary full" @click="enterDemo">{{ i18nT("Demo hesabıyla keşfet ") }}<ArrowRight :size="18"/></button>
          <p class="small muted">{{ i18nT("Gerçek şifre veya kişisel belge girme. Kayıtlar yalnızca bu tarayıcıda saklanır.") }}</p>
        </template>
        <form v-else class="stack" @submit="submit">
          <label>{{ i18nT("E-posta") }}<input name="email" type="email" autocomplete="email" required/></label>
          <label>{{ i18nT("Şifre") }}<input name="password" type="password" minlength="10" :autocomplete="register ? 'new-password' : 'current-password'" required/></label>
          <p v-if="error" class="error" role="alert">{{ i18nT(error) }}</p>
          <button :disabled="busy" class="button primary">{{ busy ? i18nT("İşleniyor…") : register ? i18nT("Hesap oluştur") : i18nT("Giriş yap") }}</button>
          <button class="text-button" type="button" @click="register = !register">{{ register ? i18nT("Zaten hesabım var") : i18nT("Ücretsiz hesap oluştur") }}</button>
          <button class="text-button" type="button" @click="forgot">{{ i18nT("Şifremi unuttum") }}</button>
        </form>
      </template>
    </section>
  </div>
</template>
