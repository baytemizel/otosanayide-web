<script setup lang="ts">
import {computed,ref} from 'vue';
import {Home,LayoutGrid,Megaphone,Search} from '@lucide/vue';
import {categories} from '@otosanayide/core';
import {campaignInput,type CampaignView,type CampaignAction} from '@otosanayide/core/campaigns';
import LiveCampaignBooking from '~/components/LiveCampaignBooking.vue';
import LiveCampaignMetrics from '~/components/LiveCampaignMetrics.vue';
import {useLocale} from '~/composables/useLocale';
import {campaignLabels,type CampaignBranch} from '~/lib/campaigns-helpers';

const placements={search:'Arama sonuçları',category:'Kategori',home:'Ana sayfa'};

const props=withDefaults(defineProps<{value:CampaignView;branch:CampaignBranch;admin?:boolean;demo?:boolean;onAction:(a:CampaignAction)=>Promise<void>}>(),{admin:false,demo:false});

const {t}=useLocale();
const form=ref<CampaignView>(props.value);
const reason=ref('');
const busy=ref(false);
const error=ref('');
const message=ref('');

const editable=computed(()=>!props.admin&&['draft','rejected'].includes(props.value.status));
const dirty=computed(()=>JSON.stringify(form.value)!==JSON.stringify(props.value));
const minStartDate=()=>new Date(Date.now()+27*3600000).toISOString().slice(0,10);

async function send(action:CampaignAction['action']){
  busy.value=true;
  error.value='';
  message.value='';
  try{
    const base={id:props.value.id,businessId:props.value.businessId,version:props.value.version};
    const fields={placement:form.value.placement,city:form.value.city,category:form.value.category,days:form.value.days,startDate:form.value.startDate,headline:form.value.headline,description:form.value.description};
    const input:CampaignAction=action==='save'?{...base,action,value:campaignInput.parse(fields)}:action==='approve'||action==='reject'?{...base,action,reason:reason.value}:{...base,action};
    if(props.demo){
      message.value='Önizleme kontrol edildi. Kampanya kaydedilmedi veya yayımlanmadı.';
      return;
    }
    await props.onAction(input);
    message.value='Kampanya işlemi kaydedildi.';
  }catch(e){
    error.value=e instanceof Error&&!e.message.startsWith('[')?e.message:'Kampanya alanlarını kontrol et.';
  }finally{
    busy.value=false;
  }
}
</script>

