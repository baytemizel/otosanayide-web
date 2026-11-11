<script setup lang="ts">
import {computed,ref} from 'vue';
import {PauseCircle,ShieldCheck} from '@lucide/vue';
import type {ActivationAction} from '@otosanayide/core/feature-activation';
import {useLocale} from '~/composables/useLocale';
import type {ActivationView} from '~/lib/feature-activation-helpers';

const props=withDefaults(defineProps<{value:ActivationView;admin?:boolean;onAction:(a:ActivationAction)=>Promise<void>}>(),{admin:false});

const {t:i18nT}=useLocale();
const quotes=ref(props.value.request?.features?.quotes??props.value.features.quotes);
const appointments=ref(props.value.request?.features?.appointments??props.value.features.appointments);
const monitor=ref(false);
const capacity=ref(false);
const reason=ref('');
const busy=ref(false);
const error=ref('');
const success=ref('');

async function send(a:ActivationAction){
  busy.value=true;
  error.value='';
  success.value='';
  try{
    await props.onAction(a);
    monitor.value=false;
    capacity.value=false;
    reason.value='';
    success.value='Aktivasyon işlemi kaydedildi.';
  }catch(e){
    error.value=e instanceof Error?e.message:'İşlem tamamlanamadı.';
  }finally{
    busy.value=false;
  }
}

const status=computed(()=>({pending:'İncelemede',approved:'Onaylandı',rejected:'Reddedildi',paused:'Durduruldu'} as Record<string,string>)[props.value.request?.status??'']??'Başvuru yok');

function submitRequest(e:Event){
  e.preventDefault();
  void send({businessId:props.value.id,version:props.value.version,action:'request',features:{quotes:quotes.value,appointments:appointments.value},monitorInbox:true,capacityReady:true});
}

function decide(action:'approve'|'reject'|'pause'){
  void send({businessId:props.value.id,version:props.value.version,action,reason:reason.value});
}
</script>

<template>
  <article class="ds-card ds-pad24 stack">
    <div class="ds-row ds-sb ds-g12">
      <h3 class="ds-f1">{{ value.name }}</h3>
      <ShieldCheck :size="20" aria-hidden="true" class="ds-i"/>
    </div>
    <h4>{{ i18nT('Sürücülere açık hizmetler') }}</h4>
    <div class="status">
      <div class="status-row"><span class="ds-small">{{ i18nT('Teklif talepleri') }}</span><span :class="['ds-badge', value.ownerReady&&value.features.quotes ? 'ok' : 'neu']">{{ i18nT(value.ownerReady&&value.features.quotes?'Açık':'Kapalı') }}</span></div>
      <div class="status-row"><span class="ds-small">{{ i18nT('Randevu') }}</span><span :class="['ds-badge', value.ownerReady&&value.features.appointments ? 'ok' : 'neu']">{{ i18nT(value.ownerReady&&value.features.appointments?'Açık':'Kapalı') }}</span></div>
      <div class="status-row"><span class="ds-small">{{ i18nT('Başvuru durumu') }}</span><span class="ds-badge info">{{ i18nT(status) }}</span></div>
    </div>
    <p v-if="value.request?.reason" class="ds-small">{{ i18nT('Gerekçe') }}: {{ value.request.reason }}</p>
    <div class="ds-note">{{ i18nT('Yeni talepler durdurulsa da mevcut kayıtların takibi, iptali ve tamamlanması korunur.') }}</div>
    <template v-if="admin">
      <h4>{{ i18nT('İstenen hizmetler') }}</h4>
      <p class="ds-small">{{ i18nT('Teklif talepleri') }}: {{ i18nT(value.request?.features?.quotes?'Açık':'Kapalı') }} · {{ i18nT('Randevu') }}: {{ i18nT(value.request?.features?.appointments?'Açık':'Kapalı') }}</p>
      <p class="ds-small">{{ i18nT('İşletme hazırlık teyidi') }}: {{ i18nT(value.request?.monitorInbox&&value.request?.capacityReady?'Tamamlandı':'Eksik') }}</p>
    </template>
    <form v-else class="stack" @submit="submitRequest">
      <h4>{{ i18nT('Hizmet aktivasyonu iste') }}</h4>
      <p class="ds-small ds-muted">{{ i18nT('Seçimin onaylanana kadar mevcut hizmet ayarları değişmez. Yeni başvuru öncekinin yerini alır.') }}</p>
      <label class="chk-row"><input v-model="quotes" class="ds-check chk" type="checkbox" :disabled="busy"/>{{ i18nT('Teklif talepleri') }}</label>
      <label class="chk-row"><input v-model="appointments" class="ds-check chk" type="checkbox" :disabled="busy"/>{{ i18nT('Randevu') }}</label>
      <label class="chk-row"><input v-model="monitor" class="ds-check chk" type="checkbox" required :disabled="busy"/>{{ i18nT('Uygulama içi talep kutusunu düzenli kontrol edip yanıtlayacağım.') }}</label>
      <label class="chk-row"><input v-model="capacity" class="ds-check chk" type="checkbox" required :disabled="busy"/>{{ i18nT('Ekibim hazır; randevularda şube başına saatlik tek kabul sınırını biliyorum.') }}</label>
      <p class="ds-xs ds-muted">{{ i18nT('Bu teyit e-posta veya push bildirimini etkinleştirmez.') }}</p>
      <div><button class="ds-btn p" :disabled="busy||!monitor||!capacity||(!quotes&&!appointments)">{{ i18nT('İncelemeye gönder') }}</button></div>
    </form>
    <label>{{ i18nT('Karar veya durdurma gerekçesi') }}<textarea v-model="reason" class="ds-field" minlength="10" maxlength="1000" :disabled="busy"></textarea></label>
    <div class="ds-row ds-wrap ds-g10">
      <template v-if="admin&&value.request?.status==='pending'">
        <button class="ds-btn p sm" :disabled="busy||reason.trim().length<10" @click="decide('approve')">{{ i18nT('Onayla') }}</button>
        <button class="ds-btn d sm" :disabled="busy||reason.trim().length<10" @click="decide('reject')">{{ i18nT('Reddet') }}</button>
      </template>
      <button class="ds-btn s sm" :disabled="busy||reason.trim().length<10" @click="decide('pause')"><PauseCircle :size="16"/>{{ i18nT('Yeni talepleri durdur') }}</button>
    </div>
    <div v-if="error" role="alert" class="ds-note err">{{ i18nT(error) }}</div>
    <div v-if="success" role="status" class="ds-note ok">{{ i18nT(success) }}</div>
  </article>
</template>

<style scoped>
p {margin: 0;}
h3 {margin: 0;}
h4 {margin: 0; font-size: 15px;}
.status {display: flex; flex-direction: column;}
.status-row {display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0;}
.stack label.chk-row {flex-direction: row; align-items: flex-start; gap: 10px; font-size: 14px; font-weight: 400;}
input.ds-check.chk {width: 20px; min-height: 0; padding: 0;}
</style>
