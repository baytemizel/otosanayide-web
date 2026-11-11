<script setup lang="ts">
import {ref} from 'vue';
import {ArrowRight, BadgeCheck, ChevronLeft, FileText, Globe, House, Inbox, Lock, Megaphone, MessageSquare, Phone, Plus, ShieldCheck, TriangleAlert, Check} from '@lucide/vue';
import AuthCodeBoxes from '~/components/AuthCodeBoxes.vue';
import AuthPasswordField from '~/components/AuthPasswordField.vue';
import BrandLogo from '~/components/BrandLogo.vue';
import LanguageSwitch from '~/components/LanguageSwitch.vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {SessionRequestError} from '~/lib/session';
import {browserSession} from '~/lib/session-instance';

const {t: i18nT} = useLocale();
const app = useApp();
const router = useRouter();
const mode = ref<'login' | 'forgot'>('login');
const error = ref('');
/** True only when the API rejected the e-mail and password themselves. */
const badCredentials = ref(false);
const busy = ref(false);
const sent = ref(false);
/** Kept in memory only; a reload restarts the sign-in. */
const challenge = ref('');

const features = [
  {icon: House, title: 'Profilini yönet', text: 'Bilgi, saat, konum ve fotoğrafları alan alan güncelle.'},
  {icon: MessageSquare, title: 'Yorumlara yanıt ver', text: 'Yanıtların “İşletme yanıtı” etiketiyle yayınlanır.'},
  {icon: Inbox, title: 'Teklif ve randevu', text: 'Etkinleştirilen şubelerde talepleri karşıla.'},
  {icon: Megaphone, title: 'Etiketli reklam', text: 'Sponsorlu alanlar organik sıralamayı değiştirmez.'},
];

async function submit(e: Event) {
  e.preventDefault();
  const d = new FormData(e.currentTarget as HTMLFormElement);
  error.value = '';
  badCredentials.value = false;
  busy.value = true;
  try {
    const result = await browserSession().login(String(d.get('email')), String(d.get('password')));
    if (result.status === 'mfaRequired') {
      challenge.value = result.challenge;
      return;
    }
    await router.push('/isletme');
  } catch (failure) {
    badCredentials.value = failure instanceof SessionRequestError && failure.status === 401;
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
    await router.push('/isletme');
  } catch {
    error.value = 'Kod doğrulanamadı. Kodu kontrol edip tekrar dene.';
  } finally {
    busy.value = false;
  }
}

async function requestReset(e: Event) {
  e.preventDefault();
  const email = String(new FormData(e.currentTarget as HTMLFormElement).get('email') ?? '');
  error.value = '';
  sent.value = false;
  busy.value = true;
  try {
    await browserSession().forgotPassword(email);
    sent.value = true;
  } catch {
    error.value = 'E-posta adresini kontrol et.';
  } finally {
    busy.value = false;
  }
}

function show(next: 'login' | 'forgot') {
  mode.value = next;
  challenge.value = '';
  error.value = '';
  badCredentials.value = false;
  sent.value = false;
}

function enterDemo() {
  app.loginDemo();
  void router.push('/isletme');
}
</script>

