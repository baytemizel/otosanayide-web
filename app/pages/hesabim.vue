<script setup lang="ts">
import {computed, nextTick, onMounted, reactive, ref} from 'vue';
import {ArrowRight, BadgeCheck, Check, Clock, Download, KeyRound, Mail, RotateCcw, ShieldCheck, TriangleExclamationPoint} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import V2Modal from '~/components/v2/V2Modal.vue';
import AccountPrefsList from '~/components/v2/requests/AccountPrefsList.vue';
import V2AccountMenu from '~/components/v2/V2AccountMenu.vue';
import {useMemberPage} from '~/composables/useMemberPage';
import {useSession} from '~/composables/useSession';
import {useAccountSecurity, useDataExports, usePrivacyRequest} from '~/composables/v2/useAccountData';
import {privacyLabels, privacyReasonLabels, privacyScopeLabels} from '@otosanayide/core/privacy-requests';
import {ACCOUNT_DELETE_GRACE_DAYS, mockDataExport} from '~/data/mock/requests';
import {demoMode} from '~/lib/env';
import {longDate} from '~/lib/v2/requests';

// W18 · Hesabım · Gizlilik, veri talebi ve silme (Figma 127:1042). Deletion needs a confirmation modal.
// Demo: the data copy request and the deletion request change local state; nothing is sent.
// Live: preferences (web-09), data-copy requests (web-10, prepared by hand, no download), deletion
// requests (/api/me/privacy; reviewed, not executed automatically) and, live only, the e-mail /
// password change and two-step status from the session service.
useMemberPage();
const demo = demoMode();
const session = useSession();

useSeoMeta({title: 'Gizlilik ve veri', robots: 'noindex, nofollow'});

// This page renders client-side, so a deep link such as /hesabim#veri (footer) is scrolled to after mount.
const route = useRoute();
onMounted(async () => {
  if (!route.hash) return;
  await nextTick();
  document.getElementById(decodeURIComponent(route.hash.slice(1)))?.scrollIntoView({block: 'start'});
});

const exportState = ref(mockDataExport.status);
function requestExport() {
  exportState.value = 'preparing';
}

const deleteOpen = ref(false);
const deleteUnderstood = ref(false);
const deleteRequested = ref(false);
const deleteUntil = computed(() => {
  const date = new Date();
  date.setDate(date.getDate() + ACCOUNT_DELETE_GRACE_DAYS);
  return date.toLocaleDateString('tr-TR', {day: 'numeric', month: 'long', year: 'numeric'});
});

function openDelete() {
  deleteUnderstood.value = false;
  deleteOpen.value = true;
}
async function confirmDelete() {
  if (!deleteUnderstood.value) return;
  if (!demo) {
    if (await privacy.submit(deleteScope.value)) deleteOpen.value = false;
    return;
  }
  deleteOpen.value = false;
  deleteRequested.value = true;
}

/* ---------------------------------------------------------------- live */
const exportsLive = useDataExports();
const privacy = usePrivacyRequest();
const deleteScope = ref<'garage' | 'account'>('account');
const privacyActive = computed(() => !!privacy.request.value && privacy.request.value.status !== 'cancelled');
const security = useAccountSecurity();
const emailForm = reactive({newEmail: '', password: '', code: ''});
const passwordForm = reactive({current: '', next: '', code: ''});
async function changeEmail() {
  if (await security.changeEmail(emailForm.newEmail, emailForm.password, emailForm.code.trim())) Object.assign(emailForm, {newEmail: '', password: '', code: ''});
}
async function changePassword() {
  if (await security.changePassword(passwordForm.current, passwordForm.next, passwordForm.code.trim())) Object.assign(passwordForm, {current: '', next: '', code: ''});
}
</script>

