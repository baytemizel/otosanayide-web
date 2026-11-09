<script setup lang="ts">
import type {CampaignView} from '@otosanayide/core/campaigns';
import CampaignBooking from '~/components/CampaignBooking.vue';
import {useApp} from '~/composables/useApp';
import {apiFetch} from '~/lib/api';

const props=defineProps<{campaign:CampaignView}>();

const app=useApp();

async function transport(method:'GET'|'POST',value?:Record<string,unknown>){
  const token=await app.user?.getIdToken();
  const params=new URLSearchParams({campaignId:props.campaign.id,businessId:props.campaign.businessId,campaignVersion:String(props.campaign.version)});
  const r=await apiFetch('/api/campaigns/reservation'+(method==='GET'?`?${params}`:''),{method,headers:{Authorization:`Bearer ${token}`,...(method==='POST'?{'Content-Type':'application/json'}:{})},...(method==='POST'?{body:JSON.stringify(value)}:{})});
  const d=await r.json();
  if(!r.ok)throw Error(d.error);
  return d;
}
</script>

<template>
  <CampaignBooking :key="`${campaign.id}-${campaign.version}`" :campaign="campaign" :transport="transport"/>
</template>
