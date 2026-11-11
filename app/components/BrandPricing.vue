<script setup lang="ts">
import {computed,ref} from 'vue';
import {categories} from '@otosanayide/core';
import type {BrandView} from '@otosanayide/core/brand-campaigns';
import {brandPrice,brandTariffUpdate,type BrandTariff} from '@otosanayide/core/brand-pricing';
import {decimalHundredths} from '@otosanayide/core/ad-form';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {brandQuoteResponse, brandTariffResponse, readAdResponse} from '~/lib/ads-client';
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
  return readAdResponse(r,(raw):any=>path.startsWith('brand-quote')?brandQuoteResponse.parse(raw):brandTariffResponse.parse(raw));
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
    const next=props.demo?{...a.value,version:a.version+1}:(await request('brand-tariffs','PATCH',a)).tariff;
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
  <section class="sec ds-col ds-g12">
    <h4>{{ t('Marka Tarifesi ve Teklif') }}</h4>
    <p>{{ t(c.placement==='home_banner'?'Ana sayfa banner':'Kategori banner') }} · {{ c.city||t('Kapsamdaki tüm iller') }} · {{ t(categories.find(x=>x.id===c.category)?.name??'Tüm kategoriler') }}</p>
    <p class="ds-small ds-muted">{{ t('Bu kapsama özel günlük tarife. Ön hesap rezervasyon veya ödeme değildir.') }}</p>
    <p v-if="blocked" class="ds-note info ds-col">{{ t('Teklif için önce kampanya değişikliklerini kaydet.') }}</p>
    <template v-else>
      <button class="ds-btn s" :disabled="busy||disabled||changed" @click="openTariff()">{{ t('Tarifeyi aç / Yenile') }}</button>
      <template v-if="loaded">
        <fieldset :disabled="busy||disabled" class="grid fs">
          <label class="fld"><span class="ds-label">{{ t('Günlük ücret (TL)') }}</span><input class="ds-field" inputmode="decimal" :value="daily" @input="daily=($event.target as HTMLInputElement).value;quote=null"/></label>
          <label class="fld"><span class="ds-label">{{ t('Vergi oranı (%)') }}</span><input class="ds-field" inputmode="decimal" :value="tax" @input="tax=($event.target as HTMLInputElement).value;quote=null"/></label>
          <label class="ck"><input class="ds-check" type="checkbox" :checked="enabled" @change="enabled=($event.target as HTMLInputElement).checked;quote=null"/><span>{{ t('Tarife hesaplamaya açık') }}</span></label>
          <label class="fld all"><span class="ds-label">{{ t('Tarife değişiklik gerekçesi') }}</span><textarea class="ds-field" v-model="reason" maxlength="1000"></textarea></label>
        </fieldset>
        <p v-if="demo" class="ds-note info ds-col">{{ t('Demo: girdiğin fiyat yalnız bu ekranda örnek hesap için kullanılır.') }}</p>
        <p v-if="changed" role="status">{{ t('Kaydedilmemiş tarife değişiklikleri var.') }}</p>
        <div class="ds-row ds-g8 ds-wrap">
          <button class="ds-btn p" :disabled="busy||disabled||reason.trim().length<10" @click="saveTariff()">{{ t(demo?'Örnek tarifeyi hazırla':'Tarifeyi kaydet') }}</button>
          <button class="ds-btn s" :disabled="busy||disabled||!changed" @click="revertTariff()">{{ t('Tarife değişikliklerini geri al') }}</button>
          <button class="ds-btn s" :disabled="busy||disabled||changed||!tariff?.enabled" @click="calculateQuote()">{{ t('Teklifi hesapla') }}</button>
        </div>
        <template v-if="quote">
          <p v-if="now>=quote.expiresAtMs" role="status" class="ds-note warn ds-col">{{ t('Teklifin süresi doldu. Yeniden hesapla.') }}</p>
          <div v-else class="ds-note info ds-col" role="status">
            <strong>{{ t(demo?'Örnek teklif · Satış fiyatı değildir':'Ön hesap · Ödeme değildir') }}</strong>
            <span>{{ quote.startDate }} → {{ quote.endDate }} · {{ t('Süre (gün)') }}: {{ quote.days }}</span>
            <span>{{ t('Ara toplam') }}: {{ money(quote.subtotalMinor) }}</span>
            <span>{{ t('Vergi') }}: {{ money(quote.taxMinor) }}</span>
            <strong>{{ t('Toplam') }}: {{ money(quote.totalMinor) }}</strong>
            <small class="ds-xs ds-muted">{{ t('Geçerlilik sonu') }}: {{ new Date(quote.expiresAtMs).toLocaleString(localeTag,{timeZone:'Europe/Istanbul'}) }} · {{ t('İstanbul saati') }}</small>
          </div>
        </template>
      </template>
    </template>
    <p v-if="error" role="alert" class="ds-note err">{{ t(error) }}</p>
    <p v-if="message" role="status">{{ t(message) }}</p>
  </section>
</template>

<style scoped>
p,h2,h3,h4,h5{margin:0}
h2,h3,h4{font:700 19px/1.3 Arimo,Arial,Helvetica,sans-serif;letter-spacing:0}
h5{font-size:15px;line-height:1.5}
.fld{display:flex;flex-direction:column;min-width:0;font-size:15px;font-weight:400}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 12px}
.all{grid-column:1/-1}
@media(max-width:760px){.grid{grid-template-columns:minmax(0,1fr)}}
.ck{display:flex;gap:8px;align-items:flex-start;font-size:13px}
input.ds-check{min-height:0;padding:0;width:20px}
.fs{border:0;padding:0;margin:0;min-width:0}
.sec{border-top:1px solid #edf0f3;padding-top:20px}
@media(max-width:760px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;flex:0 1 auto;max-width:100%;text-align:center}}
</style>
