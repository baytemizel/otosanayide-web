<script setup lang="ts">
import {ref} from 'vue';
import {Cloud, RefreshCw} from '@lucide/vue';
import {z} from 'zod';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {accountJson, AccountRequestError} from '@otosanayide/core/account-client';

const previewSchema = z.object({active: z.boolean(), revision: z.number().int().nonnegative(), vehicles: z.number().int().nonnegative().max(50), records: z.number().int().nonnegative().max(2000), fingerprint: z.string().regex(/^[a-f0-9]{64}$/)}).strict();

const {t} = useLocale();
const app = useApp();
const preview = ref<z.infer<typeof previewSchema> | null>(null);
const busy = ref(false);
const ack = ref(false);
const error = ref('');
let pending: {operationId: string} | null = null;
let active = true;
let lock = false;

useClientEffect(() => [], () => {
  active = true;
  return () => {
    active = false;
  };
});

async function perform(write: boolean) {
  if (lock) return;
  lock = true;
  busy.value = true;
  error.value = '';
  try {
    if (app.demo) {
      await app.refresh();
      if (active) error.value = 'Önizlemede bulut geçişi yapılmaz. Gerçek hesap ve bağlantı gerekir.';
      return;
    }
    const user = app.user;
    if (!user) throw Error('session');
    const check = app.accountGuard(user.uid);
    let token = '';
    const result = await accountJson({
      guard: () => {
        check();
        if (!active) throw Error('unmounted');
      },
      token: async () => {
        token = await user.getIdToken();
        return token;
      },
      request: signal => apiFetch('/api/me/garage/migrate', {method: write ? 'POST' : 'GET', signal, headers: {Authorization: `Bearer ${token}`, ...(write ? {'Content-Type': 'application/json'} : {})}, ...(write ? {body: JSON.stringify({expectedRevision: preview.value!.revision, fingerprint: preview.value!.fingerprint, operationId: pending!.operationId, acknowledged: true})} : {})}),
      decode: raw => previewSchema.parse(raw),
    });
    result.check();
    preview.value = result.value;
    if (write) {
      pending = null;
      ack.value = false;
      await app.refresh();
    }
  } catch (failure) {
    if (active) {
      if (failure instanceof AccountRequestError && failure.status === 409) {
        preview.value = null;
        ack.value = false;
        pending = null;
      }
      error.value = failure instanceof AccountRequestError && failure.status === 503 ? 'Ortak garaj geçişi henüz etkin değil.' : 'Garaj kayıtları değişti veya birleştirilemiyor. Önizlemeyi yeniden yükle.';
    }
  } finally {
    lock = false;
    if (active) busy.value = false;
  }
}

function reloadRecords() {
  preview.value = null;
  ack.value = false;
  pending = null;
  void app.refresh().catch(() => {
    error.value = 'Hesap verileri yüklenemedi.';
  });
}

function startPreview() {
  pending = null;
  ack.value = false;
  void perform(false);
}

function confirm() {
  pending ??= {operationId: crypto.randomUUID()};
  void perform(true);
}
</script>

<template>
  <section class="ds-card ds-pad ds-col ds-g10" :aria-label="t('Web ve mobil ortak garaj')">
    <div class="ds-row ds-sb ds-wrap ds-g8"><h2 class="ds-row ds-g8 title"><Cloud :size="18"/>{{ t('Web ve mobil ortak garaj') }}</h2><button type="button" class="ds-btn s sm" :disabled="busy" @click="reloadRecords"><RefreshCw :size="15"/>{{ t('Kayıtları yenile') }}</button></div>
    <p class="ds-xs ds-muted">{{ t('Aynı hesaptaki araç ve bakım metinlerini web ve mobilde birlikte yönet. Fotoğraf, belge ve hatırlatmalar bu geçişe dahil değildir.') }}</p>
    <p v-if="app.data.garageShared" role="status" class="ds-note ok">{{ t('Ortak garaj etkin. Mobildeki aktarımı kendin başlatırsın; burada güncel kayıtları yenileyebilirsin.') }}</p>
    <template v-else><p class="ds-xs ds-muted">{{ t('Geçiş kendiliğinden başlamaz. Eski kayıtların kimliği korunur; çakışma veya kapasite sorunu varsa hiçbir şey değiştirilmez.') }}</p><button type="button" class="ds-btn s sm start" :disabled="busy" @click="startPreview">{{ t('Geçişi önizle') }}</button></template>
    <div v-if="preview&&!preview.active" class="ds-col ds-g10">
      <p class="ds-small">{{ t('{vehicles} araç ve {records} bakım kaydı ortak garaja alınacak.',{vehicles:preview.vehicles,records:preview.records}) }}</p>
      <label class="ds-row ds-g8 ack"><input class="ds-check" type="checkbox" v-model="ack" :disabled="busy"/><span class="ds-small">{{ t('Bu hesaptaki kayıtların ortak garaja geçirilmesini onaylıyorum.') }}</span></label>
      <button type="button" class="ds-btn p sm wrap" :disabled="busy||!ack" @click="confirm">{{ t('Onayla ve ortak garajı etkinleştir') }}</button>
    </div>
    <p v-if="error" role="alert" class="ds-note err">{{ t(error) }}</p>
  </section>
</template>

<style scoped>
p, h2 {margin: 0;}
.title {font-family: Arimo, Arial, Helvetica, sans-serif; letter-spacing: 0; font-size: 16px; line-height: 21.6px;}
.start {align-self: flex-start;}
.ack {align-items: flex-start; cursor: pointer;}
input.ds-check {min-height: 0; padding: 0;}
.wrap {white-space: normal; height: auto; min-height: 36px; padding-top: 6px; padding-bottom: 6px;}
</style>
