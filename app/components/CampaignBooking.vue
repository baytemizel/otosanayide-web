<script setup lang="ts">
import {computed,ref} from 'vue';
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
  <section class="panel stack" :aria-label="t('Fiyat ve rezervasyon')">
    <h3>{{ t('Fiyat ve rezervasyon') }}</h3>
    <p>{{ t('Fiyatı kontrol etmek alan ayırmaz. Rezervasyon ödeme değildir; kart bilgisi istenmez.') }}</p>
    <button class="button secondary" :disabled="busy" @click="load()">{{ t(quote?'Fiyatı ve rezervasyonu yenile':'Güncel fiyatı gör') }}</button>
    <template v-if="quote">
      <div class="profile-detail-list">
        <p>{{ t('Vergi hariç tutar') }}: <strong>{{ money(quote.subtotalMinor) }}</strong></p>
        <p>{{ t('Vergi') }}: <strong>{{ money(quote.taxMinor) }}</strong></p>
        <p>{{ t('Toplam') }}: <strong>{{ money(quote.totalMinor) }}</strong></p>
      </div>
      <p class="small muted">{{ quote.dates[0] }} — {{ quote.dates.at(-1) }} · {{ t('TRY') }}</p>
      <p v-if="!enabled" class="notice">{{ t('Reklam rezervasyonu henüz etkin değil. Ücret alınmadı.') }}</p>
      <p v-if="expired&&!active" role="status">{{ t('Fiyat kontrolünün süresi doldu. Devam etmeden önce yenile.') }}</p>
      <button v-if="enabled&&!active" class="button primary" :disabled="busy||expired" @click="reserve()">{{ t(attempt&&attempt!==hold?.id?'Aynı rezervasyonu tekrar dene':'Alanı 15 dakika ayır') }}</button>
    </template>
    <div v-if="hold" class="notice">
      <strong>{{ t(active?'Alan geçici olarak ayrıldı.':'Rezervasyon artık etkin değil.') }}</strong>
      <template v-if="active">
        <p>{{ t('Kalan süre') }}: {{ Math.floor(seconds/60) }}:{{ String(seconds%60).padStart(2,'0') }}</p>
        <p>{{ t('Rezervasyon tutarı') }}: {{ money(hold.totalMinor) }}</p>
      </template>
      <p>{{ t('Ücret alınmadı. Reklam yayımlanmadı. Kampanyayı iptal edersen ayrılan alan serbest bırakılır.') }}</p>
    </div>
    <HostedCheckoutButton v-if="active&&checkoutReady&&hold" kind="business" :reservationId="hold.id" :disabled="busy"/>
    <p v-if="error" role="alert" class="error">{{ t(error) }}</p>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
  </section>
</template>