<template>
  <div id="content" class="b00">
    <aside class="b00-story">
      <span class="b00-ring one"/>
      <span class="b00-ring two"/>
      <div class="ds-col ds-g8 b00-brand">
        <BrandLogo dark :scale="1.09"/>
        <span class="ds-badge sp b00-badge">{{ i18nT("İşletme Merkezi") }}</span>
      </div>
      <div class="ds-col ds-g24 b00-pitch">
        <h1 class="ds-serif">{{ i18nT("Servisini müşterilerinin bulduğu yerde yönet.") }}</h1>
        <div class="ds-col ds-g20">
          <div v-for="feature in features" :key="feature.title" class="ds-row ds-g12 ds-as">
            <span class="b00-icon"><component :is="feature.icon" :size="20"/></span>
            <div class="ds-col">
              <b class="b00-feature">{{ i18nT(feature.title) }}</b>
              <span class="ds-small b00-soft">{{ i18nT(feature.text) }}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="ds-col ds-g6 b00-legal">
        <span class="ds-small b00-foot">{{ i18nT("Listelenme ve sahiplik doğrulaması ücretsizdir.") }}</span>
        <span class="ds-xs b00-fine">{{ i18nT("Doğrulama rozeti yönetim yetkisini gösterir; hizmet kalitesi garantisi değildir.") }}</span>
      </div>
    </aside>
    <div class="b00-compact">
      <span class="b00-ring three"/>
      <BrandLogo dark :scale="0.83"/>
      <span class="ds-badge sp b00-badge">{{ i18nT("İşletme Merkezi") }}</span>
      <p class="ds-serif">{{ i18nT("Servisini tek yerden yönet.") }}</p>
    </div>
    <div class="b00-main">
      <div class="ds-row ds-g8 b00-top">
        <LanguageSwitch/>
        <NuxtLink class="ds-btn g sm" to="/"><ChevronLeft :size="15"/>{{ i18nT("Otosanayide’ye dön") }}</NuxtLink>
      </div>
      <div class="b00-center">
        <section class="ds-card b00-card ds-col ds-g16">
          <template v-if="challenge">
            <span class="b00-tile info"><Lock :size="26"/></span>
            <div class="ds-col ds-g6">
              <h2 class="ds-serif">{{ i18nT("İki adımlı doğrulama") }}</h2>
              <p class="ds-small ds-muted">{{ i18nT("Doğrulama uygulamandaki 6 haneli kodu gir. Kod 30 saniyede yenilenir.") }}</p>
            </div>
            <form class="ds-col ds-g16" @submit="verify">
              <AuthCodeBoxes id="business-code" :label="i18nT('Doğrulama kodu')"/>
              <p v-if="error" class="ds-note err" role="alert"><TriangleAlert class="ds-i" :size="16"/><span>{{ i18nT(error) }}</span></p>
              <button :disabled="busy" class="ds-btn p lg b00-wide">{{ busy ? i18nT("İşleniyor…") : i18nT("Doğrula") }}</button>
            </form>
            <div class="ds-col ds-g10">
              <span class="ds-small ds-b ds-row ds-g8 ds-passive" aria-disabled="true" :title="i18nT('Yakında')"><Phone :size="16"/>{{ i18nT("SMS ile kod gönder") }}</span>
              <span class="ds-small ds-b ds-row ds-g8 ds-passive" aria-disabled="true" :title="i18nT('Yakında')"><FileText :size="16"/>{{ i18nT("Yedek kod kullan") }}</span>
            </div>
            <span class="ds-divider"/>
            <button class="b00-link b00-start" type="button" @click="show('login')">{{ i18nT("Girişe dön") }}</button>
          </template>
          <template v-else-if="mode === 'forgot'">
            <button class="b00-link ds-row ds-g6 b00-start" type="button" @click="show('login')"><ChevronLeft :size="15"/>{{ i18nT("Girişe dön") }}</button>
            <div class="ds-col ds-g6">
              <h2 class="ds-serif">{{ i18nT("Şifreni sıfırla") }}</h2>
              <p class="ds-small ds-muted">{{ i18nT("Hesabına kayıtlı e-postaya tek kullanımlık bir bağlantı göndereceğiz.") }}</p>
            </div>
            <form class="ds-col ds-g16" @submit="requestReset">
              <div>
                <label class="ds-label b00-label" for="reset-email">{{ i18nT("E-posta adresi") }}</label>
                <input id="reset-email" class="ds-field" name="email" type="email" autocomplete="email" required/>
              </div>
              <p v-if="error" class="ds-note err" role="alert"><TriangleAlert class="ds-i" :size="16"/><span>{{ i18nT(error) }}</span></p>
              <button :disabled="busy" class="ds-btn p lg b00-wide">{{ busy ? i18nT("İşleniyor…") : i18nT("Bağlantı gönder") }}</button>
            </form>
            <p v-if="sent" class="ds-note ok" role="status"><Check class="ds-i" :size="16"/><span>{{ i18nT("Bu adres kayıtlıysa bağlantı birkaç dakika içinde gelir.") }}</span></p>
            <p class="ds-xs ds-muted">{{ i18nT("Güvenlik için adresin kayıtlı olup olmadığını göstermiyoruz. İki adımlı doğrulama sıfırlamadan sonra da istenir.") }}</p>
          </template>
          <template v-else>
            <div class="ds-col ds-g6">
              <h2 class="ds-serif">{{ i18nT("İşletme hesabına giriş") }}</h2>
              <p class="ds-small ds-muted">{{ i18nT("Doğrulanmış şube üyeleri ve davet edilen çalışanlar içindir.") }}</p>
            </div>
            <template v-if="app.demo">
              <p class="ds-small ds-muted">{{ i18nT("Bu yerel geliştirme önizlemesinde gerçek hesap açılmaz. Demo hesabıyla araç ve bakım akışını deneyebilirsin.") }}</p>
              <button class="ds-btn p lg b00-wide" type="button" @click="enterDemo">{{ i18nT("Demo hesabıyla keşfet ") }}<ArrowRight :size="18"/></button>
              <p class="ds-xs ds-muted">{{ i18nT("Gerçek şifre veya kişisel belge girme. Kayıtlar yalnızca bu tarayıcıda saklanır.") }}</p>
            </template>
            <form v-else class="ds-col ds-g16" @submit="submit">
              <p v-if="error" class="ds-note err" role="alert">
                <TriangleAlert class="ds-i" :size="16"/>
                <span v-if="badCredentials"><b>{{ i18nT("E-posta veya şifre hatalı.") }}</b></span>
                <span v-else>{{ i18nT(error) }}</span>
              </p>
              <div>
                <label class="ds-label b00-label" for="business-email">{{ i18nT("E-posta adresi") }}</label>
                <input id="business-email" class="ds-field" name="email" type="email" autocomplete="email" required/>
              </div>
              <div>
                <label class="ds-label b00-label" for="business-password">{{ i18nT("Şifre") }}</label>
                <AuthPasswordField id="business-password" autocomplete="current-password" :invalid="badCredentials"/>
                <div class="ds-row ds-sb b00-under">
                  <span v-if="badCredentials" class="ds-xs ds-red">{{ i18nT("Şifreni kontrol et") }}</span>
                  <span v-else/>
                  <button class="b00-link" type="button" @click="show('forgot')">{{ i18nT("Şifremi unuttum") }}</button>
                </div>
              </div>
              <button :disabled="busy" class="ds-btn p lg b00-wide">{{ busy ? i18nT("İşleniyor…") : i18nT("Giriş yap") }}<ArrowRight v-if="!busy" :size="18"/></button>
              <div class="ds-row ds-g12"><span class="ds-divider ds-f1"/><span class="ds-xs ds-muted">{{ i18nT("veya") }}</span><span class="ds-divider ds-f1"/></div>
              <button type="button" class="ds-btn s lg b00-wide ds-passive" disabled aria-disabled="true" :title="i18nT('Yakında')"><Globe :size="18"/>{{ i18nT("Google ile devam et") }}</button>
              <p class="ds-note"><ShieldCheck class="ds-i" :size="16"/><span>{{ i18nT("Hesabında iki adımlı doğrulama açıksa girişte doğrulama kodu istenir.") }}</span></p>
            </form>
          </template>
        </section>
        <div v-if="!challenge && mode === 'login'" class="ds-col ds-g6 b00-signup">
          <span class="ds-small">{{ i18nT("Hesabın yok mu?") }}</span>
          <div class="ds-row ds-g12 ds-wrap b00-signup-actions">
            <NuxtLink class="ds-btn s sm" to="/isletme"><BadgeCheck :size="15"/>{{ i18nT("İşletmeni sahiplen") }}</NuxtLink>
            <NuxtLink class="ds-btn s sm" to="/isletme"><Plus :size="15"/>{{ i18nT("Yeni işletme ekle") }}</NuxtLink>
          </div>
          <p class="ds-xs ds-muted">{{ i18nT("İşletme hesabı, sahiplik başvurusu yönetim tarafından onaylanınca açılır. Başvuru otomatik yetki vermez.") }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.b00 {display: flex; min-height: 100dvh; background: #fff;}
p {margin: 0;}
.b00-story {position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: 40px; flex: 0 0 600px; padding: 48px 56px; overflow: hidden; background: #10243a; color: #fff;}
.b00-ring {position: absolute; border: 1px solid rgba(255, 255, 255, .06); border-radius: 50%; pointer-events: none;}
.b00-ring.one {left: 280px; top: -220px; width: 620px; height: 620px;}
.b00-ring.two {left: -200px; bottom: -220px; width: 420px; height: 420px;}
.b00-ring.three {left: 230px; top: -120px; width: 300px; height: 300px; border-color: rgba(255, 255, 255, .07);}
.b00-brand, .b00-pitch, .b00-legal {position: relative;}
.b00-badge {align-self: flex-start;}
.b00-brand .b00-badge {margin-top: 10px;}
.b00-pitch h1 {margin: 0; color: #fff; font-size: 44px; line-height: 46.2px;}
.b00-icon {display: grid; place-items: center; flex: none; width: 40px; height: 40px; border-radius: 12px; background: rgba(243, 107, 33, .16); color: #f36b21;}
.b00-feature {font-size: 15px; line-height: 22.5px;}
.b00-soft {color: #afc0d1;}
.b00-foot {color: #c7d1dc;}
.b00-fine {color: #7f93a8;}
.b00-compact {display: none;}
.b00-main {flex: 1; min-width: 0; display: flex; flex-direction: column; padding: 28px 48px 48px; background: #f4f6f8;}
.b00-top {justify-content: flex-end;}
.b00-center {flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 24px;}
.b00-card {width: 100%; max-width: 460px; padding: 36px; box-shadow: 0 18px 24px rgba(16, 36, 58, .1);}
h2 {margin: 0; font-size: 30px; line-height: 33.6px;}
.b00-tile {display: grid; place-items: center; width: 56px; height: 56px; border-radius: 16px;}
.b00-tile.info {background: #eaf0f8; color: #2459b4;}
.b00-label {display: block;}
input.ds-field:focus-visible {outline: 0; border-color: #2459b4; box-shadow: 0 0 0 1px #2459b4;}
.b00-under {padding-top: 6px;}
.b00-link {padding: 0; border: 0; background: none; color: #10243a; font-size: 12px; font-weight: 700; line-height: 18px;}
.b00-start {align-self: flex-start;}
.b00-wide {width: 100%;}
.b00-signup {align-items: center; max-width: 420px; padding-top: 24px; text-align: center;}
.b00-signup-actions {justify-content: center;}
@media (max-width: 1100px) {
  .b00-story {flex: 0 0 44%; padding: 40px 32px;}
  .b00-pitch h1 {font-size: 36px; line-height: 40px;}
  .b00-main {padding: 24px;}
}
@media (max-width: 760px) {
  .b00 {flex-direction: column;}
  .b00-story {display: none;}
  .b00-compact {position: relative; display: flex; flex-direction: column; gap: 12px; padding: 28px 20px 30px; overflow: hidden; background: #10243a;}
  .b00-compact p {color: #fff; font-size: 28px; font-weight: 700; line-height: 31.36px;}
  .b00-main {padding: 16px 20px 24px; background: #fff;}
  .b00-center {justify-content: flex-start; align-items: stretch; padding-top: 16px;}
  .b00-card {max-width: none; padding: 0; border: 0; box-shadow: none;}
  h2 {font-size: 22px; line-height: 28.6px;}
  .b00-signup {max-width: none;}
}
</style>
