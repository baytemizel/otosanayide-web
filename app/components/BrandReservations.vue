<script setup lang="ts">
import {computed,ref} from 'vue';
import type {BrandView} from '@otosanayide/core/brand-campaigns';
import {brandCapacityUpdate} from '@otosanayide/core/brand-inventory';
import type {brandPrice} from '@otosanayide/core/brand-pricing';
import BrandPreview from '~/components/BrandPreview.vue';
import BrandAcceptance from '~/components/BrandAcceptance.vue';
import BrandCancellation from '~/components/BrandCancellation.vue';
import BrandOrderPanel from '~/components/BrandOrderPanel.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';

type Capacity={enabled:boolean;capacity:number;version:number};
type Hold={id:string;status:string;expiresAtMs:number;totalMinor:number;committedUntilMs?:number};
type Quote=ReturnType<typeof brandPrice>;

const props=withDefaults(defineProps<{item:BrandView;demo?:boolean;dirty?:boolean;disabled?:boolean;onBusy?:(b:boolean)=>void}>(),{demo:false,dirty:false,disabled:false});

const app=useApp();
const {t,localeTag}=useLocale();
const loaded=ref(false);
const capacity=ref<Capacity|null>(null);
const count=ref('');
const enabled=ref(false);
const reason=ref('');
const live=ref(false);
const hold=ref<Hold|null>(null);
const quote=ref<Quote|null>(null);
const busy=ref(false);
const error=ref('');
const message=ref('');
const now=ref(Date.now());
let lock=false;
let requestId:string|null=null;

const changed=computed(()=>count.value!==(capacity.value?String(capacity.value.capacity):'')||enabled.value!==(capacity.value?.enabled??false));
const held=computed(()=>(hold.value?.status==='held'&&hold.value.expiresAtMs>now.value)||hold.value?.status==='committed');
const blocked=computed(()=>props.dirty||(!props.demo&&!props.item.version));

useClientEffect(()=>[hold.value,quote.value],()=>{
  if(!hold.value&&!quote.value)return;
  now.value=Date.now();
  const id=setInterval(()=>{now.value=Date.now();},1000);
  return()=>clearInterval(id);
});

