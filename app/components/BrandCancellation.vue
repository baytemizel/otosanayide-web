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
  <section class="sec ds-col ds-g12">
    <h4>{{ t('Reklam İptali ve İade İncelemesi') }}</h4>
    <p class="ds-note info ds-col">{{ t('İptal onayı reklam alanını serbest bırakır. Para iadesi ayrı doğrulanır; bu ekran para transferi yapmaz.') }}</p>
    <p v-if="demo||!id">{{ t('İptal durumunu görmek için gerçek reklam rezervasyonunu yükle.') }}</p>
    <template v-else>
      <button class="ds-btn s" :disabled="busy||disabled" @click="void run('GET')">{{ t('İptal ve iade durumunu yenile') }}</button>
      <template v-if="data">
        <p v-if="!data.enabled" class="ds-note warn ds-col">{{ t('Yeni iptal işlemleri kapalı. Geçmiş kayıtlar okunabilir.') }}</p>
        <div v-if="data.cancellation" class="ds-col ds-g12">
          <strong role="status">{{ t(brandCancellationLabels[data.cancellation.status]) }}</strong>
          <p class="brk">{{ t('İptal gerekçesi') }}: {{ data.cancellation.reason }}</p>
          <small class="ds-xs ds-muted">{{ t('Talep tarihi') }}: {{ time(data.cancellation.createdAtMs) }}</small>
          <small class="ds-xs ds-muted" v-if="data.cancellation.decidedAtMs!==null">{{ t('Karar tarihi') }}: {{ time(data.cancellation.decidedAtMs) }}</small>
          <p class="brk" v-if="data.cancellation.note">{{ t('İnceleme notu') }}: {{ data.cancellation.note }}</p>
          <template v-if="data.cancellation.status==='pending'">
            <template v-if="data.canReview">
              <label class="fld"><span class="ds-label">{{ t('İptal inceleme notu') }}</span><textarea class="ds-field" :value="note" :disabled="blocked" maxlength="1000" minlength="10" @input="note=text($event)"/></label>
              <label class="ck"><input class="ds-check" v-model="confirm" type="checkbox" :disabled="blocked"/><span>{{ t('Onayın reklamı durduracağını ve ayrılan kapasiteyi serbest bırakacağını anladım.') }}</span></label>
              <div class="ds-row ds-g8 ds-wrap">
                <button class="ds-btn p" :disabled="blocked||note.trim().length<10||!confirm" @click="void run('PATCH','approve')">{{ t('İptali Onayla ve Alanı Serbest Bırak') }}</button>
                <button class="ds-btn s" :disabled="blocked||note.trim().length<10" @click="void run('PATCH','reject')">{{ t('İptal Talebini Reddet') }}</button>
              </div>
            </template>
            <p v-else>{{ t('Talebi açan kişi kendi iptal talebini inceleyemez. Başka bir finans yöneticisi incelemeli.') }}</p>
          </template>
        </div>
        <template v-else-if="data.eligible">
          <label class="fld"><span class="ds-label">{{ t('İptal gerekçesi') }}</span><textarea class="ds-field" :value="reason" :disabled="blocked" minlength="10" maxlength="1000" @input="reason=text($event)"/></label>
          <button class="ds-btn s" :disabled="blocked||reason.trim().length<10" @click="void run('POST')">{{ t('İptal Talebi Aç') }}</button>
          <small class="ds-xs ds-muted">{{ t('Talep açılması reklamı durdurmaz. Kararı farklı bir finans yöneticisi verir.') }}</small>
        </template>
        <p v-else>{{ t('Bu rezervasyon için iptal talebi açılamıyor. Kesin kabul ve rezervasyon durumunu kontrol et.') }}</p>
        <div v-if="data.refund" class="ds-note info ds-col">
          <strong>{{ t(brandRefundLabels[data.refund.status]) }}</strong>
          <template v-if="data.refund.evidence">
            <span>{{ t('Sağlayıcıdan doğrulanan iade kaydı') }}</span>
            <span>{{ t('Tutar') }}: {{ money(data.refund.evidence.amountMinor,data.refund.evidence.currency) }}</span>
            <span v-if="data.refund.evidence.refundedAtMs!==null">{{ t('Sağlayıcı iade tarihi') }}: {{ time(data.refund.evidence.refundedAtMs) }}</span>
            <p v-if="data.refund.evidence.reason">{{ t(data.refund.evidence.reason==='amount_or_time'?'İade tutarı, para birimi veya zamanı uyuşmuyor.':'Ek iade kaydı inceleme gerektiriyor.') }}</p>
          </template>
          <small class="ds-xs ds-muted">{{ t('İade durum kontrolü') }}: {{ time(data.refund.checkedAtMs) }}</small>
          <p>{{ t('Kısmi iadeler ve ek iade kayıtları ayrıca uzlaştırılmalıdır. İptal onayı iadenin tamamlandığını göstermez.') }}</p>
        </div>
        <small class="ds-xs ds-muted">{{ t('Son sunucu kontrolü') }}: {{ time(data.checkedAtMs) }} · {{ t('İstanbul saati') }}</small>
      </template>
    </template>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <p v-if="error" role="alert" class="ds-note err">{{ t(error) }}</p>
  </section>
</template>

<style scoped>
p,h2,h3,h4,h5{margin:0}
h2,h3,h4{font:700 19px/1.3 Arimo,Arial,Helvetica,sans-serif;letter-spacing:0}
h5{font-size:15px;line-height:1.5}
.fld{display:flex;flex-direction:column;min-width:0;font-size:15px;font-weight:400}
.ck{display:flex;gap:8px;align-items:flex-start;font-size:13px}
input.ds-check{min-height:0;padding:0;width:20px}
.sec{border-top:1px solid #edf0f3;padding-top:20px}
.brk{overflow-wrap:anywhere}
@media(max-width:760px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;flex:0 1 auto;max-width:100%;text-align:center}}
</style>
