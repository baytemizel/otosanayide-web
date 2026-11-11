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
const tones={open:'warn',reviewing:'info',refund_required:'err',closed:'neu'};
const open=ref(false);
</script>

<template>
  <tbody>
    <tr>
      <td :data-label="t('Sipariş')">
        <small class="ds-xs ds-muted">{{ t('Dosya referansı') }}</small>
        <strong class="brk">{{ item.id }}</strong>
        <small class="ds-xs ds-muted">{{ new Intl.DateTimeFormat(locale==='en'?'en-GB':'tr-TR',{dateStyle:'medium',timeStyle:'short',timeZone:'Europe/Istanbul'}).format(item.createdAtMs) }}</small>
      </td>
      <td :data-label="t('Tutar')">
        <div v-for="k in amountKeys" :key="k" class="ds-xs"><span class="ds-muted">{{ t(k==='expected'?'Reklam tutarı':'Alınan ödeme') }}:</span> <strong>{{ item[k]?new Intl.NumberFormat(locale==='en'?'en-GB':'tr-TR',{style:'currency',currency:item[k]!.currency}).format(item[k]!.minor/100):t('Bilgi yok') }}</strong></div>
      </td>
      <td :data-label="t('Durum')"><span :class="['ds-badge',tones[item.status]]">{{ t(labels[item.status]) }}</span></td>
      <td :data-label="t('Kanıt')"><span class="ds-xs">{{ t(paymentCaseReasons[item.reason]??'Diğer ödeme uyuşmazlığı') }}</span></td>
      <td><button type="button" class="ds-btn s sm" :aria-expanded="open" @click="open=!open">{{ t('İncele') }}</button></td>
    </tr>
    <tr v-show="open">
      <td colspan="5" class="fcell">
        <form class="ds-col ds-g12" @submit="save">
          <p v-if="item.note" class="ds-small">{{ t('Son inceleme notu') }}: {{ item.note }}</p>
          <fieldset class="grid fs" :disabled="busy||locked">
            <label class="fld"><span class="ds-label">{{ t('İnceleme durumu') }}</span><select v-model="status" class="ds-field"><option v-for="v in paymentCaseStatuses" :key="v" :value="v">{{ t(labels[v]) }}</option></select></label>
            <label class="fld all"><span class="ds-label">{{ t('Karar gerekçesi') }}</span><textarea v-model="note" class="ds-field" required minlength="10" maxlength="1000"></textarea></label>
          </fieldset>
          <div><button class="ds-btn p" :disabled="busy||locked">{{ t(demo?'Örnek kararı kontrol et':'İnceleme kararını kaydet') }}</button></div>
          <p v-if="error" class="ds-note err" role="alert">{{ t(error) }}</p>
          <p v-if="message" class="ds-note ok" role="status">{{ t(message) }}</p>
        </form>
      </td>
    </tr>
  </tbody>
</template>

<style scoped>
p,h2,h3,h4,h5{margin:0}
h2,h3,h4{font:700 19px/1.3 Arimo,Arial,Helvetica,sans-serif;letter-spacing:0}
h5{font-size:15px;line-height:1.5}
.fld{display:flex;flex-direction:column;min-width:0;font-size:15px;font-weight:400}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 12px}
.all{grid-column:1/-1}
@media(max-width:760px){.grid{grid-template-columns:minmax(0,1fr)}}
.fs{border:0;padding:0;margin:0;min-width:0}
.brk{overflow-wrap:anywhere}
.fcell{background:#f7f9fa}
@media(max-width:760px){tbody,tr,tr td{display:block}tr td{border:0;padding:6px 16px}tbody{border-bottom:1px solid #edf0f3;padding:10px 0}tr td[data-label]::before{content:attr(data-label);display:block;font-size:12px;font-weight:700;color:#586879;text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px}}
@media(max-width:760px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;flex:0 1 auto;max-width:100%;text-align:center}}
</style>
