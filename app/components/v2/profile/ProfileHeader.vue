<script setup lang="ts">
import {computed} from 'vue';
import {MapPin, ShieldCheck, Star} from '@lucide/vue';
import {formatRating, type MockBusiness} from '~/data/mock/businesses';
import type {ProfileData} from '~/data/mock/profile';

// "Başlık" block of W04/W05: status tags, name, address and the rating line.
const props = defineProps<{business: MockBusiness; profile: ProfileData}>();
const emit = defineEmits<{review: []}>();

const hasReviews = computed(() => props.profile.reviews.length > 0);
const status = computed(() => {
  if (!props.profile.hours) return {text: 'Çalışma saati bilinmiyor', tone: 'unknown'};
  return {text: props.business.hoursText, tone: props.business.open ? 'open' : 'closed'};
});
</script>

<template>
  <header id="genel" class="profile-header">
    <div class="tags">
      <span v-if="business.verified" class="pill pill-lime"><ShieldCheck :size="14" aria-hidden="true"/>Yönetim yetkisi doğrulandı</span>
      <span v-else-if="!business.claimed" class="pill pill-cream">Sahiplenilmemiş profil</span>
      <span v-else class="pill pill-cream">Doğrulama bekliyor</span>
      <span class="pill pill-white"><i class="dot" :class="status.tone" aria-hidden="true"/>{{ status.text }}</span>
    </div>
    <h1 class="t-h2 name">{{ business.name }}</h1>
    <p class="address t-body-md"><MapPin :size="18" aria-hidden="true"/>{{ business.address }} / {{ business.city }}</p>
    <div v-if="hasReviews" class="rating">
      <Star :size="34" class="big-star" aria-hidden="true"/>
      <span class="t-stat">{{ formatRating(business.rating) }}</span>
      <span class="rating-meta">
        <span class="t-label-md">{{ business.reviewCount }} yorum</span>
        <span class="t-body-sm t-muted">doğrulanmış hesaplardan</span>
      </span>
    </div>
    <p v-else class="t-body-md t-muted">Henüz yorum yok · <button type="button" class="first" @click="emit('review')">İlk deneyimi sen paylaş</button></p>
  </header>
</template>

<style scoped>
.profile-header{display:flex;flex-direction:column;gap:16px;scroll-margin-top:110px}
.tags{display:flex;flex-wrap:wrap;gap:8px}
.pill{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;font-weight:600;font-size:13px;line-height:1.2;color:var(--ink-800)}
.pill-lime{background:var(--lime-100);padding-left:9px}
.pill-lime :deep(svg){color:var(--green-500)}
.pill-cream{background:var(--cream-100)}
.pill-white{background:var(--white);border:1px solid var(--cream-200);padding:6px 12px 6px 9px}
.dot{width:7px;height:7px;border-radius:999px;background:var(--ink-300)}
.dot.open{background:var(--green-500)}
.dot.closed{background:var(--red-500)}
.name{max-width:780px;letter-spacing:-.025em}
.address{display:flex;align-items:flex-start;gap:8px;color:var(--ink-500)}
.address :deep(svg){flex:none;margin-top:3px}
.rating{display:flex;align-items:center;gap:14px}
.big-star{color:var(--orange-500);fill:var(--orange-500)}
.rating-meta{display:flex;flex-direction:column;gap:2px}
.first{color:inherit;font:inherit;text-decoration:underline;text-decoration-color:var(--cream-200);text-underline-offset:3px}
.first:hover{color:var(--ink-900)}
</style>