<template>
  <article class="panel stack">
    <div class="row between">
      <div>
        <h2>{{ branch.name }}</h2>
        <p class="small muted">{{ t(campaignLabels[value.status]) }}</p>
      </div>
      <Megaphone aria-hidden="true"/>
    </div>
    <p class="notice">{{ t('Onay reklamı yayımlamaz. Tarife, boş alan ve doğrulanmış ödeme olmadan kampanya başlamaz.') }}</p>
    <fieldset v-if="editable" :disabled="busy" class="stack" :style="{border:0,padding:0,minWidth:0}">
      <legend>{{ t('Kampanya hedefi') }}</legend>
      <div class="placement-grid">
        <button v-for="[key,label] in Object.entries(placements)" :key="key" type="button" :aria-pressed="form.placement===key" :class="form.placement===key?'selected':''" @click="form={...form,placement:key as CampaignView['placement']}"><component :is="key==='search'?Search:key==='category'?LayoutGrid:Home"/><strong>{{ t(label) }}</strong></button>
      </div>
      <div class="form-grid">
        <label>{{ t('İl') }}<input :value="form.city" readonly/></label>
        <label>{{ t('Kategori') }}<select :value="form.category" @change="form={...form,category:($event.target as HTMLSelectElement).value}"><option v-for="id in branch.categories" :key="id" :value="id">{{ t(categories.find(c=>c.id===id)?.name??id) }}</option></select></label>
        <label>{{ t('İstenen başlangıç tarihi') }}<input type="date" :min="minStartDate()" :value="form.startDate" @input="form={...form,startDate:($event.target as HTMLInputElement).value}"/></label>
        <label>{{ t('Kampanya süresi') }}<select :value="form.days" @change="form={...form,days:Number(($event.target as HTMLSelectElement).value) as 7|30}"><option :value="7">{{ t('7 gün') }}</option><option :value="30">{{ t('30 gün') }}</option></select></label>
        <label class="span-all">{{ t('Reklam başlığı') }}<input minlength="5" maxlength="80" :value="form.headline" @input="form={...form,headline:($event.target as HTMLInputElement).value}"/></label>
        <label class="span-all">{{ t('Reklam açıklaması') }}<textarea minlength="10" maxlength="300" :value="form.description" @input="form={...form,description:($event.target as HTMLTextAreaElement).value}"></textarea></label>
      </div>
    </fieldset>
    <p v-else>{{ t(placements[value.placement]) }} · {{ value.city }} · {{ t(categories.find(c=>c.id===value.category)?.name??value.category) }} · {{ value.startDate }} · {{ value.days }} {{ t('gün') }}</p>
    <div class="ad-preview" :style="{overflowWrap:'anywhere'}">
      <span>{{ t('Sponsorlu · Önizleme') }}</span>
      <h3>{{ form.headline||t('Reklam başlığın burada görünecek.') }}</h3>
      <p>{{ form.description||t('Hizmetini açık ve doğru bilgilerle anlat.') }}</p>
      <strong>{{ branch.name }}</strong>
    </div>
    <p class="small muted">{{ t('Tarih ve süre talebidir; yer rezervasyonu veya tüm aramalarda ilk sıra garantisi değildir. Fotoğraf olmadan da kampanya hazırlanabilir.') }}</p>
    <a v-if="admin" class="text-link" :href="`/servis/${encodeURIComponent(value.businessId)}`" target="_blank" rel="noopener noreferrer">{{ t('İşletme profilini aç') }}</a>
    <p v-if="value.reason"><strong>{{ t('Gerekçe') }}: </strong>{{ value.reason }}</p>
    <label v-if="admin&&value.status==='pending'">{{ t('İnceleme gerekçesi') }}<textarea v-model="reason" :disabled="busy" minlength="10" maxlength="1000"></textarea></label>
    <div class="row" :style="{flexWrap:'wrap'}">
      <button v-if="editable" class="button primary" :disabled="busy" @click="send('save')">{{ t(demo?'Örnek kampanyayı kontrol et':'Taslağı kaydet') }}</button>
      <button v-if="!admin&&!demo&&value.version>0&&value.status==='draft'" class="button secondary" :disabled="busy||dirty" @click="send('submit')">{{ t('İncelemeye gönder') }}</button>
      <template v-if="admin&&value.status==='pending'">
        <button class="button primary" :disabled="busy||reason.trim().length<10" @click="send('approve')">{{ t('Onayla') }}</button>
        <button class="button secondary" :disabled="busy||reason.trim().length<10" @click="send('reject')">{{ t('Reddet') }}</button>
      </template>
      <button v-if="!admin&&!demo&&value.version>0&&!['cancelled','scheduled'].includes(value.status)" class="button secondary" :disabled="busy" @click="send('cancel')">{{ t('Kampanyayı iptal et') }}</button>
    </div>
    <LiveCampaignBooking v-if="!admin&&!demo&&value.status==='approved'" :campaign="value"/>
    <LiveCampaignMetrics v-if="!admin&&!demo&&value.version>0" :id="value.id"/> <p v-if="editable&&dirty&&value.version>0" class="small muted">{{ t('İncelemeye göndermeden önce değişikliklerini kaydet.') }}</p>
    <p v-if="error" role="alert" class="error">{{ t(error) }}</p>
    <p v-if="message" role="status">{{ t(message) }}</p>
  </article>
</template>
