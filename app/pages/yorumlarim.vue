<script setup lang="ts">
import {computed, ref} from 'vue';
import {MessageSquare, Star} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import V2Modal from '~/components/v2/V2Modal.vue';
import AccountPageLayout from '~/components/v2/account/AccountPageLayout.vue';
import {useMemberPage} from '~/composables/useMemberPage';
import {useOwnReviews} from '~/composables/v2/useAccountData';
import {mockOwnReviews, reviewStatusLabel, type MockOwnReview} from '~/data/mock/account';
import {demoMode} from '~/lib/env';
import {ownReviewMeta} from '~/lib/v2/profile';
import type {OwnReviewRow} from '~/lib/v2/requests';

// Yorumlarım: linked from the Figma account menu; no Web v2 frame, built from the W17 layout.
// Demo: mock reviews; "Sil" removes locally. Live: GET /api/reviews/mine/all (web-17) with the
// moderation status; "Geri çek" is PATCH /api/reviews/mine {action:'withdraw'} after a confirmation.
// Editing happens in the review form on the business profile (same PATCH, action 'edit'; ?yorum=duzenle
// opens it in edit mode). With v=2 the visit month and service are shown in the meta line.
useMemberPage();
const demo = demoMode();
useSeoMeta({title: 'Yorumlarım', robots: 'noindex, nofollow'});

const reviews = useState<MockOwnReview[]>('v2-own-reviews', () => mockOwnReviews.map((review) => ({...review})));
const remove = (id: string) => { reviews.value = reviews.value.filter((review) => review.id !== id); };
const tagClass = (status: MockOwnReview['status']) => (status === 'yayinda' ? 'tag-lime' : status === 'incelemede' ? 'tag-orange' : 'tag-cream');

const live = useOwnReviews();
const liveMeta = computed(() => new Map(live.items.value.map((item) => [item.review.id, ownReviewMeta(item.review)])));
const count = computed(() => (demo ? reviews.value.length : live.rows.value.length));
const withdrawing = ref<OwnReviewRow | null>(null);
async function confirmWithdraw() {
  const row = withdrawing.value;
  if (!row) return;
  await live.withdraw(row);
  withdrawing.value = null;
}
</script>

<template>
  <AccountPageLayout active="yorumlarim" title="Yorumlarım">
    <template v-if="demo">
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
    </template>

    <template v-else>
      <p v-if="live.loading.value && !count" class="t-body-md t-muted" role="status">Yorumların yükleniyor…</p>
      <div v-else-if="live.error.value" class="surface empty" role="alert">
        <p class="t-label-md">Yorumlar yüklenemedi.</p>
        <p class="t-body-sm">{{ live.error.value }}</p>
        <V2Button variant="outline" size="sm" @click="live.load()">Tekrar dene</V2Button>
      </div>
      <template v-else>
        <p class="t-body-md t-muted">{{ count }}{{ live.next.value ? '+' : '' }} yorum. Yorumların incelendikten sonra işletme profilinde görünür.</p>
        <ul v-if="count" class="list">
          <li v-for="review in live.rows.value" :key="review.id" class="surface item">
            <div class="top">
              <NuxtLink v-if="review.available" :to="`/servis/${review.businessId}`" class="t-h4">{{ review.business }}</NuxtLink>
              <span v-else class="t-h4">{{ review.business }} <span class="tag tag-cream">Yayında değil</span></span>
              <span class="tag" :class="`tag-${review.tone}`">{{ review.label }}</span>
            </div>
            <div class="meta">
              <span v-if="review.rating" class="stars" :aria-label="`${review.rating} / 5`"><Star v-for="n in 5" :key="n" :size="16" :class="{off: n > review.rating}" aria-hidden="true"/></span>
              <span v-if="review.date" class="t-body-sm t-muted">{{ review.date }}</span>
              <span v-if="liveMeta.get(review.id)" class="t-body-sm t-muted">{{ liveMeta.get(review.id) }}</span>
            </div>
            <p class="t-body-md">{{ review.text }}</p>
            <div v-if="review.reason" class="reply">
              <p class="t-mono-sm t-muted">İnceleme notu</p>
              <p class="t-body-sm">{{ review.reason }}</p>
            </div>
            <div v-if="(review.canEdit && review.available) || review.canWithdraw" class="actions">
              <V2Button v-if="review.canEdit && review.available" variant="outline" size="sm" :to="`/servis/${review.businessId}?yorum=duzenle`">Düzenle</V2Button>
              <V2Button v-if="review.canWithdraw" variant="ghost" size="sm" :disabled="!!live.busy.value" @click="withdrawing = review">{{ live.busy.value === review.id ? 'Geri çekiliyor…' : 'Geri çek' }}</V2Button>
            </div>
          </li>
        </ul>
        <div v-else class="surface empty">
          <MessageSquare :size="24" aria-hidden="true"/>
          <p class="t-label-md">Henüz yorumun yok.</p>
          <V2Button variant="dark" to="/ara" arrow>Servis bul</V2Button>
        </div>
        <V2Button v-if="live.next.value" variant="outline" size="sm" class="more" :disabled="live.loading.value" @click="live.load(live.next.value ?? '')">Daha fazla yorum</V2Button>
      </template>
    </template>

    <V2Modal :open="!!withdrawing" title="Yorumu geri çek" subtitle="Yorumun profilde görünmez; puanı ortalamadan çıkar. Daha sonra düzenleyip yeniden incelemeye gönderebilirsin." :width="520" @close="withdrawing = null">
      <p class="t-body-md">{{ withdrawing?.business }}</p>
      <template #footer>
        <V2Button variant="outline" :disabled="!!live.busy.value" @click="withdrawing = null">Vazgeç</V2Button>
        <V2Button variant="dark" :disabled="!!live.busy.value" @click="confirmWithdraw">{{ live.busy.value ? 'Gönderiliyor…' : 'Geri çek' }}</V2Button>
      </template>
    </V2Modal>
  </AccountPageLayout>
</template>

<style scoped>
.list{display:flex;flex-direction:column;gap:16px}
.item{display:flex;flex-direction:column;gap:12px;padding:24px}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.top a:hover{text-decoration:underline}
.meta{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.stars{display:flex;gap:2px;color:var(--orange-500)}
.stars :deep(svg){fill:currentColor}
.stars .off{color:var(--cream-200)}
.reply{display:flex;flex-direction:column;gap:6px;padding:14px 16px;border-radius:16px;background:var(--cream-50)}
.actions{display:flex;gap:8px}
.empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:48px 24px;color:var(--ink-500)}
.more{align-self:flex-start}
</style>
