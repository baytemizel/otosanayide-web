<script setup lang="ts">
import {computed,ref} from 'vue';
import {Clock,X} from '@lucide/vue';
import type {CampaignView} from '@otosanayide/core/campaigns';
import HostedCheckoutButton from '~/components/HostedCheckoutButton.vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import type {QuoteView,ReservationView} from '~/lib/campaign-booking-helpers';

type Transport=(method:'GET'|'POST',value?:Record<string,unknown>)=>Promise<{quote?:QuoteView;reservation?:ReservationView;reservationsEnabled?:boolean;checkoutEnabled?:boolean}>;

const props=defineProps<{campaign:CampaignView;transport:Transport}>();

const {t,localeTag}=useLocale();
const quote=ref<QuoteView|null>(null);
const hold=ref<ReservationView|null>(null);
const enabled=ref(false);
const checkoutReady=ref(false);
const busy=ref(false);
const error=ref('');
const now=ref(Date.now());
let attempt:string|null=null;
let pending=false;
let mounted=true;

useClientEffect(()=>[],()=>{
  mounted=true;
  return()=>{mounted=false;};
});

useClientEffect(()=>[!!quote.value,!!hold.value],()=>{
  if(!quote.value&&!hold.value)return;
  const id=setInterval(()=>{now.value=Date.now();},1000);
  return()=>clearInterval(id);
});

async function load(){
  if(pending)return;
  pending=true;
  busy.value=true;
  error.value='';
  try{
    const d=await props.transport('GET');
    if(!mounted)return;
    if(!d.quote)throw Error('İşlem tamamlanamadı.');
    quote.value=d.quote;
    hold.value=d.quote.reservation;
    enabled.value=d.reservationsEnabled===true;
    checkoutReady.value=d.checkoutEnabled===true;
    attempt=null;
    now.value=Date.now();
  }catch(e){
    if(mounted){
      quote.value=null;
      enabled.value=false;
      checkoutReady.value=false;
      error.value=e instanceof Error?e.message:'İşlem tamamlanamadı.';
    }
  }finally{
    pending=false;
    if(mounted)busy.value=false;
  }
}

async function reserve(){
  if(!quote.value||pending)return;
  pending=true;
  busy.value=true;
  error.value='';
  if(hold.value&&hold.value.expiresAtMs<=Date.now()&&attempt===hold.value.id)attempt=null;
  attempt??=crypto.randomUUID();
  try{
    const d=await props.transport('POST',{campaignId:props.campaign.id,businessId:props.campaign.businessId,campaignVersion:props.campaign.version,tariffVersion:quote.value.tariffVersion,requestId:attempt});
    if(!mounted)return;
    if(!d.reservation)throw Error('İşlem tamamlanamadı.');
    hold.value=d.reservation;
    now.value=Date.now();
  }catch(e){
    if(mounted)error.value=e instanceof Error?e.message:'İşlem tamamlanamadı.';
  }finally{
    pending=false;
    if(mounted)busy.value=false;
  }
}

const active=computed(()=>hold.value?.status==='held'&&hold.value.expiresAtMs>now.value);
const seconds=computed(()=>active.value?Math.ceil((hold.value!.expiresAtMs-now.value)/1000):0);
const expired=computed(()=>!!quote.value&&quote.value.expiresAtMs<=now.value);
const money=(minor:number)=>new Intl.NumberFormat(localeTag.value,{style:'currency',currency:'TRY'}).format(minor/100);
</script>

<template>
  <section class="ds-card ds-pad24 ds-col ds-g16" :aria-label="t('Fiyat ve rezervasyon')">
    <h3>{{ t('Fiyat ve rezervasyon') }}</h3>
    <p class="ds-small ds-muted">{{ t('Fiyatı kontrol etmek alan ayırmaz. Rezervasyon ödeme değildir; kart bilgisi istenmez.') }}</p>
    <button class="ds-btn s st" :disabled="busy" @click="load()">{{ t(quote?'Fiyatı ve rezervasyonu yenile':'Güncel fiyatı gör') }}</button>
    <template v-if="quote">
      <div class="ds-col ds-g8">
        <div class="kv"><span class="ds-muted">{{ t('Vergi hariç tutar') }}</span><strong>{{ money(quote.subtotalMinor) }}</strong></div>
        <div class="kv"><span class="ds-muted">{{ t('Vergi') }}</span><strong>{{ money(quote.taxMinor) }}</strong></div>
        <div class="kv"><span class="ds-muted">{{ t('Toplam') }}</span><strong>{{ money(quote.totalMinor) }}</strong></div>
      </div>
      <p class="ds-xs ds-muted">{{ quote.dates[0] }} — {{ quote.dates.at(-1) }} · {{ t('TRY') }}</p>
      <p v-if="!enabled" class="ds-note warn">{{ t('Reklam rezervasyonu henüz etkin değil. Ücret alınmadı.') }}</p>
      <p v-if="expired&&!active" role="status" class="ds-note warn">{{ t('Fiyat kontrolünün süresi doldu. Devam etmeden önce yenile.') }}</p>
      <button v-if="enabled&&!active" class="ds-btn p st" :disabled="busy||expired" @click="reserve()">{{ t(attempt&&attempt!==hold?.id?'Aynı rezervasyonu tekrar dene':'Alanı 15 dakika ayır') }}</button>
    </template>
    <div v-if="hold" class="res">
      <span :class="['ic',active?'i-warn':'i-err']"><component :is="active?Clock:X" :size="34" :stroke-width="1.8" aria-hidden="true"/></span>
      <strong class="ttl">{{ t(active?'Alan geçici olarak ayrıldı.':'Rezervasyon artık etkin değil.') }}</strong>
      <template v-if="active">
        <p class="ds-small ds-b">{{ t('Kalan süre') }}: {{ Math.floor(seconds/60) }}:{{ String(seconds%60).padStart(2,'0') }}</p>
        <p class="ds-small">{{ t('Rezervasyon tutarı') }}: {{ money(hold.totalMinor) }}</p>
      </template>
      <p class="ds-small ds-muted">{{ t('Ücret alınmadı. Reklam yayımlanmadı. Kampanyayı iptal edersen ayrılan alan serbest bırakılır.') }}</p>
    </div>
    <HostedCheckoutButton v-if="active&&checkoutReady&&hold" kind="business" :reservationId="hold.id" :disabled="busy"/>
    <p v-if="error" role="alert" class="ds-note err">{{ t(error) }}</p>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
  </section>
</template>

<style scoped>
p,h2,h3,h4,h5{margin:0}
h2,h3,h4{font:700 19px/1.3 Arimo,Arial,Helvetica,sans-serif;letter-spacing:0}
h5{font-size:15px;line-height:1.5}
.res{display:flex;flex-direction:column;align-items:center;gap:12px;text-align:center;padding:36px 28px;border:1px solid #dfe5eb;border-radius:14px;background:#fff}
.ttl{font-size:19px;line-height:1.3}
.ic{width:72px;height:72px;border-radius:36px;display:flex;align-items:center;justify-content:center}
.i-ok{background:#e8f4ee;color:#21684e}
.i-warn{background:#fff6df;color:#8a5a00}
.i-err{background:#fdecea;color:#b42318}
.i-neu{background:#f0f2f5;color:#536276}
@media(max-width:480px){.res{padding:24px 16px}}
.kv{display:flex;justify-content:space-between;gap:12px;font-size:13px}
.kv strong{text-align:right;overflow-wrap:anywhere}
.st{align-self:flex-start}
@media(max-width:760px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;flex:0 1 auto;max-width:100%;text-align:center}}
</style>
