<script setup lang="ts">
import {ref} from 'vue';
import {Check} from '@lucide/vue';
import ProfileStars from './ProfileStars.vue';
import type {ProfileReview} from '~/data/mock/profile';

// One review on the profile (W04 "Yorum" card): author, stars, text, resolved tag, owner reply, helpful/report.
const props = withDefaults(defineProps<{review: ProfileReview; preview?: boolean}>(), {preview: false});
const helpful = ref(false);
const reported = ref(false);
</script>

<template>
  <article class="profile-review">
    <header class="who">
      <span class="avatar" :style="{background: review.avatarColor}" aria-hidden="true">{{ review.initials }}</span>
      <span class="names">
        <span class="t-label-md">{{ review.author }}</span>
        <span class="t-body-sm t-muted">{{ review.meta }}</span>
      </span>
      <ProfileStars :value="review.rating" :size="16"/>
    </header>
    <p class="text t-body-md">{{ review.text }}</p>
    <div class="tags">
      <span class="pill pill-lime" :class="{'pill-cream': review.resolved !== 'Evet'}"><Check v-if="review.resolved === 'Evet'" :size="14" aria-hidden="true"/>Sorun çözüldü: {{ review.resolved }}</span>
      <span v-if="review.photoCount" class="pill pill-cream">{{ review.photoCount }} fotoğraf</span>
    </div>
    <div v-if="review.ownerReply" class="reply">
      <p class="t-mono-sm t-muted">İşletme yanıtı</p>
      <p class="t-body-sm">{{ review.ownerReply }}</p>
    </div>
    <div v-if="!props.preview" class="actions t-label-sm">
      <button type="button" class="helpful" :aria-pressed="helpful" @click="helpful = !helpful">Faydalı ({{ review.helpful + (helpful ? 1 : 0) }})</button>
      <button type="button" class="report" :disabled="reported" @click="reported = true">{{ reported ? 'Bildirildi' : 'Bildir' }}</button>
    </div>
  </article>
</template>

<style scoped>
.profile-review{display:flex;flex-direction:column;gap:16px;padding:24px;background:var(--white);border:1px solid var(--cream-200);border-radius:28px}
.who{display:flex;align-items:center;gap:12px}
.names{display:flex;flex-direction:column;gap:2px;flex:1;min-width:0}
.text{max-width:700px;color:var(--ink-800)}
.tags{display:flex;flex-wrap:wrap;gap:8px}
.pill{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;font-weight:600;font-size:13px;line-height:1.2;color:var(--ink-800)}
.pill-lime{background:var(--lime-100);padding-left:9px}
.pill-lime :deep(svg){color:var(--green-500)}
.pill-cream{background:var(--cream-100);padding-left:12px}
.reply{display:flex;flex-direction:column;gap:6px;padding:16px;background:var(--cream-50);border:1px solid var(--cream-200);border-radius:18px;color:var(--ink-800)}
.actions{display:flex;gap:20px}
.helpful{color:var(--ink-700)}
.helpful[aria-pressed=true]{color:var(--orange-600)}
.report{color:var(--ink-500)}
.report:disabled{cursor:default}
.helpful:hover,.report:not(:disabled):hover{text-decoration:underline;text-underline-offset:3px}
@media (max-width:480px){.profile-review{padding:20px}.who{flex-wrap:wrap}}
</style>
