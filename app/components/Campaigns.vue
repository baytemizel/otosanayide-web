<script setup lang="ts">
import {ref} from 'vue';
import type {CampaignView,CampaignAction} from '@otosanayide/core/campaigns';
import CampaignCard from '~/components/CampaignCard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
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
    const d=await r.json();
    if(!r.ok)throw Error(d.error);
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
    const d=await r.json();
    if(!r.ok)throw Error(d.error);
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
  const d=await r.json();
  if(!r.ok)throw Error(d.error);
  items.value=items.value.map(item=>item.id===d.item.id?d.item:item);
}
</script>

<template>
  <section class="stack">
    <p>{{ t('Ücretsiz işletme profilin korunur. Reklam yalnızca ilgili şehir ve kategoride sponsor etiketiyle gösterilir.') }}</p>
    <template v-if="app.demo">
      <p v-if="admin" class="notice">{{ t('Önizlemede kampanya onayı veya ödeme yapılmaz.') }}</p>
      <CampaignCard v-else :value="newCampaign(demoBranch,'00000000-0000-4000-8000-000000000001')" :branch="demoBranch" demo :onAction="async()=>{}"/>
    </template>
    <p v-else-if="!app.user">{{ t('Giriş yap') }}</p>
    <template v-else>
      <label v-if="admin">{{ t('Başvuru durumu') }}<select :value="state" @change="state=($event.target as HTMLSelectElement).value;cursor=''"><option v-for="[key,label] in Object.entries(campaignLabels)" :key="key" :value="key">{{ t(label) }}</option></select></label>
      <label v-else>{{ t('İşletme') }}<select :value="bid" @change="bid=($event.target as HTMLSelectElement).value;cursor=''"><option v-for="b in branches" :key="b.id" :value="b.id">{{ b.name }}</option></select></label>
      <div class="row">
        <button class="button secondary" :disabled="busy" @click="reload++">{{ t('Yenile') }}</button>
        <button v-if="!admin&&bid" class="button primary" :disabled="busy||items.some(v=>v.version===0)" @click="addCampaign()">{{ t('Yeni kampanya') }}</button>
      </div>
      <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
      <template v-else>
        <CampaignCard v-for="v in items" :key="`${v.id}-${v.version}`" :value="v" :admin="admin" :branch="branchOf(v)" :onAction="patchCampaign"/>
      </template>
      <p v-if="!busy&&!error&&!items.length">{{ t('Gösterilecek kampanya yok. Yeni kampanya için doğrulanmış işletme sahipliği gerekir.') }}</p>
      <div class="row">
        <button v-if="cursor" class="button secondary" @click="cursor=''">{{ t('İlk sayfa') }}</button>
        <button v-if="next" class="button secondary" @click="cursor=next!">{{ t('Sonraki sayfa') }}</button>
      </div>
    </template>
    <p v-if="error" role="alert" class="error">{{ t(error) }}</p>
  </section>
</template>
