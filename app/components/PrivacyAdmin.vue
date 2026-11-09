<script setup lang="ts">
import {ref} from 'vue';
import {accountJson, AccountRequestError} from '@otosanayide/core/account-client';
import {privacyAdminAction, privacyQueueResponse, privacyLabels, privacyScopeLabels, privacyReasonLabels} from '@otosanayide/core/privacy-requests';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';

type Queue = ReturnType<typeof privacyQueueResponse.parse>;
type QueueStatus = 'submitted' | 'reviewing' | 'needs_confirmation';
type PendingAction = 'start_review' | 'request_confirmation';

const app = useApp();
const {t, locale} = useLocale();
const queue = ref<Queue | null>(null);
const status = ref<QueueStatus>('submitted');
const busy = ref(false);
const notice = ref('');
const pending = ref<{item: Queue['items'][number]; action: PendingAction} | null>(null);
const reason = ref('');
let active = true;
let lock = false;
const statuses = ['submitted', 'reviewing', 'needs_confirmation'] as const;

useClientEffect(() => [], () => {
  active = true;
  return () => {
    active = false;
  };
});

async function perform(after?: Queue['next'], write = false) {
  if (lock) return;
  lock = true;
  busy.value = true;
  notice.value = '';
  try {
    if (app.demo) {
      notice.value = 'Önizlemede veri talebi incelenmez. Ayrıcalıklı hesap ve gerçek bağlantı gerekir.';
      return;
    }
    const user = app.user;
    if (!user) throw Error('session');
    const check = app.accountGuard(user.uid);
    let token = '';
    const params = new URLSearchParams({status: status.value});
    if (after) params.set('after', JSON.stringify(after));
    let input: ReturnType<typeof privacyAdminAction.parse> | undefined;
    if (write) {
      if (!pending.value) throw Error('missing_action');
      input = privacyAdminAction.parse({requestId: pending.value.item.id, ownerUid: pending.value.item.ownerUid, expectedVersion: pending.value.item.version, operationId: crypto.randomUUID(), action: pending.value.action, ...(pending.value.action === 'request_confirmation' ? {reason: reason.value} : {})});
    }
    const result = await accountJson({
      guard: () => {
        check();
        if (!active) throw Error('unmounted');
      },
      token: async () => {
        token = await user.getIdToken();
        return token;
      },
      request: signal => apiFetch('/api/admin/privacy' + (write ? '' : '?' + params), {method: write ? 'POST' : 'GET', redirect: 'error', signal, headers: {Authorization: `Bearer ${token}`, 'Accept-Language': locale.value, ...(write ? {'Content-Type': 'application/json'} : {})}, ...(write ? {body: JSON.stringify(input)} : {})}),
      decode: raw => (write ? raw : privacyQueueResponse.parse(raw)),
    });
    result.check();
    if (write) {
      pending.value = null;
      queue.value = null;
      notice.value = 'İnceleme durumu güncellendi. Hiçbir veri silinmedi. Kuyruğu yeniden yükle.';
    } else queue.value = privacyQueueResponse.parse(result.value);
  } catch (error) {
    if (active) {
      queue.value = null;
      pending.value = null;
      notice.value = error instanceof AccountRequestError && error.status === 428 ? 'Güvenlik için çıkış yapıp tekrar giriş yap. Sonra talebini yeniden kontrol et.' : 'Veri talebi kuyruğu yüklenemedi veya durumu değişti. Yetkini ve bağlantını kontrol et.';
    }
  } finally {
    lock = false;
    if (active) busy.value = false;
  }
}

function changeStatus(e: Event) {
  status.value = (e.target as HTMLSelectElement).value as QueueStatus;
  queue.value = null;
  pending.value = null;
}

function prepare(item: Queue['items'][number], action: PendingAction) {
  reason.value = '';
  pending.value = {item, action};
}
</script>

<template>
  <section class="panel stack">
    <h2>{{ t('Veri talepleri') }}</h2>
    <p class="muted">{{ t('Bu ekran yalnız silme taleplerinin kapsam incelemesini yönetir. Kalıcı silme çalıştırmaz; tamamlandı veya silindi kararı verilemez.') }}</p>
    <label>{{ t('Talep durumu') }}<select :value="status" :disabled="busy" @change="changeStatus"><option v-for="s in statuses" :key="s" :value="s">{{ t(privacyLabels[s]) }}</option></select></label>
    <button class="button secondary" :disabled="busy" @click="void perform()">{{ t('Kuyruğu yükle') }}</button>
    <p v-if="queue&&queue.items.length===0">{{ t('Bu durumda bekleyen talep yok.') }}</p>
    <article v-for="item in queue?.items" :key="item.id" class="panel stack">
      <h3>{{ t(privacyScopeLabels[item.scope]) }}</h3>
      <p>{{ t(privacyLabels[item.status]) }} · {{ t('Sürüm') }} {{ item.version }}</p>
      <p class="small muted" :style="{overflowWrap:'anywhere'}">{{ t('Hesap referansı') }}: {{ item.ownerUid }} · {{ item.id }}</p>
      <p v-if="item.reason">{{ t(privacyReasonLabels[item.reason]) }}</p>
      <button v-if="item.status==='submitted'" class="button secondary" :disabled="busy||!!pending" @click="prepare(item,'start_review')">{{ t('İncelemeye al') }}</button>
      <button v-if="item.status==='reviewing'" class="button secondary" :disabled="busy||!!pending" @click="prepare(item,'request_confirmation')">{{ t('Kullanıcıdan kapsam onayı iste') }}</button>
    </article>
    <button v-if="queue?.next" class="button secondary" :disabled="busy||!!pending" @click="void perform(queue!.next)">{{ t('Sonraki talepler') }}</button>
    <section v-if="pending" class="panel stack">
      <h3>{{ t('İnceleme işlemini onayla') }}</h3>
      <p>{{ t(privacyScopeLabels[pending.item.scope]) }}</p>
      <p>{{ t('Bu işlem yalnız talebin durumunu değiştirir; verileri silmez.') }}</p>
      <label v-if="pending.action==='request_confirmation'">{{ t('Kapsam onayı gerekçesi') }}<select v-model="reason" :disabled="busy"><option value="">{{ t('Gerekçe seç') }}</option><option v-for="[key,value] in Object.entries(privacyReasonLabels)" :key="key" :value="key">{{ t(value) }}</option></select></label>
      <button class="button primary" :disabled="busy||pending.action==='request_confirmation'&&!reason" @click="void perform(undefined,true)">{{ t('Onayla ve durumu güncelle') }}</button>
      <button class="button secondary" :disabled="busy" @click="pending=null">{{ t('Vazgeç') }}</button>
    </section>
    <p v-if="!!notice" role="status">{{ t(notice) }}</p>
  </section>
</template>
