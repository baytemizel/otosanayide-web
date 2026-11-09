<script setup lang="ts">
import {ref} from 'vue';
import {paymentCaseAction,paymentCaseReasons,paymentCaseStatuses,type PaymentCaseView} from '@otosanayide/core/payment-cases';
import {useLocale} from '~/composables/useLocale';
import type {CaseWithAmounts} from '~/lib/payment-cases-helpers';

const labels={open:'Açık dosya',reviewing:'İnceleniyor',refund_required:'İade incelemesi gerekli',closed:'Dosya kapatıldı'};
const amountKeys=['expected','received'] as const;

const props=withDefaults(defineProps<{item:CaseWithAmounts;onSave:(status:PaymentCaseView['status'],note:string)=>Promise<void>;demo?:boolean;locked?:boolean}>(),{demo:false,locked:false});

const {t,locale}=useLocale();
const status=ref(props.item.status);
const note=ref('');
const busy=ref(false);
const error=ref('');
const message=ref('');
let lock=false;

async function save(e:Event){
  e.preventDefault();
  if(lock)return;
  lock=true;
  busy.value=true;
  error.value='';
  message.value='';
  try{
    const v=paymentCaseAction.safeParse({id:props.item.id,version:props.item.version,status:status.value,note:note.value});
    if(!v.success||status.value===props.item.status)throw Error('Yeni bir durum seç ve en az 10 karakter gerekçe yaz.');
    if(props.demo)message.value='Örnek karar kontrol edildi. Ödeme veya dosya değiştirilmedi.';
    else{
      await props.onSave(status.value,v.data.note);
      message.value='İnceleme kararı kaydedildi.';
      note.value='';
    }
  }catch(e){
    error.value=e instanceof Error?e.message:'İşlem tamamlanamadı. Daha sonra tekrar deneyin.';
  }finally{
    lock=false;
    busy.value=false;
  }
}
</script>

<template>
  <form class="panel stack" @submit="save">
    <div class="row">
      <strong>{{ t(paymentCaseReasons[item.reason]??'Diğer ödeme uyuşmazlığı') }}</strong>
      <span class="badge">{{ t(labels[item.status]) }}</span>
    </div>
    <p class="small muted" :style="{overflowWrap:'anywhere'}">{{ t('Dosya referansı') }}: {{ item.id }}</p>
    <p>{{ new Intl.DateTimeFormat(locale==='en'?'en-GB':'tr-TR',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Istanbul'}).format(item.createdAtMs) }}</p>
    <div class="form-grid">
      <p v-for="k in amountKeys" :key="k">{{ t(k==='expected'?'Reklam tutarı':'Alınan ödeme') }}: <strong>{{ item[k]?new Intl.NumberFormat(locale==='en'?'en-GB':'tr-TR',{style:'currency',currency:item[k]!.currency}).format(item[k]!.minor/100):t('Bilgi yok') }}</strong></p>
    </div>
    <p v-if="item.note">{{ t('Son inceleme notu') }}: {{ item.note }}</p>
    <fieldset class="form-grid" :disabled="busy||locked" :style="{border:0,padding:0,minWidth:0}">
      <label>{{ t('İnceleme durumu') }}<select v-model="status"><option v-for="v in paymentCaseStatuses" :key="v" :value="v">{{ t(labels[v]) }}</option></select></label>
      <label class="span-all">{{ t('Karar gerekçesi') }}<textarea v-model="note" required minlength="10" maxlength="1000"></textarea></label>
    </fieldset>
    <button class="button primary" :disabled="busy||locked">{{ t(demo?'Örnek kararı kontrol et':'İnceleme kararını kaydet') }}</button>
    <p v-if="error" class="error" role="alert">{{ t(error) }}</p>
    <p v-if="message" role="status">{{ t(message) }}</p>
  </form>
</template>
