<script setup lang="ts">
import {ref} from 'vue';
import type {PaymentCaseView} from '@otosanayide/core/payment-cases';
import PaymentCaseCard from '~/components/PaymentCaseCard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {paymentCasePage, paymentCaseSaved, readAdResponse} from '~/lib/ads-client';
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
    const d=await readAdResponse(r,raw=>paymentCasePage.parse(raw));
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
    const d=await readAdResponse(r,raw=>paymentCaseSaved.parse(raw));
    items.value=items.value.map(v=>v.id===item.id?{...v,...d.item}:v);
    saved.value='İnceleme kararı kaydedildi.';
  }finally{
    saving.value=false;
  }
}
</script>

<template>
  <section class="ds-col ds-g20">
    <div class="ds-card">
      <div class="hd">
        <h2>{{ t('Ödeme ve iade incelemesi') }}</h2>
        <div class="ds-seg">
          <button type="button" class="ds-passive" disabled aria-disabled="true" :title="t('Yakında')">{{ t('Açık') }}</button>
          <button type="button" class="ds-passive" disabled aria-disabled="true" :title="t('Yakında')">{{ t('Kapanan') }}</button>
        </div>
      </div>
      <div class="body ds-col ds-g12">
        <p class="ds-note info">{{ t('Bu ekran inceleme durumunu kaydeder. Para iadesi yapmaz, ödeme tutarını değiştirmez ve reklam başlatmaz.') }}</p>
        <p v-if="app.demo" class="ds-note info">{{ t('Örnek ödeme dosyasıdır. Gerçek tahsilat yoktur.') }}</p>
        <div class="ds-row ds-g8 ds-wrap">
          <button class="ds-btn s sm" :disabled="busy||saving" @click="after=undefined;revision++">{{ t('İlk sayfa / Yenile') }}</button>
          <button v-if="next" class="ds-btn s sm" :disabled="busy||saving" @click="after=next!">{{ t('Sonraki sayfa') }}</button>
        </div>
        <p v-if="saved" role="status" class="ds-note ok">{{ t(saved) }}</p>
        <p v-if="error" role="alert" class="ds-note err">{{ t(error) }}</p>
        <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
        <p v-else-if="!items.length&&!error" class="ds-muted">{{ t(app.user||app.demo?'Ödeme inceleme dosyası bulunamadı.':'Giriş yap') }}</p>
      </div>
      <div v-if="items.length" class="ds-table-wrap">
        <table class="ds-table">
          <thead class="tt"><tr><th>{{ t('Sipariş') }}</th><th>{{ t('Tutar') }}</th><th>{{ t('Durum') }}</th><th>{{ t('Kanıt') }}</th><th><span class="sr">{{ t('İşlem') }}</span></th></tr></thead>
          <PaymentCaseCard v-for="item in items" :key="`${item.id}-${item.version}`" :item="item" :demo="app.demo" :locked="saving" :onSave="(status,note)=>saveCase(item,status,note)"/>
        </table>
      </div>
    </div>
    <p class="ds-xs ds-muted">{{ t('Dosyalar referans sırasıyla, sayfa başına 20 kayıt gösterilir.') }}</p>
  </section>
</template>

<style scoped>
p,h2,h3,h4,h5{margin:0}
h2,h3,h4{font:700 19px/1.3 Arimo,Arial,Helvetica,sans-serif;letter-spacing:0}
h5{font-size:15px;line-height:1.5}
.hd{padding:20px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.body{padding:0 20px 20px}
.ds-passive{cursor:not-allowed}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
@media(max-width:760px){table.ds-table,thead.tt{display:block}thead.tt{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}}
@media(max-width:760px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;flex:0 1 auto;max-width:100%;text-align:center}}
</style>
