<script setup lang="ts">
import {ref} from 'vue';
import type {CampaignView,CampaignAction} from '@otosanayide/core/campaigns';
import CampaignCard from '~/components/CampaignCard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {campaignPage, campaignSaved, readAdResponse} from '~/lib/ads-client';
import {apiFetch} from '~/lib/api';
import {campaignLabels,newCampaign,type CampaignBranch} from '~/lib/campaigns-helpers';

const demoBranch:CampaignBranch={id:'sample-care',name:'Örnek Oto Bakım',city:'İstanbul',categories:['mechanical','tyres']};

const props=withDefaults(defineProps<{admin?:boolean}>(),{admin:false});

const app=useApp();
const {t}=useLocale();
const branches=ref<CampaignBranch[]>([]);
const bid=ref('');
const items=ref<CampaignView[]>([]);
const state=ref('pending');
const cursor=ref('');
const next=ref<string|null>(null);
const reload=ref(0);
const busy=ref(false);
const error=ref('');

useClientEffect(()=>[app.user,app.demo,props.admin],()=>{
  let stop=false;
  const user=app.user;
  if(!user||app.demo||props.admin)return;
  user.getIdToken().then(token=>apiFetch('/api/businesses/manage',{headers:{Authorization:`Bearer ${token}`}})).then(async r=>{
    const d=await readAdResponse(r,raw=>raw as {businesses:Array<CampaignBranch&{role:string}>});
    if(!Array.isArray(d?.businesses))throw Error(t('Sunucu yanıtı beklenen biçimde değil. Sayfayı yenile; sürerse yöneticiye bildir.'));
    if(!stop){
      const owners=d.businesses.filter((b:{role:string})=>b.role==='owner');
      branches.value=owners;
      bid.value=owners[0]?.id??'';
    }
  }).catch(e=>{if(!stop)error.value=e.message;});
  return()=>{stop=true;};
});

useClientEffect(()=>[app.user,app.demo,props.admin,bid.value,state.value,cursor.value,reload.value],()=>{
  let stop=false;
  items.value=[];
  next.value=null;
  const user=app.user;
  if(!user||app.demo||(!props.admin&&!bid.value))return;
  busy.value=true;
  error.value='';
  user.getIdToken().then(token=>apiFetch(`/api/campaigns?${props.admin?`queue=true&status=${state.value}`:`businessId=${encodeURIComponent(bid.value)}`}${cursor.value?`&after=${cursor.value}`:''}`,{headers:{Authorization:`Bearer ${token}`}})).then(async r=>{
    const d=await readAdResponse(r,raw=>campaignPage.parse(raw));
    if(!stop){
      items.value=d.items;
      next.value=d.next;
    }
  }).catch(e=>{if(!stop)error.value=e.message;}).finally(()=>{if(!stop)busy.value=false;});
  return()=>{stop=true;};
});

function addCampaign(){
  const branch=branches.value.find(b=>b.id===bid.value);
  if(branch)items.value=[newCampaign(branch,crypto.randomUUID()),...items.value];
}

function branchOf(v:CampaignView):CampaignBranch{
  return branches.value.find(b=>b.id===v.businessId)??{id:v.businessId,name:v.businessName||t('İşletme'),city:v.city,categories:[v.category]};
}

async function patchCampaign(a:CampaignAction){
  const r=await apiFetch('/api/campaigns',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await app.user!.getIdToken()}`},body:JSON.stringify(a)});
  const d=await readAdResponse(r,raw=>campaignSaved.parse(raw));
  items.value=items.value.map(item=>item.id===d.item.id?d.item:item);
}
</script>

<template>
  <section class="ds-col ds-g20">
    <header class="ds-col ds-g4">
      <h2 v-if="!admin" class="pg">{{ t('Reklam paketleri') }}</h2>
      <p class="lead">{{ t(admin?'Ücretsiz işletme profilin korunur. Reklam yalnızca ilgili şehir ve kategoride sponsor etiketiyle gösterilir.':'Ücretsiz profil ve sahiplik kalıcı temel üründür. Reklam satın almak puanı, doğrulamayı veya organik sıralamayı etkilemez.') }}</p>
    </header>
    <template v-if="app.demo">
      <p v-if="admin" class="ds-note info">{{ t('Önizlemede kampanya onayı veya ödeme yapılmaz.') }}</p>
      <CampaignCard v-else :value="newCampaign(demoBranch,'00000000-0000-4000-8000-000000000001')" :branch="demoBranch" demo :onAction="async()=>{}"/>
    </template>
    <p v-else-if="!app.user">{{ t('Giriş yap') }}</p>
    <template v-else>
      <div class="bar">
        <label v-if="admin" class="fld"><span class="ds-label">{{ t('Başvuru durumu') }}</span><select class="ds-field" :value="state" @change="state=($event.target as HTMLSelectElement).value;cursor=''"><option v-for="[key,label] in Object.entries(campaignLabels)" :key="key" :value="key">{{ t(label) }}</option></select></label>
        <label v-else class="fld"><span class="ds-label">{{ t('İşletme') }}</span><select class="ds-field" :value="bid" @change="bid=($event.target as HTMLSelectElement).value;cursor=''"><option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option></select></label>
        <div class="ds-row ds-g8 ds-wrap">
          <button class="ds-btn s" :disabled="busy" @click="reload++">{{ t('Yenile') }}</button>
          <button v-if="!admin&&bid" class="ds-btn p" :disabled="busy||items.some(v=>v.version===0)" @click="addCampaign()">{{ t('Yeni kampanya') }}</button>
        </div>
      </div>
      <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
      <template v-else>
        <CampaignCard v-for="v in items" :key="`${v.id}-${v.version}`" :value="v" :admin="admin" :branch="branchOf(v)" :onAction="patchCampaign"/>
      </template>
      <p v-if="!busy&&!error&&!items.length" class="ds-muted">{{ t('Gösterilecek kampanya yok. Yeni kampanya için doğrulanmış işletme sahipliği gerekir.') }}</p>
      <div class="ds-row ds-g8 ds-wrap">
        <button v-if="cursor" class="ds-btn s" @click="cursor=''">{{ t('İlk sayfa') }}</button>
        <button v-if="next" class="ds-btn s" @click="cursor=next!">{{ t('Sonraki sayfa') }}</button>
      </div>
    </template>
    <p v-if="error" role="alert" class="ds-note err">{{ t(error) }}</p>
  </section>
</template>

<style scoped>
p,h2,h3,h4,h5{margin:0}
h2,h3,h4{font:700 19px/1.3 Arimo,Arial,Helvetica,sans-serif;letter-spacing:0}
h5{font-size:15px;line-height:1.5}
.fld{display:flex;flex-direction:column;min-width:0;font-size:15px;font-weight:400}
.pg{font:700 34px/1.12 Gelasio,Georgia,serif;letter-spacing:-.68px}
.lead{font-size:15px;line-height:1.5;color:#586879}
.bar{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap}
.bar .fld{flex:1 1 280px;max-width:420px}
@media(max-width:760px){.pg{font-size:28px}.bar .fld{max-width:none}}
@media(max-width:760px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;flex:0 1 auto;max-width:100%;text-align:center}}
</style>
