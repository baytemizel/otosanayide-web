<script setup lang="ts">
import {ref} from 'vue';
import type {ActivationAction} from '@otosanayide/core/feature-activation';
import ActivationCard from '~/components/ActivationCard.vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {responseJson} from '~/lib/response-json';
import type {ActivationView} from '~/lib/feature-activation-helpers';

const stateLabels={pending:'İncelemede',approved:'Onaylandı',rejected:'Reddedildi',paused:'Durduruldu'};

const props=withDefaults(defineProps<{admin?:boolean}>(),{admin:false});

const app=useApp();
const {t:i18nT}=useLocale();
const branches=ref<{id:string;name:string}[]>([]);
const bid=ref('');
const items=ref<ActivationView[]>([]);
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
    const d=await responseJson(r);
    if(!r.ok)throw Error(d.error);
    if(!stop){
      const owners=d.businesses.filter((v:{role?:string})=>v.role==='owner');
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
  user.getIdToken().then(token=>apiFetch(`/api/businesses/activation?${props.admin?`queue=true&status=${state.value}&after=${encodeURIComponent(cursor.value)}`:`businessId=${encodeURIComponent(bid.value)}`}`,{headers:{Authorization:`Bearer ${token}`}})).then(async r=>{
    const d=await responseJson(r);
    if(!r.ok)throw Error(d.error);
    if(!stop){
      items.value=props.admin?d.items:[d];
      next.value=d.next??null;
    }
  }).catch(e=>{if(!stop)error.value=e.message;}).finally(()=>{if(!stop)busy.value=false;});
  return()=>{stop=true;};
});

async function patchActivation(a:ActivationAction){
  const r=await apiFetch('/api/businesses/activation',{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await app.user!.getIdToken()}`},body:JSON.stringify(a)});
  const d=await responseJson(r);
  if(!r.ok)throw Error(d.error);
  reload.value++;
}
</script>

<template>
  <section class="ds-col ds-g16">
    <p class="ds-small ds-muted">{{ i18nT('Sahiplik doğrulaması tek başına teklif veya randevuyu açmaz. İşletme hazırlığı ve yönetici onayı gerekir.') }}</p>
    <div v-if="app.demo" class="ds-note">{{ i18nT('Önizlemede hizmetler etkinleştirilmez. Gerçek işletme hesabı ve sunucu bağlantısı gerekir.') }}</div>
    <div v-else-if="!app.user"><NuxtLink class="ds-btn s sm" to="/giris">{{ i18nT('Giriş yap') }}</NuxtLink></div>
    <template v-else>
      <div class="ds-row ds-wrap ds-g12 toolbar">
        <label v-if="admin" class="ds-col ds-f1 field"><span class="ds-label">{{ i18nT('Başvuru durumu') }}</span><select class="ds-field" :value="state" @change="state=($event.target as HTMLSelectElement).value;cursor=''"><option v-for="[key,label] in Object.entries(stateLabels)" :key="key" :value="key">{{ i18nT(label) }}</option></select></label>
        <label v-else class="ds-col ds-f1 field"><span class="ds-label">{{ i18nT('İşletme') }}</span><select v-model="bid" class="ds-field"><option v-for="v in branches" :key="v.id" :value="v.id">{{ v.name }}</option></select></label>
        <button class="ds-btn s sm" :disabled="busy" @click="reload++">{{ i18nT('Yenile') }}</button>
      </div>
      <p v-if="busy" role="status" class="ds-small ds-muted">{{ i18nT('Yükleniyor…') }}</p>
      <template v-else>
        <ActivationCard v-for="v in items" :key="`${v.id}-${v.version}`" :value="v" :admin="admin" :onAction="patchActivation"/>
      </template>
      <p v-if="!busy&&!error&&!items.length" class="ds-small ds-muted">{{ i18nT('Gösterilecek aktivasyon kaydı yok. Yalnızca işletme sahibi başvurabilir.') }}</p>
      <div v-if="cursor || next" class="ds-row ds-wrap ds-g10">
        <button v-if="cursor" class="ds-btn s sm" @click="cursor=''">{{ i18nT('İlk sayfa') }}</button>
        <button v-if="next" class="ds-btn s sm" @click="cursor=next!">{{ i18nT('Sonraki sayfa') }}</button>
      </div>
    </template>
    <div v-if="error" role="alert" class="ds-note err">{{ i18nT(error) }}</div>
  </section>
</template>

<style scoped>
p {margin: 0;}
.toolbar {align-items: flex-end;}
.field {min-width: 240px; max-width: 480px;}
</style>
