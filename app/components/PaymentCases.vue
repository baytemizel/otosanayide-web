<script setup lang="ts">
import {ref} from 'vue';
import type {PaymentCaseView} from '@otosanayide/core/payment-cases';
import PaymentCaseCard from '~/components/PaymentCaseCard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {CaseWithAmounts} from '~/lib/payment-cases-helpers';

const sample:PaymentCaseView={id:'a'.repeat(64),status:'open',reason:'expired_or_released',version:0,createdAtMs:1792393200000,note:''};

const {t}=useLocale();
const app=useApp();
const items=ref<CaseWithAmounts[]>([]);
const after=ref<string|undefined>();
const next=ref<string|null>(null);
const revision=ref(0);
const busy=ref(false);
const saving=ref(false);
const saved=ref('');
const error=ref('');

useClientEffect(()=>[app.user,app.demo,after.value,revision.value],()=>{
  let stopped=false;
  items.value=[];
  next.value=null;
  error.value='';
  saved.value='';
  if(app.demo){
    items.value=[sample];
    return;
  }
  const user=app.user;
  if(!user)return;
  busy.value=true;
  user.getIdToken().then(token=>apiFetch('/api/admin/payment-cases'+(after.value?'?after='+after.value:''),{headers:{Authorization:`Bearer ${token}`}})).then(async r=>{
    const d=await r.json();
    if(!r.ok)throw Error(d.error);
    if(!stopped){
      items.value=d.items;
      next.value=d.next;
    }
  }).catch(e=>{if(!stopped)error.value=e.message;}).finally(()=>{if(!stopped)busy.value=false;});
  return()=>{stopped=true;};
});

async function saveCase(item:CaseWithAmounts,status:PaymentCaseView['status'],note:string){
  saving.value=true;
  try{
    const r=await apiFetch('/api/admin/payment-cases',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await app.user?.getIdToken()}`},body:JSON.stringify({id:item.id,version:item.version,status,note})});
    const d=await r.json();
    if(!r.ok)throw Error(d.error);
    items.value=items.value.map(v=>v.id===item.id?{...v,...d.item}:v);
    saved.value='İnceleme kararı kaydedildi.';
  }finally{
    saving.value=false;
  }
}
</script>

<template>
  <section class="stack">
    <h2>{{ t('Ödeme incelemeleri') }}</h2>
    <p class="notice">{{ t('Bu ekran inceleme durumunu kaydeder. Para iadesi yapmaz, ödeme tutarını değiştirmez ve reklam başlatmaz.') }}</p>
    <p>{{ t('Dosyalar referans sırasıyla, sayfa başına 20 kayıt gösterilir.') }}</p>
    <p v-if="app.demo" class="notice">{{ t('Örnek ödeme dosyasıdır. Gerçek tahsilat yoktur.') }}</p>
    <div class="row">
      <button class="button secondary" :disabled="busy||saving" @click="after=undefined;revision++">{{ t('İlk sayfa / Yenile') }}</button>
      <button v-if="next" class="button secondary" :disabled="busy||saving" @click="after=next!">{{ t('Sonraki sayfa') }}</button>
    </div>
    <p v-if="saved" role="status">{{ t(saved) }}</p>
    <p v-if="error" role="alert" class="error">{{ t(error) }}</p>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <p v-else-if="!items.length&&!error">{{ t(app.user||app.demo?'Ödeme inceleme dosyası bulunamadı.':'Giriş yap') }}</p>
    <PaymentCaseCard v-for="item in items" :key="`${item.id}-${item.version}`" :item="item" :demo="app.demo" :locked="saving" :onSave="(status,note)=>saveCase(item,status,note)"/>
  </section>
</template>
