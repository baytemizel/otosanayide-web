<script setup lang="ts">
import {MapPin, Star} from '@lucide/vue';

// V2/Kart/Yorum (Figma 113:225).
export interface MockReview {
  id: string;
  rating: number;
  text: string;
  business: string;
  author: string;
  initials: string;
  meta: string;
  withPhoto?: boolean;
  /** Mono tag on the top right, e.g. "Teklifle geldi"; defaults to "Fotoğraflı yorum" when withPhoto. */
  label?: string;
  avatarColor?: string;
}
defineProps<{review: MockReview}>();
</script>

<template>
  <article class="v2-review-card">
    <div class="top">
      <span class="stars" :aria-label="`${review.rating} / 5`">
        <Star v-for="n in 5" :key="n" :size="18" :class="{off: n > review.rating}" aria-hidden="true"/>
      </span>
      <span v-if="review.label || review.withPhoto" class="tag tag-cream tag-mono">{{ review.label ?? 'Fotoğraflı yorum' }}</span>
    </div>
    <p class="t-body-lg text">{{ review.text }}</p>
    <p class="place t-label-sm"><MapPin :size="15" aria-hidden="true"/>{{ review.business }}</p>
    <hr class="divider">
    <div class="who">
      <span class="avatar" :style="review.avatarColor ? {background: review.avatarColor} : undefined">{{ review.initials }}</span>
      <span class="names">
        <span class="t-label-md">{{ review.author }}</span>
        <span class="t-body-sm t-muted">{{ review.meta }}</span>
      </span>
    </div>
  </article>
</template>

<style scoped>
.v2-review-card{display:flex;flex-direction:column;gap:20px;padding:28px;background:var(--white);border-radius:28px}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.stars{display:flex;gap:3px;color:var(--orange-500)}
.stars :deep(svg){fill:currentColor}
.stars .off{color:var(--cream-200)}
.text{color:var(--ink-900)}
.place{display:flex;align-items:center;gap:6px;color:var(--ink-700)}
.place :deep(svg){color:var(--orange-500)}
.who{display:flex;align-items:center;gap:12px}
.names{display:flex;flex-direction:column;gap:2px}
</style>
