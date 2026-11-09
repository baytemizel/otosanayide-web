<script setup lang="ts">
import {ref} from 'vue';
import {fetchHostedCheckout} from '@otosanayide/core/hosted-checkout';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch,apiOrigin} from '~/lib/api';

const props=withDefaults(defineProps<{kind:'business'|'brand';reservationId:string;disabled?:boolean}>(),{disabled:false});

const app=useApp();
const {locale,t}=useLocale();
const busy=ref(false);
const failed=ref(false);
let lock=false;
let live=true;

useClientEffect(()=>[],()=>{
  live=true;
  return()=>{live=false;};
});

async function open(){
  const user=app.user;
  if(!user||lock)return;
  lock=true;
  busy.value=true;
  const session=app.accountGuard(user.uid),guard=()=>{
    if(!live)throw Error('session_changed');
    session();
  };
  try{
    const v=await fetchHostedCheckout({origin:apiOrigin(),request:apiFetch,locale:locale.value,token:()=>user.getIdToken(),guard},{kind:props.kind,reservationId:props.reservationId});
    guard();
    window.location.assign(v.session.url);
  }catch{
    if(live)failed.value=true;
  }finally{
    lock=false;
    if(live)busy.value=false;
  }
}
</script>

<template>
  <div v-if="app.user?.emailVerified&&!app.demo" class="stack">
    <p class="small muted">{{ t('Kart bilgilerini ödeme sağlayıcısının güvenli sayfasında girersin. Bu uygulama kart bilgilerini saklamaz.') }}</p>
    <button type="button" class="button primary" :disabled="disabled||busy||failed" @click="open()">{{ t(busy?'Ödeme sayfası hazırlanıyor…':'Kartla ödeme sayfasını aç') }}</button>
    <p v-if="failed" role="alert" class="error">{{ t('Ödeme sayfası açılamadı. Rezervasyonu ve ödeme durumunu yenile; otomatik tekrar yapılmadı.') }}</p>
  </div>
</template>
