<script setup lang="ts">
import CampaignMetrics from '~/components/CampaignMetrics.vue';
import {useApp} from '~/composables/useApp';
import {apiFetch} from '~/lib/api';

const props=defineProps<{id:string}>();

const app=useApp();

async function load(){
  const user=app.user;
  if(!user)throw Error('Giriş gerekli.');
  const r=await apiFetch('/api/campaigns/metrics?campaignId='+encodeURIComponent(props.id),{headers:{Authorization:`Bearer ${await user.getIdToken()}`}});
  const d=await r.json();
  if(!r.ok)throw Error(d.error);
  return d;
}
</script>

<template>
  <CampaignMetrics :key="`${id}-${app.user?.uid}`" :load="load"/>
</template>
