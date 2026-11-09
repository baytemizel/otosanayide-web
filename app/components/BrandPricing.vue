<script setup lang="ts">
import {computed,ref} from 'vue';
import {categories} from '@otosanayide/core';
import type {BrandView} from '@otosanayide/core/brand-campaigns';
import {brandPrice,brandTariffUpdate,brandTariffView,type BrandTariff} from '@otosanayide/core/brand-pricing';
import {decimalHundredths} from '@otosanayide/core/ad-form';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';

type Quote=ReturnType<typeof brandPrice>;

const props=withDefaults(defineProps<{item:BrandView;demo?:boolean;dirty?:boolean;disabled?:boolean;onBusy?:(busy:boolean)=>void}>(),{demo:false,dirty:false,disabled:false});

const app=useApp();
const {t,localeTag}=useLocale();
const loaded=ref(false);
const tariff=ref<BrandTariff|null>(null);
const daily=ref('');
const tax=ref('');
const enabled=ref(false);
const reason=ref('');
const quote=ref<Quote|null>(null);
const busy=ref(false);
const error=ref('');
const message=ref('');
const now=ref(Date.now());
let lock=false;

const c=computed(()=>props.item.creative);
const market=computed(()=>({placement:c.value.placement,city:c.value.city,category:c.value.category}));
const changed=computed(()=>loaded.value&&(daily.value!==(tariff.value?String(tariff.value.dailyMinor/100):'')||tax.value!==(tariff.value?String(tariff.value.taxBasisPoints/100):'')||enabled.value!==(tariff.value?.enabled??false)));
const blocked=computed(()=>props.dirty||(!props.demo&&props.item.version===0));

useClientEffect(()=>[quote.value],()=>{
  if(!quote.value)return;
  now.value=Date.now();
  const id=setInterval(()=>{now.value=Date.now();},1000);
  return()=>clearInterval(id);
});

