<script setup lang="ts">
import {computed} from 'vue';
import {MessageSquare, Star} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import AccountPageLayout from '~/components/v2/account/AccountPageLayout.vue';
import {useMemberPage} from '~/composables/useMemberPage';
import {mockOwnReviews, reviewStatusLabel, type MockOwnReview} from '~/data/mock/account';

// Yorumlarım: linked from the Figma account menu; no Web v2 frame, built from the W17 layout.
useMemberPage();
useSeoMeta({title: 'Yorumlarım'});
const reviews = useState<MockOwnReview[]>('v2-own-reviews', () => mockOwnReviews.map((review) => ({...review})));
const count = computed(() => reviews.value.length);
const remove = (id: string) => { reviews.value = reviews.value.filter((review) => review.id !== id); };
const tagClass = (status: MockOwnReview['status']) => (status === 'yayinda' ? 'tag-lime' : status === 'incelemede' ? 'tag-orange' : 'tag-cream');
</script>

<template>
  <AccountPageLayout active="yorumlarim" title="Yorumlarım">
    <p class="t-body-md t-muted">{{ count }} yorum. Yorumların incelendikten sonra işletme profilinde görünür.</p>
    <ul v-if="count" class="list">
      <li v-for="review in reviews" :key="review.id" class="surface item">
        <div class="top">
          <NuxtLink :to="`/servis/${review.businessId}`" class="t-h4">{{ review.business }}</NuxtLink>
          <span class="tag" :class="tagClass(review.status)">{{ reviewStatusLabel[review.status] }}</span>
        </div>
        <div class="meta">
          <span class="stars" :aria-label="`${review.rating} / 5`"><Star v-for="n in 5" :key="n" :size="16" :class="{off: n > review.rating}" aria-hidden="true"/></span>
          <span class="t-body-sm t-muted">{{ review.date }}</span>
        </div>
        <p class="t-body-md">{{ review.text }}</p>
        <div v-if="review.reply" class="reply">
          <p class="t-mono-sm t-muted">İşletme yanıtı</p>
          <p class="t-body-sm">{{ review.reply }}</p>
        </div>
        <div class="actions">
          <V2Button variant="outline" size="sm" :to="`/servis/${review.businessId}?yorum=1`">Düzenle</V2Button>
          <V2Button variant="ghost" size="sm" @click="remove(review.id)">Sil</V2Button>
        </div>
      </li>
    </ul>
    <div v-else class="surface empty">
      <MessageSquare :size="24" aria-hidden="true"/>
      <p class="t-label-md">Henüz yorumun yok.</p>
      <V2Button variant="dark" to="/ara" arrow>Servis bul</V2Button>
    </div>
  </AccountPageLayout>
</template>

<style scoped>
.list{display:flex;flex-direction:column;gap:16px}
.item{display:flex;flex-direction:column;gap:12px;padding:24px}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.top a:hover{text-decoration:underline}
.meta{display:flex;align-items:center;gap:12px}
.stars{display:flex;gap:2px;color:var(--orange-500)}
.stars :deep(svg){fill:currentColor}
.stars .off{color:var(--cream-200)}
.reply{display:flex;flex-direction:column;gap:6px;padding:14px 16px;border-radius:16px;background:var(--cream-50)}
.actions{display:flex;gap:8px}
.empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 24px;color:var(--ink-500)}
</style>
