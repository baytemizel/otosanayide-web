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
  <section class="ds-card ds-pad24 ds-col ds-g16">
    <div class="ds-col ds-g4">
      <h3 style="margin:0">{{ t('Veri talepleri') }}</h3>
      <div class="ds-small ds-muted">{{ t('Bu ekran yalnız silme taleplerinin kapsam incelemesini yönetir. Kalıcı silme çalıştırmaz; tamamlandı veya silindi kararı verilemez.') }}</div>
    </div>
    <div class="ds-row ds-wrap ds-g12" style="align-items:flex-end">
      <label class="ds-col ds-f1" style="max-width:320px;min-width:200px"><span class="ds-label">{{ t('Talep durumu') }}</span><select class="ds-field" :value="status" :disabled="busy" @change="changeStatus"><option v-for="s in statuses" :key="s" :value="s">{{ t(privacyLabels[s]) }}</option></select></label>
      <button class="ds-btn s" :disabled="busy" @click="void perform()">{{ t('Kuyruğu yükle') }}</button>
    </div>
    <div v-if="queue&&queue.items.length===0" class="ds-small ds-muted">{{ t('Bu durumda bekleyen talep yok.') }}</div>
    <article v-for="item in queue?.items" :key="item.id" class="ds-card ds-pad16 ds-col ds-g8">
      <h4 style="font-size:16px;margin:0">{{ t(privacyScopeLabels[item.scope]) }}</h4>
      <div class="ds-row ds-wrap ds-g8"><span class="ds-badge neu">{{ t(privacyLabels[item.status]) }}</span><span class="ds-xs ds-muted">{{ t('Sürüm') }} {{ item.version }}</span></div>
      <div class="ds-xs ds-muted" :style="{overflowWrap:'anywhere'}">{{ t('Hesap referansı') }}: {{ item.ownerUid }} · {{ item.id }}</div>
      <div v-if="item.reason" class="ds-small">{{ t(privacyReasonLabels[item.reason]) }}</div>
      <div v-if="item.status==='submitted'||item.status==='reviewing'">
        <button v-if="item.status==='submitted'" class="ds-btn s sm" :disabled="busy||!!pending" @click="prepare(item,'start_review')">{{ t('İncelemeye al') }}</button>
        <button v-if="item.status==='reviewing'" class="ds-btn s sm" :disabled="busy||!!pending" @click="prepare(item,'request_confirmation')">{{ t('Kullanıcıdan kapsam onayı iste') }}</button>
      </div>
    </article>
    <div v-if="queue?.next"><button class="ds-btn s sm" :disabled="busy||!!pending" @click="void perform(queue!.next)">{{ t('Sonraki talepler') }}</button></div>
    <section v-if="pending" class="ds-card ds-surface ds-pad16 ds-col ds-g12">
      <h4 style="font-size:16px;margin:0">{{ t('İnceleme işlemini onayla') }}</h4>
      <div class="ds-small">{{ t(privacyScopeLabels[pending.item.scope]) }}</div>
      <div class="ds-small ds-muted">{{ t('Bu işlem yalnız talebin durumunu değiştirir; verileri silmez.') }}</div>
      <label v-if="pending.action==='request_confirmation'" class="ds-col"><span class="ds-label">{{ t('Kapsam onayı gerekçesi') }}</span><select v-model="reason" class="ds-field" :disabled="busy"><option value="">{{ t('Gerekçe seç') }}</option><option v-for="[key,value] in Object.entries(privacyReasonLabels)" :key="key" :value="key">{{ t(value) }}</option></select></label>
      <div class="ds-row ds-wrap ds-g10">
        <button class="ds-btn n" :disabled="busy||pending.action==='request_confirmation'&&!reason" @click="void perform(undefined,true)">{{ t('Onayla ve durumu güncelle') }}</button>
        <button class="ds-btn s" :disabled="busy" @click="pending=null">{{ t('Vazgeç') }}</button>
      </div>
    </section>
    <div v-if="!!notice" class="ds-note" role="status">{{ t(notice) }}</div>
  </section>
</template>

<style scoped>
@media(max-width:480px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;text-align:center}}
</style>
