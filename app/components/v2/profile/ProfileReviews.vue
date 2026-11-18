<script setup lang="ts">
import {computed, ref} from 'vue';
import {MessageSquare} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import ProfileReviewItem from './ProfileReviewItem.vue';
import ProfileStars from './ProfileStars.vue';
import {formatRating, type MockBusiness} from '~/data/mock/businesses';
import type {ProfileView, ReviewSummaryView} from '~/lib/v2/profile';

// "Yorumlar ve puanlar": rating summary, review list and the empty state of W05.
// Demo: the mock list, two shown until expanded. Live (`live`): every loaded review (20 per page from
// GET /api/reviews), "Daha fazla yorum" while the API has a next page, loading and error states.
const props = withDefaults(defineProps<{
  business: MockBusiness;
  profile: ProfileView;
  summary: ReviewSummaryView;
  live?: boolean;
  state?: 'loading' | 'ready' | 'error';
  error?: string;
  hasMore?: boolean;
  loadingMore?: boolean;
  report?: (id: string, text: string) => Promise<void>;
  signInHref?: string | null;
}>(), {live: false, state: 'ready', error: '', hasMore: false, loadingMore: false, report: undefined, signInHref: null});
const emit = defineEmits<{review: []; retry: []; more: []}>();
const expanded = ref(false);
const visible = computed(() => (props.live || expanded.value ? props.profile.reviews : props.profile.reviews.slice(0, 2)));
const count = computed(() => props.summary?.count ?? 0);
const hasReviews = computed(() => props.profile.reviews.length > 0 || count.value > 0);
const loading = computed(() => props.live && props.state === 'loading' && !props.profile.reviews.length);
</script>

<template>
  <section id="yorumlar" class="profile-reviews" aria-labelledby="yorumlar-baslik">
    <div class="head">
      <h2 id="yorumlar-baslik" class="t-h3">Yorumlar ve puanlar</h2>
      <V2Button v-if="hasReviews" variant="dark" arrow @click="emit('review')">Deneyimini paylaş</V2Button>
    </div>

    <p v-if="loading" class="t-body-sm t-muted state" role="status">Yorumlar yükleniyor…</p>

    <div v-else-if="live && state === 'error'" class="empty" role="alert">
      <span class="empty-icon"><MessageSquare :size="26" aria-hidden="true"/></span>
      <p class="t-h4">Yorumlar yüklenemedi</p>
      <p class="t-body-sm t-muted">{{ error || 'Bağlantıyı kontrol edip tekrar dene.' }}</p>
      <V2Button variant="outline" @click="emit('retry')">Tekrar dene</V2Button>
    </div>

    <template v-else-if="hasReviews">
      <div class="summary">
        <div class="score">
          <p class="big">{{ formatRating(summary?.average ?? 0) }}</p>
          <ProfileStars :value="summary?.average ?? 0" :size="18"/>
          <p class="t-body-sm t-muted">{{ count }} yorum</p>
        </div>
        <dl v-if="profile.dimensions.length" class="bars">
          <div v-for="dim in profile.dimensions" :key="dim.label" class="bar-row">
            <dt class="t-body-sm">{{ dim.label }}</dt>
            <dd class="track" aria-hidden="true"><span :style="{width: `${(dim.score / 5) * 100}%`}"/></dd>
            <dd class="t-label-sm value">{{ formatRating(dim.score) }}</dd>
          </div>
        </dl>
        <p v-else class="t-body-sm t-muted bars-note">Puanlar yalnız yayımlanmış değerlendirmelerden hesaplanır; reklam veya üyelik puanı etkilemez.</p>
      </div>
      <ProfileReviewItem v-for="review in visible" :key="review.id" :review="review" :live="live" :report="report" :sign-in-href="signInHref"/>
      <div v-if="live">
        <V2Button v-if="hasMore" variant="outline" arrow :disabled="loadingMore" @click="emit('more')">{{ loadingMore ? 'Yükleniyor…' : 'Daha fazla yorum' }}</V2Button>
      </div>
      <div v-else-if="profile.reviews.length > 2 || count > profile.reviews.length">
        <V2Button variant="outline" :arrow="!expanded" :aria-expanded="expanded" @click="expanded = !expanded">
          {{ expanded ? 'Daha az göster' : `Tüm ${count} yorumu gör` }}
        </V2Button>
        <p v-if="expanded && count > profile.reviews.length" class="t-body-sm t-muted more-note">Örnek ekranda {{ profile.reviews.length }} yorum gösteriliyor.</p>
      </div>
    </template>

    <div v-else class="empty">
      <span class="empty-icon"><MessageSquare :size="26" aria-hidden="true"/></span>
      <p class="t-h4">Bu işletme için henüz yorum yok</p>
      <p class="t-body-sm t-muted">“Henüz yorum yok” sıfır puan demek değildir.</p>
      <V2Button variant="dark" arrow @click="emit('review')">İlk yorumu yaz</V2Button>
    </div>
  </section>
</template>

<style scoped>
.profile-reviews{display:flex;flex-direction:column;gap:20px;scroll-margin-top:110px}
.head{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
.summary{display:flex;align-items:center;gap:48px;padding:28px;background:var(--white);border:1px solid var(--cream-200);border-radius:28px}
.score{display:flex;flex-direction:column;align-items:center;gap:8px;width:170px;flex:none}
.big{font-family:var(--font-display);font-weight:800;font-size:72px;line-height:1;letter-spacing:-.03em}
.bars{flex:1;min-width:0;display:flex;flex-direction:column;gap:12px}
.bar-row{display:flex;align-items:center;gap:14px}
.bar-row dt{width:130px;flex:none;color:var(--ink-700)}
.track{flex:1;min-width:0;height:8px;border-radius:999px;background:var(--cream-100);overflow:hidden;margin:0}
.track span{display:block;height:100%;border-radius:999px;background:var(--orange-500)}
.value{margin:0;width:20px;text-align:right}
.more-note{margin-top:10px}
.bars-note{flex:1;min-width:0;max-width:420px}
.state{padding:8px 0}
.empty{display:flex;flex-direction:column;align-items:center;gap:14px;padding:40px;background:var(--white);border:1px solid var(--cream-200);border-radius:28px;text-align:center}
.empty-icon{display:grid;place-items:center;width:64px;height:64px;border-radius:999px;background:var(--cream-100);color:var(--ink-500)}
@media (max-width:760px){
  .summary{flex-direction:column;align-items:stretch;gap:24px;padding:24px}
  .score{width:auto}
  .bar-row dt{width:110px}
  .empty{padding:32px 20px}
}
</style>
