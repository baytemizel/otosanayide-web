<script setup lang="ts">
import {computed,ref} from 'vue';
import type {z} from 'zod';
import {refundReviewResponse,refundReviewAction,refundReviewLabels} from '@otosanayide/core/brand-refund-review';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';

const props=defineProps<{reservationId:string;eventId:string}>();

const app=useApp();
const {t,localeTag}=useLocale();
const data=ref<z.infer<typeof refundReviewResponse>|null>(null);
const note=ref('');
const ack=ref(false);
const busy=ref(false);
const error=ref('');
let lock=false;

async function run(status?:'reviewing'|'closed',before?:number){
  if(lock)return;
  lock=true;
  busy.value=true;
  error.value='';
  try{
    const payload=status?refundReviewAction.parse({reservationId:props.reservationId,eventId:props.eventId,version:data.value?.version,status,note:note.value,acknowledged:ack.value}):null;
    const query=new URLSearchParams({reservationId:props.reservationId,eventId:props.eventId,...(before?{before:String(before)}:{})});
    const r=await apiFetch('/api/admin/brand-refund-review'+(payload?'':'?'+query),{method:payload?'PATCH':'GET',headers:{Authorization:`Bearer ${await app.user?.getIdToken()}`,...(payload?{'Content-Type':'application/json'}:{})},body:payload?JSON.stringify(payload):undefined,cache:'no-store'}),raw=await r.json();
    if(!r.ok)throw Error(raw.error);
    const d=refundReviewResponse.parse(raw);
    if(d.reservationId!==props.reservationId||d.eventId!==props.eventId)throw Error('Kayıt değişti. Sayfayı yenile.');
    data.value=d;
    note.value='';
    ack.value=false;
  }catch(e){
    data.value=null;
    ack.value=false;
    error.value=e instanceof Error&&!e.message.startsWith('[')?e.message:'Bilgileri kontrol edin.';
  }finally{
    lock=false;
    busy.value=false;
  }
}

const disabled=computed(()=>busy.value||!data.value?.enabled||note.value.trim().length<10);
</script>

<template>
  <section class="panel stack">
    <h5>{{ t('İade Uyuşmazlığı İncelemesi') }}</h5>
    <p>{{ t('Bu yalnız idari incelemedir. Kapatmak para iadesi yapmaz, tutarı veya sağlayıcının doğruladığı durumu değiştirmez.') }}</p>
    <button class="button secondary" :disabled="busy" @click="run()">{{ t('Uzlaştırma durumunu ve kararları yükle') }}</button>
    <template v-if="data">
      <strong role="status">{{ t(refundReviewLabels[data.status]) }}</strong>
      <small>{{ t('Sürüm') }}: {{ data.version }}</small>
      <p v-if="data.note" :style="{overflowWrap:'anywhere'}">{{ t('Son inceleme notu') }}: {{ data.note }}</p>
      <p v-if="!data.enabled">{{ t('Yeni uzlaştırma kararları kapalı. Geçmiş okunabilir.') }}</p>
      <label>{{ t('Uzlaştırma karar gerekçesi') }}<textarea v-model="note" :disabled="busy||!data.enabled" minlength="10" maxlength="1000"></textarea></label>
      <label v-if="data.status==='reviewing'" class="evidence-attestation"><input v-model="ack" type="checkbox" :disabled="busy||!data.enabled"/><span>{{ t('Kapatmanın yalnız inceleme kararını kaydettiğini, gerçek para iadesini doğrulamadığını anladım.') }}</span></label>
      <div class="row" :style="{flexWrap:'wrap'}">
        <template v-if="data.status==='reviewing'">
          <button class="button secondary" :disabled="disabled||note.trim()===data.note" @click="run('reviewing')">{{ t('İnceleme Notunu Kaydet') }}</button>
          <button class="button primary" :disabled="disabled||!ack" @click="run('closed')">{{ t('İdari İncelemeyi Kapat') }}</button>
        </template>
        <button v-else class="button primary" :disabled="disabled" @click="run('reviewing')">{{ t(data.status==='closed'?'İncelemeyi Yeniden Aç':'Uzlaştırmayı İncelemeye Al') }}</button>
      </div>
      <h5>{{ t('Uzlaştırma Kararları') }}</h5>
      <p v-if="data.history.length===0">{{ t('Henüz inceleme kararı yok.') }}</p>
      <div v-for="h in data.history" :key="h.version" class="notice stack">
        <strong>{{ t(refundReviewLabels[h.previousStatus]) }} → {{ t(refundReviewLabels[h.status]) }}</strong>
        <p :style="{overflowWrap:'anywhere'}">{{ h.note }}</p>
        <small>{{ new Date(h.updatedAtMs).toLocaleString(localeTag,{timeZone:'Europe/Istanbul'}) }} · {{ t('İstanbul saati') }} · {{ t('Sürüm') }}: {{ h.version }}</small>
      </div>
      <button v-if="data.next" class="button secondary" :disabled="busy" @click="run(undefined,data.next!)">{{ t('Önceki kararlar') }}</button>
    </template>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <p v-if="error" role="alert" class="error">{{ t(error) }}</p>
  </section>
</template>
