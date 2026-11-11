<script setup lang="ts">
import {ref} from 'vue';
import {z} from 'zod';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {accountJson} from '@otosanayide/core/account-client';
import {garageRecycleAction, garageRecycleStatus, type GarageRecycleStatus} from '@otosanayide/core/garage-recycle';

const app = useApp();
const {t, locale} = useLocale();
const status = ref<GarageRecycleStatus | null>(null);
const pending = ref<ReturnType<typeof garageRecycleAction.parse> | null>(null);
const busy = ref(false);
const notice = ref('');
let mounted = true;
let lock = false;

useClientEffect(() => [], () => {
  mounted = true;
  return () => {
    mounted = false;
  };
});

async function perform(write: boolean) {
  if (lock) return;
  lock = true;
  busy.value = true;
  notice.value = '';
  try {
    if (app.demo) {
      notice.value = 'Önizlemede hesap yedeği değiştirilmez. Gerçek hesap ve bağlantı gerekir.';
      return;
    }
    const user = app.user;
    if (!user || !user.emailVerified) throw Error('unverified');
    const check = app.accountGuard(user.uid);
    let token = '';
    const input = write ? pending.value : undefined;
    if (write && !input) throw Error('missing_action');
    const result = await accountJson({
      guard: () => {
        check();
        if (!mounted) throw Error('unmounted');
      },
      token: async () => {
        token = await user.getIdToken();
        return token;
      },
      request: signal => apiFetch('/api/me/garage/lifecycle', {method: write ? 'POST' : 'GET', redirect: 'error', signal, headers: {Authorization: `Bearer ${token}`, 'Accept-Language': locale.value, ...(write ? {'Content-Type': 'application/json'} : {})}, ...(write ? {body: JSON.stringify(input)} : {})}),
      decode: raw => z.object({status: garageRecycleStatus}).strict().parse(raw),
    });
    result.check();
    status.value = result.value.status;
    pending.value = null;
    if (write) notice.value = input!.action === 'trash' ? 'Yedek geri dönüşüm kutusuna taşındı. Cihazındaki kayıtlar değişmedi.' : 'Yedek hesabına geri alındı. Cihazındaki kayıtlar değişmedi.';
  } catch {
    if (mounted) {
      status.value = null;
      pending.value = null;
      notice.value = 'Yedek durumu değişti veya bu işlem için uygun değil. Yeniden kontrol et.';
    }
  } finally {
    lock = false;
    if (mounted) busy.value = false;
  }
}

function checkStatus() {
  pending.value = null;
  status.value = null;
  void perform(false);
}

function prepare(action: 'trash' | 'restore') {
  notice.value = '';
  pending.value = garageRecycleAction.parse({action, expectedRevision: status.value!.revision, operationId: crypto.randomUUID(), acknowledged: true});
}
</script>

<template>
  <section class="ds-card ds-pad24 ds-col ds-g12" :aria-label="t('Hesap yedeğini yönet')">
    <h2>{{ t('Hesap yedeğini yönet') }}</h2>
    <p class="ds-small ds-muted">{{ t('Bu alan yalnız ayrı hesap yedeğini yönetir. Cihazdaki araçların, fotoğrafların, üyeliğin ve diğer hesap verilerin silinmez.') }}</p>
    <div><button type="button" class="ds-btn s" :disabled="busy" @click="checkStatus">{{ t('Yedek durumunu kontrol et') }}</button></div>
    <p v-if="status?.state==='shared'" class="ds-note info">{{ t('Ortak garajın etkin. Web ve mobilin kullandığı ana veriyi bu alandan kaldıramazsın. Hesap ve ortak garaj silme akışı henüz kullanıma açık değil.') }}</p>
    <p v-if="status?.state==='none'" class="ds-small ds-muted">{{ t('Kaldırılabilecek ayrı hesap yedeği yok.') }}</p>
    <template v-if="status&&['available','trashed','expired'].includes(status.state)">
      <p class="ds-small ds-b">{{ t('{vehicles} araç ve {records} bakım kaydı.',{vehicles:status.vehicles,records:status.records}) }}</p>
      <p v-if="status.purgeAfter" class="ds-small ds-muted">{{ t('Geri alma son tarihi: {date}',{date:new Date(status.purgeAfter).toLocaleString(locale==='en'?'en-GB':'tr-TR')}) }}</p>
      <div v-if="status.state==='available'&&!pending"><button type="button" class="ds-btn d" :disabled="busy" @click="prepare('trash')">{{ t('Yedeği geri dönüşüm kutusuna taşı') }}</button></div>
      <template v-if="status.state==='trashed'&&!pending"><p class="ds-note warn">{{ t('Yedek kutuda. Geri alma süresi dolana kadar hesaba yeni yedek yazılamaz ve ortak garaj etkinleştirilemez.') }}</p><div><button type="button" class="ds-btn s" :disabled="busy" @click="prepare('restore')">{{ t('Yedeği hesaba geri al') }}</button></div></template>
      <p v-if="status.state==='expired'" class="ds-note warn">{{ t('Geri alma süresi doldu. Kalıcı temizleme görevi tamamlanana kadar yeni hesap yedeği yazılamaz. Cihazdaki kayıtların kullanılabilir.') }}</p>
    </template>
    <div v-if="pending" class="confirm ds-col ds-g12">
      <h3>{{ t(pending.action==='trash'?'Yedeği kutuya taşıma onayı':'Yedeği geri alma onayı') }}</h3>
      <p class="ds-small">{{ t(pending.action==='trash'?'Hesaptaki metin yedeği 30 gün geri alınabilir olarak saklanır. Süre sonunda temizleme görevi yedek içeriğini kalıcı olarak kaldırır. Bu işlem cihazındaki kayıtları silmez.':'Kutudaki metin yedeği hesabına geri alınacak. Cihazına aktarım başlatılmaz.') }}</p>
      <p class="ds-small ds-b">{{ app.user?.email }}</p>
      <p class="ds-xs ds-muted">{{ t('Temizleme görevi henüz canlıda kurulmadı; 30. gün otomatik silme garantisi yoktur. Süre sonrasında geri alma kapalıdır.') }}</p>
      <div class="ds-row ds-g10 ds-wrap"><button type="button" class="ds-btn p" :disabled="busy" @click="void perform(true)">{{ t(pending.action==='trash'?'Onayla ve kutuya taşı':'Onayla ve hesaba geri al') }}</button><button type="button" class="ds-btn s" :disabled="busy" @click="pending=null">{{ t('Vazgeç') }}</button></div>
    </div>
    <p v-if="!!notice" class="ds-note" role="status">{{ t(notice) }}</p>
  </section>
</template>

<style scoped>
h2 {margin: 0; font: 700 19px/24.7px Arimo, Arial, sans-serif; letter-spacing: 0;}
h3 {margin: 0; font-size: 15px;}
p {margin: 0;}
.confirm {padding: 16px; border-radius: 12px; background: #f4f6f8;}
.ds-btn {max-width: 100%; white-space: normal;}
</style>