async function api(path:string,method='GET',payload?:unknown){
  const r=await apiFetch('/api/admin/'+path,{method,headers:{Authorization:`Bearer ${await app.user?.getIdToken()}`,...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined,cache:'no-store'}),d=await r.json();
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
  try{
    await fn();
  }catch(e){
    error.value=e instanceof Error&&!e.message.startsWith('[')?e.message:'Kapasiteyi ve değişiklik gerekçesini kontrol et.';
  }finally{
    lock=false;
    busy.value=false;
    props.onBusy?.(false);
  }
}

function setCapacity(c:Capacity|null){
  capacity.value=c;
  count.value=c?String(c.capacity):'';
  enabled.value=c?.enabled??false;
  reason.value='';
  quote.value=null;
  requestId=null;
}

const money=(v:number)=>new Intl.NumberFormat(localeTag.value,{style:'currency',currency:'TRY'}).format(v/100);
const time=(v:number)=>new Date(v).toLocaleString(localeTag.value,{timeZone:'Europe/Istanbul'});

function refresh(){
  void run(async()=>{
    const d=props.demo?{capacity:null,reservation:null,enabled:false}:await api('brand-reservations?'+new URLSearchParams({campaignId:props.item.id}));
    setCapacity(d.capacity);
    hold.value=d.reservation;
    live.value=d.enabled;
    loaded.value=true;
  });
}

function saveCapacity(){
  void run(async()=>{
    if(!/^\d{1,2}$/.test(count.value))throw Error(t('Kapasiteyi ve değişiklik gerekçesini kontrol et.'));
    const a=brandCapacityUpdate.parse({placement:props.item.creative.placement,version:capacity.value?.version??0,capacity:Number(count.value),enabled:enabled.value,reason:reason.value}),d=props.demo?{capacity:{enabled:enabled.value,capacity:a.capacity,version:a.version+1}}:await api('brand-capacities','PATCH',a);
    setCapacity(d.capacity);
    message.value=props.demo?'Örnek kapasite hazır. Sunucuya kaydedilmedi.':'Kapasite kaydedildi.';
  });
}

function revertCapacity(){
  setCapacity(capacity.value);
  error.value='';
}

function fetchQuote(){
  void run(async()=>{
    quote.value=null;
    requestId=null;
    const c=props.item.creative,d=await api('brand-tariffs?'+new URLSearchParams({placement:c.placement,city:c.city,category:c.category}));
    if(!d.tariff)throw Error(t('Bu kapsam için marka tarifesi tanımlanmamış.'));
    const result=await api('brand-quote','POST',{campaignId:props.item.id,campaignVersion:props.item.version,tariffVersion:d.tariff.version});
    quote.value=result.quote;
  });
}

function releaseHold(){
  const current=hold.value!;
  void run(async()=>{
    await api('brand-reservations','DELETE',{campaignId:props.item.id});
    hold.value={...current,status:'released'};
    quote.value=null;
    requestId=null;
  });
}

function reserve(){
  const currentQuote=quote.value!;
  void run(async()=>{
    if(!capacity.value)return;
    requestId??=crypto.randomUUID();
    const d=await api('brand-reservations','POST',{campaignId:props.item.id,campaignVersion:props.item.version,tariffVersion:currentQuote.tariffVersion,capacityVersion:capacity.value.version,requestId});
    hold.value=d.reservation;
    quote.value=null;
  });
}

function childBusy(value:boolean){
  busy.value=value;
  props.onBusy?.(value);
}

function accepted(until:number){
  const previous=hold.value;
  hold.value=previous&&previous.status!=='released'?{...previous,status:'committed',committedUntilMs:until}:previous;
}

function cancelled(){
  const previous=hold.value;
  hold.value=previous?{...previous,status:'released'}:previous;
  quote.value=null;
  requestId=null;
}
</script>

<template>
  <section class="panel stack">
    <h4>{{ t('Banner Kapasitesi ve Rezervasyon') }}</h4>
    <p>{{ t(item.creative.placement==='home_banner'?'Ana sayfa banner':'Kategori banner') }}</p>
    <p class="notice">{{ t('Bu kapasite tüm il ve kategoriler arasında ortaktır. Değişiklik aynı yerleşimdeki bütün marka kampanyalarını etkiler.') }}</p>
    <p v-if="blocked">{{ t('Rezervasyon için kampanya değişikliklerini kaydet.') }}</p>
    <template v-else>
      <button class="button secondary" :disabled="busy||disabled||changed" @click="refresh()">{{ t('Kapasiteyi ve rezervasyonu yenile') }}</button>
      <template v-if="loaded">
        <fieldset class="form-grid" :disabled="busy||disabled" :style="{border:0,padding:0,minWidth:0}">
          <label>{{ t('Günlük banner kapasitesi (1–20)') }}<input inputmode="numeric" :value="count" @input="count=($event.target as HTMLInputElement).value;quote=null"/></label>
          <label class="row"><input type="checkbox" :checked="enabled" @change="enabled=($event.target as HTMLInputElement).checked;quote=null"/>{{ t('Kapasite yeni rezervasyonlara açık') }}</label>
          <label class="span-all">{{ t('Kapasite değişiklik gerekçesi') }}<textarea v-model="reason" maxlength="1000"></textarea></label>
        </fieldset>
        <p class="small muted">{{ t('Kapasiteyi azaltmak veya kapatmak mevcut rezervasyonları iptal etmez.') }}</p>
        <p v-if="changed" role="status">{{ t('Kaydedilmemiş kapasite değişiklikleri var.') }}</p>
        <div class="row" :style="{flexWrap:'wrap'}">
          <button class="button primary" :disabled="busy||disabled||reason.trim().length<10" @click="saveCapacity()">{{ t(demo?'Örnek kapasiteyi hazırla':'Kapasiteyi kaydet') }}</button>
          <button class="button secondary" :disabled="busy||disabled||!changed" @click="revertCapacity()">{{ t('Kapasite değişikliklerini geri al') }}</button>
        </div>
        <p v-if="!live||demo" class="notice">{{ t('Canlı rezervasyon kapalı. Bu ekranda ödeme veya yayın başlatılmaz.') }}</p>
        <p v-if="item.status!=='approved'">{{ t('Rezervasyon için kreatif onayı gerekir.') }}</p>
        <div v-if="hold" class="notice" role="status">
          <strong>{{ t(hold.status==='committed'?'Reklam alanı kesin ayrıldı':hold.status==='released'?'Rezervasyon iptal edildi':held?'Yer geçici olarak ayrıldı':'Rezervasyonun süresi doldu') }}</strong>
          <p>{{ hold.id }}</p>
          <p>{{ t('Toplam') }}: {{ money(hold.totalMinor) }}</p>
          <p>{{ t('Geçerlilik sonu') }}: {{ time(hold.committedUntilMs??hold.expiresAtMs) }} · {{ t('İstanbul saati') }}</p>
        </div>
        <div class="row" :style="{flexWrap:'wrap'}">
          <button class="button secondary" :disabled="demo||!live||busy||disabled||changed||!capacity?.enabled||held||item.status!=='approved'" @click="fetchQuote()">{{ t('Rezervasyon ön hesabını getir') }}</button>
          <button v-if="hold?.status==='held'" class="button secondary" :disabled="busy||disabled||demo" @click="releaseHold()">{{ t('Rezervasyonu iptal et') }}</button>
        </div>
        <template v-if="quote&&!changed">
          <p v-if="now>=quote.expiresAtMs" role="status">{{ t('Teklifin süresi doldu. Yeniden hesapla.') }}</p>
          <div v-else class="notice stack">
            <strong>{{ t('Ön hesap · Ödeme değildir') }}</strong>
            <span>{{ quote.startDate }} → {{ quote.endDate }}</span>
            <span>{{ t('Ara toplam') }}: {{ money(quote.subtotalMinor) }} · {{ t('Vergi') }}: {{ money(quote.taxMinor) }}</span>
            <strong>{{ t('Toplam') }}: {{ money(quote.totalMinor) }}</strong>
            <span>{{ t('Geçerlilik sonu') }}: {{ time(quote.expiresAtMs) }} · {{ t('İstanbul saati') }}</span>
            <button class="button primary" :disabled="busy||disabled||!live||demo||held||!capacity?.enabled" @click="reserve()">{{ t('15 dakikalık yer ayır') }}</button>
            <small>{{ t('Yanıt alınamazsa aynı düğmeyle tekrar dene veya rezervasyonu yenile. Tekrar istek süreyi uzatmaz.') }}</small>
          </div>
        </template>
      </template>
    </template>
    <BrandOrderPanel v-if="!blocked&&hold?.status!=='committed'" :key="JSON.stringify([hold?.id,hold?.status,capacity?.version])" :hold="hold??undefined" :demo="demo" :disabled="disabled||busy||changed" :onBusy="childBusy"/>
    <BrandAcceptance v-if="!blocked" :key="hold?.id??'empty'" :id="hold?.id" :demo="demo" :disabled="disabled||busy||changed" :onBusy="childBusy" :onAccepted="accepted"/>
    <BrandCancellation v-if="!blocked" :key="`cancel-${hold?.id??'empty'}`" :id="hold?.id" :demo="demo" :disabled="disabled||busy||changed" :onBusy="childBusy" :onCancelled="cancelled"/>
    <BrandPreview v-if="!blocked" :key="`preview-${hold?.id??'empty'}-${hold?.status??'empty'}`" :id="hold?.id" :demo="demo" :disabled="disabled||busy||changed" :onBusy="childBusy"/>
    <p v-if="error" class="error" role="alert">{{ t(error) }}</p>
    <p v-if="message" role="status">{{ t(message) }}</p>
  </section>
</template>