<template>
  <div id="gizlilik" class="account v2-wrap">
    <V2AccountMenu active="gizlilik"/>

    <div class="col">
      <header class="titles">
        <p class="t-mono-md t-eyebrow">HESABIM</p>
        <h1 class="t-h2">Gizlilik ve veri</h1>
      </header>

      <section v-if="!demo" id="guvenlik" class="card security" aria-labelledby="security-title" :aria-busy="!!security.busy.value">
        <h2 id="security-title" class="t-h4">Hesap ve güvenlik</h2>
        <div class="sec-row">
          <Mail :size="20" aria-hidden="true"/>
          <div class="sec-copy">
            <span class="t-label-md">E-posta adresi</span>
            <span class="t-body-sm t-muted mail">{{ session.email.value }}</span>
          </div>
          <span v-if="session.emailVerified.value" class="tag tag-lime"><BadgeCheck :size="14" aria-hidden="true"/>Doğrulandı</span>
          <span v-else class="tag tag-orange">Doğrulanmadı</span>
        </div>
        <div class="sec-row">
          <ShieldCheck :size="20" aria-hidden="true"/>
          <div class="sec-copy">
            <span class="t-label-md">İki adımlı doğrulama</span>
            <span class="t-body-sm t-muted">{{ security.totp.value === 'unknown' ? 'Durum okunamadı.' : 'Girişte kimlik doğrulama uygulamasındaki 6 haneli kod da istenir.' }}</span>
          </div>
          <span v-if="security.totp.value === 'on'" class="tag tag-lime">Etkin</span>
          <span v-else-if="security.totp.value === 'off'" class="tag tag-cream">Kapalı</span>
        </div>
        <p v-if="security.message.value" class="sec-msg t-body-sm" :class="security.message.value.tone" :role="security.message.value.tone === 'err' ? 'alert' : 'status'">{{ security.message.value.text }}</p>
        <div class="sec-forms">
          <form class="sec-form" @submit.prevent="changeEmail">
            <h3 class="t-label-md"><Mail :size="16" aria-hidden="true"/>E-posta adresini değiştir</h3>
            <label class="field"><span class="field-label">Yeni e-posta</span><input v-model="emailForm.newEmail" class="input" type="email" autocomplete="email" required maxlength="254"></label>
            <label class="field"><span class="field-label">Mevcut şifre</span><input v-model="emailForm.password" class="input" type="password" autocomplete="current-password" required></label>
            <label v-if="security.totp.value !== 'off'" class="field"><span class="field-label">Doğrulama kodu (iki adımlı doğrulama açıksa)</span><input v-model="emailForm.code" class="input" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6"></label>
            <V2Button type="submit" variant="outline" size="sm" :disabled="!!security.busy.value || !emailForm.newEmail || !emailForm.password">{{ security.busy.value === 'email' ? 'Gönderiliyor…' : 'Onay bağlantısı gönder' }}</V2Button>
          </form>
          <form class="sec-form" @submit.prevent="changePassword">
            <h3 class="t-label-md"><KeyRound :size="16" aria-hidden="true"/>Şifreni değiştir</h3>
            <label class="field"><span class="field-label">Mevcut şifre</span><input v-model="passwordForm.current" class="input" type="password" autocomplete="current-password" required></label>
            <label class="field"><span class="field-label">Yeni şifre (en az 10 karakter)</span><input v-model="passwordForm.next" class="input" type="password" autocomplete="new-password" minlength="10" required></label>
            <label v-if="security.totp.value !== 'off'" class="field"><span class="field-label">Doğrulama kodu (iki adımlı doğrulama açıksa)</span><input v-model="passwordForm.code" class="input" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6"></label>
            <V2Button type="submit" variant="outline" size="sm" :disabled="!!security.busy.value || !passwordForm.current || passwordForm.next.length < 10">{{ security.busy.value === 'password' ? 'Kaydediliyor…' : 'Şifreyi güncelle' }}</V2Button>
          </form>
        </div>
      </section>

      <section class="card prefs-card" aria-labelledby="prefs-title">
        <h2 id="prefs-title" class="t-h4">Bildirim ve iletişim tercihleri</h2>
        <AccountPrefsList/>
      </section>

      <section id="veri" class="card export" aria-labelledby="export-title">
        <span class="export-icon" aria-hidden="true"><Download :size="24"/></span>
        <div v-if="demo" class="export-copy">
          <h2 id="export-title" class="t-h4">Verilerini indir</h2>
          <p class="t-body-sm t-muted">Hesap, araç, yorum ve talep kayıtlarının kopyasını hazırlarız.</p>
          <span v-if="exportState === 'ready'" class="tag tag-lime state"><Check :size="14" class="ok" aria-hidden="true"/>Son talep: hazır · {{ mockDataExport.lastRequest }}</span>
          <span v-else class="tag tag-orange state" role="status"><Clock :size="14" aria-hidden="true"/>Yeni kopya hazırlanıyor · hazır olunca e-posta gelir</span>
        </div>
        <V2Button v-if="demo" variant="dark" :disabled="exportState === 'preparing'" @click="requestExport">
          {{ exportState === 'preparing' ? 'Talep alındı' : 'Veri kopyası iste' }}<ArrowRight v-if="exportState === 'ready'" aria-hidden="true"/>
        </V2Button>
        <div v-if="!demo" class="export-copy" :aria-busy="exportsLive.loading.value">
          <h2 id="export-title" class="t-h4">Verilerinin kopyası</h2>
          <p class="t-body-sm t-muted">Hesap, araç, yorum ve talep kayıtlarının kopyasını isteyebilirsin. Kopya otomatik üretilmez: bir görevli hazırlar ve teslim eder; bu sayfada indirme yoktur.</p>
          <p v-if="exportsLive.loading.value" class="t-body-sm t-muted" role="status">Talepler yükleniyor…</p>
          <span v-else-if="exportsLive.summary.value.latest" class="tag state" :class="`tag-${exportsLive.summary.value.tone}`" role="status">
            <Check v-if="exportsLive.summary.value.latest.status === 'delivered'" :size="14" class="ok" aria-hidden="true"/><Clock v-else :size="14" aria-hidden="true"/>Son talep: {{ exportsLive.summary.value.label }}
          </span>
          <span v-else-if="exportsLive.loaded.value" class="t-body-sm t-muted">Henüz veri kopyası istemedin.</span>
          <p v-if="exportsLive.done.value" class="t-body-sm ok-text" role="status">{{ exportsLive.done.value }}</p>
          <p v-if="exportsLive.error.value" class="t-body-sm err-text" role="alert">{{ exportsLive.error.value }}</p>
        </div>
        <div v-if="!demo" class="export-actions">
          <V2Button variant="dark" :disabled="exportsLive.busy.value || exportsLive.loading.value || exportsLive.summary.value.open" @click="exportsLive.request()">
            {{ exportsLive.busy.value ? 'Gönderiliyor…' : exportsLive.summary.value.open ? 'Talep alındı' : 'Veri kopyası iste' }}
          </V2Button>
          <V2Button v-if="exportsLive.summary.value.latest?.status === 'submitted'" variant="ghost" size="sm" :disabled="exportsLive.busy.value" @click="exportsLive.cancel(exportsLive.summary.value.latest!)">Talebi iptal et</V2Button>
        </div>
      </section>

      <section class="card danger" aria-labelledby="delete-title">
        <h2 id="delete-title" class="t-h4 danger-title">Hesabı sil</h2>
        <template v-if="!demo">
          <p v-if="privacy.loading.value" class="t-body-sm t-muted" role="status">Talep durumu yükleniyor…</p>
          <template v-else-if="privacyActive && privacy.request.value">
            <div class="requested" role="status">
              <p class="t-label-md">{{ privacyLabels[privacy.request.value.status] }} · {{ privacyScopeLabels[privacy.request.value.scope] }}</p>
              <p class="t-body-sm body">Talep tarihi: {{ longDate(privacy.request.value.createdAtMs) }}. Talep incelenir; verilerin henüz silinmedi ve şu anda otomatik kalıcı silme yapılmaz.</p>
              <p v-if="privacy.request.value.reason" class="t-body-sm body">{{ privacyReasonLabels[privacy.request.value.reason] }}</p>
              <div class="row-actions">
                <V2Button v-if="privacy.request.value.status === 'needs_confirmation'" variant="dark" size="sm" :disabled="privacy.busy.value" @click="privacy.confirm()">Kapsamı tekrar onayla</V2Button>
                <V2Button variant="outline" size="sm" :disabled="privacy.busy.value" @click="privacy.cancel()"><RotateCcw aria-hidden="true"/>Talebi iptal et</V2Button>
              </div>
            </div>
          </template>
          <template v-else-if="privacy.loaded.value">
            <p class="t-body-sm body">Silme talebi oluşturabilir, durumunu takip edebilir ve iptal edebilirsin. Talep vermek verileri hemen silmez; işletme yetkileri, yorumlar ve ödeme kayıtları kapsamına göre ayrıca incelenir.</p>
            <button type="button" class="btn btn-danger-outline" aria-haspopup="dialog" :disabled="privacy.busy.value" @click="openDelete">Silme talebi oluştur</button>
          </template>
          <p v-if="privacy.notice.value" class="t-body-sm ok-text" role="status">{{ privacy.notice.value }}</p>
          <p v-if="privacy.error.value && !deleteOpen" class="t-body-sm err-text" role="alert">{{ privacy.error.value }}</p>
        </template>
        <template v-else-if="!deleteRequested">
          <p class="t-body-sm body">Silme talebinden sonra {{ ACCOUNT_DELETE_GRACE_DAYS }} gün içinde geri alabilirsin. Süre dolunca hesabın ve kayıtların kalıcı olarak silinir.</p>
          <p class="warn t-body-sm"><TriangleExclamationPoint :size="18" aria-hidden="true"/>Aktif randevun veya işletme yönetici rolün varsa önce bunları kapatman gerekir.</p>
          <button type="button" class="btn btn-danger-outline" aria-haspopup="dialog" @click="openDelete">Hesap silme talebi oluştur</button>
        </template>
        <div v-else class="requested" role="status">
          <p class="t-label-md">Silme talebin alındı.</p>
          <p class="t-body-sm body">Hesabın {{ deleteUntil }} tarihine kadar geri alınabilir durumda. Bu sürede giriş yapıp talebi geri alabilirsin; süre dolunca hesabın ve kayıtların kalıcı olarak silinir.</p>
          <V2Button variant="outline" size="sm" @click="deleteRequested = false"><RotateCcw aria-hidden="true"/>Talebi geri al</V2Button>
        </div>
      </section>
    </div>

    <V2Modal :open="deleteOpen" title="Hesabını silmek istiyor musun?" subtitle="Bu işlem bir silme talebi oluşturur." :width="560" @close="deleteOpen = false">
      <template v-if="!demo">
        <fieldset class="scopes">
          <legend class="field-label">İncelenecek kapsam</legend>
          <label v-for="value in (['account', 'garage'] as const)" :key="value" class="option"><input v-model="deleteScope" type="radio" name="silme-kapsam" :value="value" class="radio"><span>{{ privacyScopeLabels[value] }}</span></label>
        </fieldset>
        <ul class="consequences t-body-sm">
          <li>Talep vermek verileri hemen silmez; ekip kapsamı inceler. Şu anda otomatik kalıcı silme yapılmaz.</li>
          <li>Cihazdaki garaj ve fotoğraflar bu taleple silinmez. İşletme yetkileri, yorumlar ve ödeme kayıtları ayrıca incelenir.</li>
          <li>İnceleme bitmeden bu sayfadan talebi iptal edebilirsin.</li>
        </ul>
        <p class="t-body-sm"><b>{{ session.email.value }}</b></p>
        <p v-if="privacy.error.value" class="t-body-sm err-text" role="alert">{{ privacy.error.value }}</p>
      </template>
      <ul v-else class="consequences t-body-sm">
        <li>Profilin, araçların, hatırlatmaların ve kayıtlı listelerin {{ ACCOUNT_DELETE_GRACE_DAYS }} gün sonra kalıcı olarak silinir.</li>
        <li>Yayınlanan yorumların anonimleştirilir.</li>
        <li>{{ ACCOUNT_DELETE_GRACE_DAYS }} gün içinde giriş yaparak talebi geri alabilirsin.</li>
      </ul>
      <label class="option confirm">
        <input v-model="deleteUnderstood" type="checkbox" class="checkbox">
        <span>{{ demo ? 'Anladım, hesap silme talebi oluşturmak istiyorum.' : 'Kapsamı ve henüz kalıcı silme yapılmadığını anladım.' }}</span>
      </label>
      <template #footer>
        <V2Button variant="outline" @click="deleteOpen = false">Vazgeç</V2Button>
        <button type="button" class="btn btn-danger" :disabled="!deleteUnderstood || privacy.busy.value" @click="confirmDelete">{{ privacy.busy.value ? 'Gönderiliyor…' : 'Silme talebini onayla' }}</button>
      </template>
    </V2Modal>
  </div>
