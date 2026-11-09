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
  <section class="panel stack" :aria-label="t('Hesap yedeğini yönet')">
    <h2>{{ t('Hesap yedeğini yönet') }}</h2>
    <p class="muted">{{ t('Bu alan yalnız ayrı hesap yedeğini yönetir. Cihazdaki araçların, fotoğrafların, üyeliğin ve diğer hesap verilerin silinmez.') }}</p>
    <button class="button secondary" :disabled="busy" @click="checkStatus">{{ t('Yedek durumunu kontrol et') }}</button>
    <p v-if="status?.state==='shared'">{{ t('Ortak garajın etkin. Web ve mobilin kullandığı ana veriyi bu alandan kaldıramazsın. Hesap ve ortak garaj silme akışı henüz kullanıma açık değil.') }}</p>
    <p v-if="status?.state==='none'">{{ t('Kaldırılabilecek ayrı hesap yedeği yok.') }}</p>
    <template v-if="status&&['available','trashed','expired'].includes(status.state)">
      <p>{{ t('{vehicles} araç ve {records} bakım kaydı.',{vehicles:status.vehicles,records:status.records}) }}</p>
      <p v-if="status.purgeAfter">{{ t('Geri alma son tarihi: {date}',{date:new Date(status.purgeAfter).toLocaleString(locale==='en'?'en-GB':'tr-TR')}) }}</p>
      <button v-if="status.state==='available'&&!pending" class="button secondary" :disabled="busy" @click="prepare('trash')">{{ t('Yedeği geri dönüşüm kutusuna taşı') }}</button>
      <template v-if="status.state==='trashed'&&!pending"><p>{{ t('Yedek kutuda. Geri alma süresi dolana kadar hesaba yeni yedek yazılamaz ve ortak garaj etkinleştirilemez.') }}</p><button class="button secondary" :disabled="busy" @click="prepare('restore')">{{ t('Yedeği hesaba geri al') }}</button></template>
      <p v-if="status.state==='expired'">{{ t('Geri alma süresi doldu. Kalıcı temizleme görevi tamamlanana kadar yeni hesap yedeği yazılamaz. Cihazdaki kayıtların kullanılabilir.') }}</p>
    </template>
    <div v-if="pending" class="panel stack">
      <h3>{{ t(pending.action==='trash'?'Yedeği kutuya taşıma onayı':'Yedeği geri alma onayı') }}</h3>
      <p>{{ t(pending.action==='trash'?'Hesaptaki metin yedeği 30 gün geri alınabilir olarak saklanır. Süre sonunda temizleme görevi yedek içeriğini kalıcı olarak kaldırır. Bu işlem cihazındaki kayıtları silmez.':'Kutudaki metin yedeği hesabına geri alınacak. Cihazına aktarım başlatılmaz.') }}</p>
      <p>{{ app.user?.email }}</p>
      <p class="small muted">{{ t('Temizleme görevi henüz canlıda kurulmadı; 30. gün otomatik silme garantisi yoktur. Süre sonrasında geri alma kapalıdır.') }}</p>
      <button class="button primary" :disabled="busy" @click="void perform(true)">{{ t(pending.action==='trash'?'Onayla ve kutuya taşı':'Onayla ve hesaba geri al') }}</button>
      <button class="button secondary" :disabled="busy" @click="pending=null">{{ t('Vazgeç') }}</button>
    </div>
    <p v-if="!!notice" role="status">{{ t(notice) }}</p>
  </section>
</template>
