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
  <section class="sec ds-col ds-g12">
    <h5>{{ t('İade Uyuşmazlığı İncelemesi') }}</h5>
    <p>{{ t('Bu yalnız idari incelemedir. Kapatmak para iadesi yapmaz, tutarı veya sağlayıcının doğruladığı durumu değiştirmez.') }}</p>
    <button class="ds-btn s" :disabled="busy" @click="run()">{{ t('Uzlaştırma durumunu ve kararları yükle') }}</button>
    <template v-if="data">
      <strong role="status">{{ t(refundReviewLabels[data.status]) }}</strong>
      <small class="ds-xs ds-muted">{{ t('Sürüm') }}: {{ data.version }}</small>
      <p class="brk" v-if="data.note">{{ t('Son inceleme notu') }}: {{ data.note }}</p>
      <p v-if="!data.enabled">{{ t('Yeni uzlaştırma kararları kapalı. Geçmiş okunabilir.') }}</p>
      <label class="fld"><span class="ds-label">{{ t('Uzlaştırma karar gerekçesi') }}</span><textarea class="ds-field" v-model="note" :disabled="busy||!data.enabled" minlength="10" maxlength="1000"></textarea></label>
      <label v-if="data.status==='reviewing'" class="ck"><input v-model="ack" class="ds-check" type="checkbox" :disabled="busy||!data.enabled"/><span>{{ t('Kapatmanın yalnız inceleme kararını kaydettiğini, gerçek para iadesini doğrulamadığını anladım.') }}</span></label>
      <div class="ds-row ds-g8 ds-wrap">
        <template v-if="data.status==='reviewing'">
          <button class="ds-btn s" :disabled="disabled||note.trim()===data.note" @click="run('reviewing')">{{ t('İnceleme Notunu Kaydet') }}</button>
          <button class="ds-btn p" :disabled="disabled||!ack" @click="run('closed')">{{ t('İdari İncelemeyi Kapat') }}</button>
        </template>
        <button v-else class="ds-btn p" :disabled="disabled" @click="run('reviewing')">{{ t(data.status==='closed'?'İncelemeyi Yeniden Aç':'Uzlaştırmayı İncelemeye Al') }}</button>
      </div>
      <h5>{{ t('Uzlaştırma Kararları') }}</h5>
      <p v-if="data.history.length===0">{{ t('Henüz inceleme kararı yok.') }}</p>
      <div v-for="h in data.history" :key="h.version" class="ds-note info ds-col">
        <strong>{{ t(refundReviewLabels[h.previousStatus]) }} → {{ t(refundReviewLabels[h.status]) }}</strong>
        <p class="brk">{{ h.note }}</p>
        <small class="ds-xs ds-muted">{{ new Date(h.updatedAtMs).toLocaleString(localeTag,{timeZone:'Europe/Istanbul'}) }} · {{ t('İstanbul saati') }} · {{ t('Sürüm') }}: {{ h.version }}</small>
      </div>
      <button v-if="data.next" class="ds-btn s" :disabled="busy" @click="run(undefined,data.next!)">{{ t('Önceki kararlar') }}</button>
    </template>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <p v-if="error" role="alert" class="ds-note err">{{ t(error) }}</p>
  </section>
</template>

<style scoped>
.ck{display:flex;gap:8px;align-items:flex-start;font-size:13px}
input.ds-check{min-height:0;padding:0;width:20px}
p,h2,h3,h4,h5{margin:0}
h2,h3,h4{font:700 19px/1.3 Arimo,Arial,Helvetica,sans-serif;letter-spacing:0}
h5{font-size:15px;line-height:1.5}
.fld{display:flex;flex-direction:column;min-width:0;font-size:15px;font-weight:400}
.sec{border-top:1px solid #edf0f3;padding-top:20px}
.brk{overflow-wrap:anywhere}
@media(max-width:760px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;flex:0 1 auto;max-width:100%;text-align:center}}
</style>