</template>

<style scoped>
.account{display:flex;align-items:flex-start;gap:32px;padding-top:40px;padding-bottom:104px}
.col{flex:1 1 0;min-width:0;display:flex;flex-direction:column;gap:24px}
.titles{display:flex;flex-direction:column;gap:10px}
.card{background:var(--white);border:1px solid var(--cream-200);border-radius:28px;padding:28px;scroll-margin-top:110px}
.prefs-card{display:flex;flex-direction:column;gap:6px}

.export{display:flex;align-items:center;gap:20px}
.export-icon{width:56px;height:56px;flex:none;border-radius:999px;background:var(--lime-100);color:var(--ink-900);display:grid;place-items:center}
.export-copy{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:8px}
.state{padding:6px 12px 6px 9px;white-space:normal}
.ok{color:var(--green-500)}

.danger{display:flex;flex-direction:column;align-items:flex-start;gap:16px;border-color:rgba(229,72,77,.35)}
.danger-title{color:var(--red-500)}
.body{color:var(--ink-700);max-width:820px}
.warn{display:flex;align-items:center;gap:10px;width:100%;padding:14px;border-radius:18px;background:var(--orange-100);color:var(--ink-800)}
.warn svg{flex:none;color:var(--orange-600)}
.btn-danger-outline{border-color:var(--red-500);color:var(--red-500)}
.btn-danger-outline:hover{background:rgba(229,72,77,.06)}
.requested{display:flex;flex-direction:column;align-items:flex-start;gap:10px;width:100%;padding:18px;border-radius:18px;background:var(--cream-50);border:1px solid var(--cream-200)}

