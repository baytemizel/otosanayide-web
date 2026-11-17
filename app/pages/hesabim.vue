<script setup lang="ts">
import {computed, nextTick, onMounted, ref} from 'vue';
import {ArrowRight, Check, Clock, Download, RotateCcw, TriangleExclamationPoint} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import V2Modal from '~/components/v2/V2Modal.vue';
import AccountPrefsList from '~/components/v2/requests/AccountPrefsList.vue';
import V2AccountMenu from '~/components/v2/V2AccountMenu.vue';
import {useMockSession} from '~/composables/useMockSession';
import {ACCOUNT_DELETE_GRACE_DAYS, mockDataExport} from '~/data/mock/requests';

// W18 · Hesabım · Gizlilik, veri talebi ve silme (Figma 127:1042). Mock only: the data copy request and
// the deletion request change local state; nothing is sent. Deletion needs a confirmation modal.
const session = useMockSession();
if (!session.signedIn.value) session.signIn();

useSeoMeta({title: 'Gizlilik ve veri'});

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
function confirmDelete() {
  if (!deleteUnderstood.value) return;
  deleteOpen.value = false;
  deleteRequested.value = true;
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

      <section class="card prefs-card" aria-labelledby="prefs-title">
        <h2 id="prefs-title" class="t-h4">Bildirim ve iletişim tercihleri</h2>
        <AccountPrefsList/>
      </section>

      <section id="veri" class="card export" aria-labelledby="export-title">
        <span class="export-icon" aria-hidden="true"><Download :size="24"/></span>
        <div class="export-copy">
          <h2 id="export-title" class="t-h4">Verilerini indir</h2>
          <p class="t-body-sm t-muted">Hesap, araç, yorum ve talep kayıtlarının kopyasını hazırlarız.</p>
          <span v-if="exportState === 'ready'" class="tag tag-lime state"><Check :size="14" class="ok" aria-hidden="true"/>Son talep: hazır · {{ mockDataExport.lastRequest }}</span>
          <span v-else class="tag tag-orange state" role="status"><Clock :size="14" aria-hidden="true"/>Yeni kopya hazırlanıyor · hazır olunca e-posta gelir</span>
        </div>
        <V2Button variant="dark" :disabled="exportState === 'preparing'" @click="requestExport">
          {{ exportState === 'preparing' ? 'Talep alındı' : 'Veri kopyası iste' }}<ArrowRight v-if="exportState === 'ready'" aria-hidden="true"/>
        </V2Button>
      </section>

      <section class="card danger" aria-labelledby="delete-title">
        <h2 id="delete-title" class="t-h4 danger-title">Hesabı sil</h2>
        <template v-if="!deleteRequested">
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
      <ul class="consequences t-body-sm">
        <li>Profilin, araçların, hatırlatmaların ve kayıtlı listelerin {{ ACCOUNT_DELETE_GRACE_DAYS }} gün sonra kalıcı olarak silinir.</li>
        <li>Yayınlanan yorumların anonimleştirilir.</li>
        <li>{{ ACCOUNT_DELETE_GRACE_DAYS }} gün içinde giriş yaparak talebi geri alabilirsin.</li>
      </ul>
      <label class="option confirm">
        <input v-model="deleteUnderstood" type="checkbox" class="checkbox">
        <span>Anladım, hesap silme talebi oluşturmak istiyorum.</span>
      </label>
      <template #footer>
        <V2Button variant="outline" @click="deleteOpen = false">Vazgeç</V2Button>
        <button type="button" class="btn btn-danger" :disabled="!deleteUnderstood" @click="confirmDelete">Silme talebini onayla</button>
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
  .warn{align-items:flex-start}
}
</style>
