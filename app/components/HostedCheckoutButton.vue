<script setup lang="ts">
import {ref} from 'vue';
import {Lock} from '@lucide/vue';
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
  <div v-if="app.user?.emailVerified&&!app.demo" class="ds-col ds-g12">
    <div class="ds-card ds-pad24 ds-row ds-g16 prov">
      <span class="lk ds-surface"><Lock :size="20" :stroke-width="1.8" aria-hidden="true"/></span>
      <div class="ds-col ds-f1">
        <strong class="pt">{{ t('Güvenli ödeme sağlayıcı sayfası') }}</strong>
        <p class="ds-small ds-muted">{{ t('Kart bilgilerini ödeme sağlayıcısının güvenli sayfasında girersin. Bu uygulama kart bilgilerini saklamaz.') }}</p>
      </div>
    </div>
    <button type="button" class="ds-btn p w" :disabled="disabled||busy||failed" @click="open()">{{ t(busy?'Ödeme sayfası hazırlanıyor…':'Kartla ödeme sayfasını aç') }}</button>
    <p v-if="failed" role="alert" class="ds-note err">{{ t('Ödeme sayfası açılamadı. Rezervasyonu ve ödeme durumunu yenile; otomatik tekrar yapılmadı.') }}</p>
  </div>
</template>

<style scoped>
p,h2,h3,h4,h5{margin:0}
h2,h3,h4{font:700 19px/1.3 Arimo,Arial,Helvetica,sans-serif;letter-spacing:0}
h5{font-size:15px;line-height:1.5}
.prov{align-items:center}
.lk{width:60px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex:none}
.pt{font-size:15px}
.w{width:100%}
@media(max-width:480px){.prov{padding:16px}}
@media(max-width:760px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;flex:0 1 auto;max-width:100%;text-align:center}}
</style>