.security{display:flex;flex-direction:column;gap:16px}
.sec-row{display:flex;align-items:center;gap:14px}
.sec-row > svg{flex:none;color:var(--ink-500)}
.sec-copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.mail{overflow-wrap:anywhere}
.sec-msg{padding:12px 14px;border-radius:14px;background:var(--cream-50)}
.sec-msg.err{color:var(--red-500);font-weight:600}
.sec-msg.ok{color:var(--green-500);font-weight:600}
.sec-forms{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding-top:8px;border-top:1px solid var(--cream-200)}
.sec-form{display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding-top:12px}
.sec-form h3{display:flex;align-items:center;gap:8px}
.sec-form .field{width:100%}
.export-actions{display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex:none}
.ok-text{color:var(--green-500);font-weight:600}
.err-text{color:var(--red-500);font-weight:600}
.row-actions{display:flex;flex-wrap:wrap;gap:8px}
.scopes{display:flex;flex-direction:column;gap:10px;border:0;margin:0;padding:0}
.scopes legend{margin-bottom:8px}
.consequences{display:flex;flex-direction:column;gap:8px;padding-left:18px;list-style:disc;color:var(--ink-700)}
.confirm{align-items:flex-start;font-size:14px;line-height:1.45}
.btn-danger{background:var(--red-500);color:var(--white)}

@media (max-width:1000px){
  .account{flex-direction:column;align-items:stretch;gap:24px;padding-top:24px}
}
@media (max-width:760px){
  .account{padding-bottom:64px}
  .card{padding:22px}
  .export{flex-direction:column;align-items:flex-start}
  .export-actions{align-items:flex-start}
  .sec-forms{grid-template-columns:1fr}
  .warn{align-items:flex-start}
}
</style>
