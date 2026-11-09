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
  <article class="panel stack">
    <div class="row between">
      <h2>{{ value.name }}</h2>
      <ShieldCheck aria-hidden="true"/>
    </div>
    <h3>{{ i18nT('Sürücülere açık hizmetler') }}</h3>
    <div class="two-columns">
      <p>{{ i18nT('Teklif talepleri') }}: <strong>{{ i18nT(value.ownerReady&&value.features.quotes?'Açık':'Kapalı') }}</strong></p>
      <p>{{ i18nT('Randevu') }}: <strong>{{ i18nT(value.ownerReady&&value.features.appointments?'Açık':'Kapalı') }}</strong></p>
    </div>
    <p>{{ i18nT('Başvuru durumu') }}: <strong>{{ i18nT(status) }}</strong></p>
    <p v-if="value.request?.reason">{{ i18nT('Gerekçe') }}: {{ value.request.reason }}</p>
    <p class="notice">{{ i18nT('Yeni talepler durdurulsa da mevcut kayıtların takibi, iptali ve tamamlanması korunur.') }}</p>
    <template v-if="admin">
      <h3>{{ i18nT('İstenen hizmetler') }}</h3>
      <p>{{ i18nT('Teklif talepleri') }}: {{ i18nT(value.request?.features?.quotes?'Açık':'Kapalı') }} · {{ i18nT('Randevu') }}: {{ i18nT(value.request?.features?.appointments?'Açık':'Kapalı') }}</p>
      <p>{{ i18nT('İşletme hazırlık teyidi') }}: {{ i18nT(value.request?.monitorInbox&&value.request?.capacityReady?'Tamamlandı':'Eksik') }}</p>
    </template>
    <form v-else class="stack" @submit="submitRequest">
      <h3>{{ i18nT('Hizmet aktivasyonu iste') }}</h3>
      <p>{{ i18nT('Seçimin onaylanana kadar mevcut hizmet ayarları değişmez. Yeni başvuru öncekinin yerini alır.') }}</p>
      <label class="row"><input v-model="quotes" type="checkbox" :disabled="busy"/>{{ i18nT('Teklif talepleri') }}</label>
      <label class="row"><input v-model="appointments" type="checkbox" :disabled="busy"/>{{ i18nT('Randevu') }}</label>
      <label class="row"><input v-model="monitor" type="checkbox" required :disabled="busy"/>{{ i18nT('Uygulama içi talep kutusunu düzenli kontrol edip yanıtlayacağım.') }}</label>
      <label class="row"><input v-model="capacity" type="checkbox" required :disabled="busy"/>{{ i18nT('Ekibim hazır; randevularda şube başına saatlik tek kabul sınırını biliyorum.') }}</label>
      <p class="small muted">{{ i18nT('Bu teyit e-posta veya push bildirimini etkinleştirmez.') }}</p>
      <button class="button primary" :disabled="busy||!monitor||!capacity||(!quotes&&!appointments)">{{ i18nT('İncelemeye gönder') }}</button>
    </form>
    <label>{{ i18nT('Karar veya durdurma gerekçesi') }}<textarea v-model="reason" minlength="10" maxlength="1000" :disabled="busy"></textarea></label>
    <div class="row" :style="{flexWrap:'wrap'}">
      <template v-if="admin&&value.request?.status==='pending'">
        <button class="button primary" :disabled="busy||reason.trim().length<10" @click="decide('approve')">{{ i18nT('Onayla') }}</button>
        <button class="button secondary" :disabled="busy||reason.trim().length<10" @click="decide('reject')">{{ i18nT('Reddet') }}</button>
      </template>
      <button class="button secondary" :disabled="busy||reason.trim().length<10" @click="decide('pause')"><PauseCircle :size="18"/>{{ i18nT('Yeni talepleri durdur') }}</button>
    </div>
    <p v-if="error" role="alert" class="error">{{ i18nT(error) }}</p>
    <p v-if="success" role="status">{{ i18nT(success) }}</p>
  </article>
</template>