async function request(path:string,method='GET',payload?:unknown){
  const r=await apiFetch('/api/admin/'+path,{method,headers:{Authorization:`Bearer ${await app.user?.getIdToken()}`,...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined,cache:'no-store'});
  const d=await r.json();
  if(!r.ok)throw Error(d.error);
  return d;
}

async function run(fn:()=>Promise<void>){
  if(lock)return;
  lock=true;
  busy.value=true;
  props.onBusy?.(true);
  error.value='';
  message.value='';
  quote.value=null;
  try{
    await fn();
  }catch(e){
    error.value=e instanceof Error&&!e.message.startsWith('[')&&!['date','version','market','amount'].includes(e.message)?e.message:'Günlük ücret, vergi ve değişiklik gerekçesini kontrol et.';
  }finally{
    lock=false;
    busy.value=false;
    props.onBusy?.(false);
  }
}

function setTariff(v:BrandTariff|null){
  tariff.value=v;
  daily.value=v?String(v.dailyMinor/100):'';
  tax.value=v?String(v.taxBasisPoints/100):'';
  enabled.value=v?.enabled??false;
  reason.value='';
  loaded.value=true;
}

const money=(v:number)=>new Intl.NumberFormat(localeTag.value,{style:'currency',currency:'TRY'}).format(v/100);

function openTariff(){
  void run(async()=>{
    setTariff(props.demo?null:(await request('brand-tariffs?'+new URLSearchParams(market.value))).tariff);
  });
}

function saveTariff(){
  void run(async()=>{
    const a=brandTariffUpdate.parse({version:tariff.value?.version??0,value:{market:market.value,enabled:enabled.value,dailyMinor:decimalHundredths(daily.value),taxBasisPoints:decimalHundredths(tax.value)},reason:reason.value});
    const next=props.demo?{...a.value,version:a.version+1}:brandTariffView((await request('brand-tariffs','PATCH',a)).tariff);
    setTariff(next);
    message.value=props.demo?'Örnek tarife hazır. Sunucuya kaydedilmedi.':'Tarife kaydedildi.';
  });
}

function revertTariff(){
  setTariff(tariff.value);
  quote.value=null;
  error.value='';
  message.value='';
}

function calculateQuote(){
  void run(async()=>{
    const current=tariff.value;
    if(!current)return;
    const input={campaignId:props.item.id,campaignVersion:Math.max(1,props.item.version),tariffVersion:current.version};
    quote.value=props.demo?brandPrice({...props.item,version:input.campaignVersion,lastEditorId:'demo',createdAtMs:0,updatedAtMs:0},current,input,Date.now()):(await request('brand-quote','POST',input)).quote;
  });
}
</script>

<template>
  <section class="panel stack">
    <h4>{{ t('Marka Tarifesi ve Teklif') }}</h4>
    <p>{{ t(c.placement==='home_banner'?'Ana sayfa banner':'Kategori banner') }} · {{ c.city||t('Kapsamdaki tüm iller') }} · {{ t(categories.find(x=>x.id===c.category)?.name??'Tüm kategoriler') }}</p>
    <p class="small muted">{{ t('Bu kapsama özel günlük tarife. Ön hesap rezervasyon veya ödeme değildir.') }}</p>
    <p v-if="blocked" class="notice">{{ t('Teklif için önce kampanya değişikliklerini kaydet.') }}</p>
    <template v-else>
      <button class="button secondary" :disabled="busy||disabled||changed" @click="openTariff()">{{ t('Tarifeyi aç / Yenile') }}</button>
      <template v-if="loaded">
        <fieldset :disabled="busy||disabled" class="form-grid" :style="{border:0,padding:0,minWidth:0}">
          <label>{{ t('Günlük ücret (TL)') }}<input inputmode="decimal" :value="daily" @input="daily=($event.target as HTMLInputElement).value;quote=null"/></label>
          <label>{{ t('Vergi oranı (%)') }}<input inputmode="decimal" :value="tax" @input="tax=($event.target as HTMLInputElement).value;quote=null"/></label>
          <label class="row"><input type="checkbox" :checked="enabled" @change="enabled=($event.target as HTMLInputElement).checked;quote=null"/>{{ t('Tarife hesaplamaya açık') }}</label>
          <label class="span-all">{{ t('Tarife değişiklik gerekçesi') }}<textarea v-model="reason" maxlength="1000"></textarea></label>
        </fieldset>
        <p v-if="demo" class="notice">{{ t('Demo: girdiğin fiyat yalnız bu ekranda örnek hesap için kullanılır.') }}</p>
        <p v-if="changed" role="status">{{ t('Kaydedilmemiş tarife değişiklikleri var.') }}</p>
        <div class="row" :style="{flexWrap:'wrap'}">
          <button class="button primary" :disabled="busy||disabled||reason.trim().length<10" @click="saveTariff()">{{ t(demo?'Örnek tarifeyi hazırla':'Tarifeyi kaydet') }}</button>
          <button class="button secondary" :disabled="busy||disabled||!changed" @click="revertTariff()">{{ t('Tarife değişikliklerini geri al') }}</button>
          <button class="button secondary" :disabled="busy||disabled||changed||!tariff?.enabled" @click="calculateQuote()">{{ t('Teklifi hesapla') }}</button>
        </div>
        <template v-if="quote">
          <p v-if="now>=quote.expiresAtMs" role="status" class="notice">{{ t('Teklifin süresi doldu. Yeniden hesapla.') }}</p>
          <div v-else class="notice stack" role="status">
            <strong>{{ t(demo?'Örnek teklif · Satış fiyatı değildir':'Ön hesap · Ödeme değildir') }}</strong>
            <span>{{ quote.startDate }} → {{ quote.endDate }} · {{ t('Süre (gün)') }}: {{ quote.days }}</span>
            <span>{{ t('Ara toplam') }}: {{ money(quote.subtotalMinor) }}</span>
            <span>{{ t('Vergi') }}: {{ money(quote.taxMinor) }}</span>
            <strong>{{ t('Toplam') }}: {{ money(quote.totalMinor) }}</strong>
            <small>{{ t('Geçerlilik sonu') }}: {{ new Date(quote.expiresAtMs).toLocaleString(localeTag,{timeZone:'Europe/Istanbul'}) }} · {{ t('İstanbul saati') }}</small>
          </div>
        </template>
      </template>
    </template>
    <p v-if="error" role="alert" class="error">{{ t(error) }}</p>
    <p v-if="message" role="status">{{ t(message) }}</p>
  </section>
</template>
