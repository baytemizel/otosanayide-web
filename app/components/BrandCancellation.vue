<script setup lang="ts">
import {computed, ref} from 'vue';
import type {z} from 'zod';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {brandCancellationResponse, brandCancellationRequest, brandCancellationDecision, brandCancellationLabels, brandRefundLabels} from '@otosanayide/core/brand-cancellation';

type View = z.infer<typeof brandCancellationResponse>;
const props = withDefaults(defineProps<{id?: string; demo?: boolean; disabled?: boolean; onBusy?: (v: boolean) => void; onCancelled?: () => void; initialData?: View; onUpdated?: (v: View) => void}>(), {demo: false, disabled: false});
const app = useApp();
const {t, localeTag} = useLocale();
const data = ref<View | null>(props.initialData ?? null);
const reason = ref('');
const note = ref('');
const confirm = ref(false);
const busy = ref(false);
const error = ref('');
let lock = false;
const time = (v: number) => new Date(v).toLocaleString(localeTag.value, {timeZone: 'Europe/Istanbul'});
const money = (minor: number, currency: string) => new Intl.NumberFormat(localeTag.value, {style: 'currency', currency}).format(minor / 100);
const text = (e: Event) => (e.target as HTMLTextAreaElement).value;

async function run(method: 'GET' | 'POST' | 'PATCH', choice?: 'approve' | 'reject') {
  const id = props.id;
  if (!id || props.demo || lock || props.disabled) return;
  lock = true;
  busy.value = true;
  props.onBusy?.(true);
  error.value = '';
  try {
    const payload = method === 'POST' ? brandCancellationRequest.parse({reservationId: id, reason: reason.value}) : method === 'PATCH' ? brandCancellationDecision.parse({reservationId: id, version: data.value?.cancellation?.version, decision: choice, note: note.value}) : undefined;
    const response = await apiFetch('/api/admin/brand-cancellations' + (method === 'GET' ? '?' + new URLSearchParams({reservationId: id}) : ''), {method, headers: {Authorization: `Bearer ${await app.user?.getIdToken()}`, ...(payload ? {'Content-Type': 'application/json'} : {})}, body: payload ? JSON.stringify(payload) : undefined, cache: 'no-store'}), raw = await response.json();
    if (!response.ok) throw Error(raw.error);
    const result = brandCancellationResponse.parse(raw);
    if (result.reservationId !== id) throw Error('Kayıt değişti. Sayfayı yenile.');
    data.value = result;
    props.onUpdated?.(result);
    reason.value = '';
    note.value = '';
    confirm.value = false;
    if (result.cancellation?.status === 'approved') props.onCancelled?.();
  } catch (e) {
    data.value = null;
    confirm.value = false;
    error.value = e instanceof Error && !e.message.startsWith('[') ? e.message : 'Bilgileri kontrol edin.';
  } finally {
    lock = false;
    busy.value = false;
    props.onBusy?.(false);
  }
}

const blocked = computed(() => busy.value || props.disabled || !data.value?.enabled);
</script>

