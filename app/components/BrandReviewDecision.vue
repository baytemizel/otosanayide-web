<script setup lang="ts">
import {ref} from 'vue';
import {brandReviewAction,type BrandReviewView,type brandHistoryView} from '@otosanayide/core/brand-payment-review';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';

const labels:Record<string,string>={open:'Açık dosya',reviewing:'İnceleniyor',refund_required:'İade incelemesi gerekli',closed:'Dosya kapatıldı',unknown:'Bilgi yok'};

const props=defineProps<{item:BrandReviewView;onSaved:(d:{status:any;version:number;note:string})=>void}>();

const app=useApp();
const {t,localeTag}=useLocale();
const status=ref(props.item.status);
const note=ref('');
const busy=ref(false);
const error=ref('');
const history=ref<ReturnType<typeof brandHistoryView>[]|null>(null);
const next=ref<number|null>(null);
let lock=false;

async function run(save:boolean,before?:number){
  if(lock)return;
  lock=true;
  busy.value=true;
  error.value='';
  try{
    const payload=save?brandReviewAction.safeParse({id:props.item.id,version:props.item.version,status:status.value,note:note.value}):null;
    if(save&&(!payload?.success||status.value===props.item.status))throw Error('Yeni bir durum seç ve en az 10 karakter gerekçe yaz.');
    const r=await apiFetch('/api/admin/brand-payment-review'+(save?'':'?'+new URLSearchParams({caseId:props.item.id,...(before?{before:String(before)}:{})})),{method:save?'PATCH':'GET',headers:{Authorization:`Bearer ${await app.user?.getIdToken()}`,...(save?{'Content-Type':'application/json'}:{})},body:save?JSON.stringify(payload!.data):undefined,cache:'no-store'}),d=await r.json();
    if(!r.ok)throw Error(d.error);
    if(save)props.onSaved(d.decision);
    else{
      history.value=d.history;
      next.value=d.next;
    }
  }catch(e){
    error.value=e instanceof Error?e.message:'İşlem tamamlanamadı. Daha sonra tekrar deneyin.';
  }finally{
    lock=false;
    busy.value=false;
  }
}

function submit(e:Event){
  e.preventDefault();
  void run(true);
}
</script>

<template>
  <div class="stack">
    <p v-if="item.note">{{ t('Son inceleme notu') }}: {{ item.note }}</p>
    <form v-if="item.status!=='unknown'" class="stack" @submit="submit">
      <fieldset class="form-grid" :disabled="busy" :style="{border:0,padding:0,minWidth:0}">
        <label>{{ t('İnceleme durumu') }}<select v-model="status"><option v-for="v in Object.keys(labels).filter(v=>v!=='unknown')" :key="v" :value="v">{{ t(labels[v]!) }}</option></select></label>
        <label class="span-all">{{ t('Karar gerekçesi') }}<textarea v-model="note" minlength="10" maxlength="1000" required></textarea></label>
      </fieldset>
      <button class="button primary" :disabled="busy||status===item.status">{{ t('İnceleme kararını kaydet') }}</button>
    </form>
    <div class="row" :style="{flexWrap:'wrap'}">
      <button class="button secondary" :disabled="busy" @click="run(false)">{{ t('Karar geçmişini yenile') }}</button>
      <button v-if="next" class="button secondary" :disabled="busy" @click="run(false,next!)">{{ t('Önceki kararlar') }}</button>
    </div>
    <p v-if="history?.length===0">{{ t('Henüz inceleme kararı yok.') }}</p>
    <div v-for="h in history" :key="h.version" class="notice">
      <strong>{{ t(labels[h.previousStatus]!) }} → {{ t(labels[h.status]!) }}</strong>
      <p>{{ h.note }}</p>
      <small>{{ new Date(h.updatedAtMs).toLocaleString(localeTag,{timeZone:'Europe/Istanbul'}) }} · {{ t('İstanbul saati') }} · {{ t('Sürüm') }}: {{ h.version }}</small>
    </div>
    <p v-if="busy" role="status">{{ t('Yükleniyor…') }}</p>
    <p v-if="error" role="alert" class="error">{{ t(error) }}</p>
  </div>
</template>
