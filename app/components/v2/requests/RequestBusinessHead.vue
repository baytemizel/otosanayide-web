<script setup lang="ts">
import {ShieldCheck, Wrench} from '@lucide/vue';
import type {MockBusiness} from '~/data/mock/businesses';

// Business row on the W14/W16 summary cards: 56 px photo, name, "Doğrulanmış" tag.
defineProps<{business: MockBusiness}>();
</script>

<template>
  <div class="biz">
    <img v-if="business.photo" :src="business.photo" alt="" class="photo" width="56" height="56">
    <span v-else class="photo empty" aria-hidden="true"><Wrench :size="22"/></span>
    <div class="copy">
      <NuxtLink :to="`/servis/${business.id}`" class="t-label-md name">{{ business.name }}</NuxtLink>
      <span v-if="business.verified" class="tag tag-lime verified"><ShieldCheck :size="14" aria-hidden="true"/>Doğrulanmış</span>
      <span v-else class="t-body-sm t-muted">{{ business.district }}, {{ business.city }}</span>
    </div>
  </div>
</template>

<style scoped>
.biz{display:flex;align-items:center;gap:12px;width:100%}
.photo{width:56px;height:56px;flex:none;border-radius:16px;object-fit:cover}
.photo.empty{display:grid;place-items:center;background:var(--cream-100);color:var(--ink-500)}
.copy{display:flex;flex-direction:column;align-items:flex-start;gap:6px;min-width:0}
.name{color:var(--ink-900)}
.name:hover{text-decoration:underline}
.verified{padding:6px 12px 6px 9px}
.verified svg{color:var(--green-500)}
</style>