<template>
  <section class="panel stack">
    <h4>{{ t('Reklam İptali ve İade İncelemesi') }}</h4>
    <p class="notice">{{ t('İptal onayı reklam alanını serbest bırakır. Para iadesi ayrı doğrulanır; bu ekran para transferi yapmaz.') }}</p>
    <p v-if="demo||!id">{{ t('İptal durumunu görmek için gerçek reklam rezervasyonunu yükle.') }}</p>
    <template v-else>
      <button class="button secondary" :disabled="busy||disabled" @click="void run('GET')">{{ t('İptal ve iade durumunu yenile') }}</button>
      <template v-if="data">
        <p v-if="!data.enabled" class="notice">{{ t('Yeni iptal işlemleri kapalı. Geçmiş kayıtlar okunabilir.') }}</p>
        <div v-if="data.cancellation" class="stack">
          <strong role="status">{{ t(brandCancellationLabels[data.cancellation.status]) }}</strong>
          <p :style="{overflowWrap:'anywhere'}">{{ t('İptal gerekçesi') }}: {{ data.cancellation.reason }}</p>
          <small>{{ t('Talep tarihi') }}: {{ time(data.cancellation.createdAtMs) }}</small>
          <small v-if="data.cancellation.decidedAtMs!==null">{{ t('Karar tarihi') }}: {{ time(data.cancellation.decidedAtMs) }}</small>
          <p v-if="data.cancellation.note" :style="{overflowWrap:'anywhere'}">{{ t('İnceleme notu') }}: {{ data.cancellation.note }}</p>
          <template v-if="data.cancellation.status==='pending'">
            <template v-if="data.canReview">
              <label>{{ t('İptal inceleme notu') }}<textarea :value="note" :disabled="blocked" maxlength="1000" minlength="10" @input="note=text($event)"/></label>
              <label class="evidence-attestation"><input v-model="confirm" type="checkbox" :disabled="blocked"/><span>{{ t('Onayın reklamı durduracağını ve ayrılan kapasiteyi serbest bırakacağını anladım.') }}</span></label>
              <div class="row" :style="{flexWrap:'wrap'}">
                <button class="button primary" :disabled="blocked||note.trim().length<10||!confirm" @click="void run('PATCH','approve')">{{ t('İptali Onayla ve Alanı Serbest Bırak') }}</button>
                <button class="button secondary" :disabled="blocked||note.trim().length<10" @click="void run('PATCH','reject')">{{ t('İptal Talebini Reddet') }}</button>
              </div>
            </template>
            <p v-else>{{ t('Talebi açan kişi kendi iptal talebini inceleyemez. Başka bir finans yöneticisi incelemeli.') }}</p>
          </template>
        </div>
        <template v-else-if="data.eligible">
          <label>{{ t('İptal gerekçesi') }}<textarea :value="reason" :disabled="blocked" minlength="10" maxlength="1000" @input="reason=text($event)"/></label>
          <button class="button secondary" :disabled="blocked||reason.trim().length<10" @click="void run('POST')">{{ t('İptal Talebi Aç') }}</button>
          <small>{{ t('Talep açılması reklamı durdurmaz. Kararı farklı bir finans yöneticisi verir.') }}</small>
        </template>
        <p v-else>{{ t('Bu rezervasyon için iptal talebi açılamıyor. Kesin kabul ve rezervasyon durumunu kontrol et.') }}</p>
        <div v-if="data.refund" class="notice stack">
          <strong>{{ t(brandRefundLabels[data.refund.status]) }}</strong>
          <template v-if="data.refund.evidence">
            <span>{{ t('Sağlayıcıdan doğrulanan iade kaydı') }}</span>
            <span>{{ t('Tutar') }}: {{ money(data.refund.evidence.amountMinor,data.refund.evidence.currency) }}</span>
            <span v-if="data.refund.evidence.refundedAtMs!==null">{{ t('Sağlayıcı iade tarihi') }}: {{ time(data.refund.evidence.refundedAtMs) }}</span>
            <p v-if="data.refund.evidence.reason">{{ t(data.refund.evidence.reason==='amount_or_time'?'İade tutarı, para birimi veya zamanı uyuşmuyor.':'Ek iade kaydı inceleme gerektiriyor.') }}</p>
          </template>
          <small>{{ t('İade durum kontrolü') }}: {{ time(data.refund.checkedAtMs) }}</small>
          <p>{{ t('Kısmi iadeler ve ek iade kayıtları ayrıca uzlaştırılmalıdır. İptal onayı iadenin tamamlandığını göstermez.') }}</p>
        </div>
        <small>{{ t('Son sunucu kontrolü') }}: {{ time(data.checkedAtMs) }} · {{ t('İstanbul saati') }}</small>
      </template>
    </template>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <p v-if="error" role="alert" class="error">{{ t(error) }}</p>
  </section>
</template>
