<script setup lang="ts">
import {computed, ref} from 'vue';
import {Check, Flag, User} from '@lucide/vue';
import ProfileStars from './ProfileStars.vue';
import {reviewReportReasons, type ProfileReviewView, type ReviewReportReason} from '~/lib/v2/profile';

// One review on the profile (W04 "Yorum" card): author, stars, text, resolved tag, owner reply, helpful/report.
// Live (`live`): the author's short name when the account has one (else the anonymous label), the
// "Ekim 2026 · Hizmet" line and the publish date (GET /api/reviews?v=2). "Faydalı" is not in the API
// (web-15 rejected) and stays disabled; "Bildir" sends a review case with a reason (POST /api/review-cases)
// through `report`, the text is needed only for "Diğer"; a guest gets a sign-in link.
const props = withDefaults(defineProps<{
  review: ProfileReviewView;
  preview?: boolean;
  live?: boolean;
  report?: (id: string, reason: ReviewReportReason, text: string) => Promise<void>;
  signInHref?: string | null;
}>(), {preview: false, live: false, report: undefined, signInHref: null});
const helpful = ref(false);
const reported = ref(false);

const reporting = ref(false);
const reportReason = ref<ReviewReportReason | ''>('');
const reportText = ref('');
const sending = ref(false);
const reportError = ref('');
const textRequired = computed(() => reportReason.value === 'other');
const reportValid = computed(() => {
  const length = reportText.value.trim().length;
  return !!reportReason.value && (length >= 10 || (!textRequired.value && length === 0));
});

async function sendReport() {
  if (!props.report || !reportReason.value || !reportValid.value || sending.value) return;
  sending.value = true;
  reportError.value = '';
  try {
    await props.report(props.review.id, reportReason.value, reportText.value.trim());
    reported.value = true;
    reporting.value = false;
  } catch (error) {
    reportError.value = error instanceof Error && error.message && !error.message.startsWith('[') ? error.message : 'Bildirim gönderilemedi. Tekrar dene.';
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <article class="profile-review">
    <header class="who">
      <span v-if="review.author" class="avatar" :style="{background: review.avatarColor}" aria-hidden="true">{{ review.initials }}</span>
      <span v-else class="avatar anon" aria-hidden="true"><User :size="18"/></span>
      <span class="names">
        <span class="t-label-md">{{ review.author || 'Hizmet deneyimi' }}</span>
        <span v-if="review.meta" class="t-body-sm t-muted">{{ review.meta }}</span>
      </span>
      <span class="rating">
        <ProfileStars :value="review.rating" :size="16"/>
        <time v-if="review.published" class="t-body-sm t-muted" :datetime="review.published.iso">{{ review.published.label }}</time>
      </span>
    </header>
    <p class="text t-body-md">{{ review.text }}</p>
    <div class="tags">
      <span class="pill pill-lime" :class="{'pill-cream': review.resolved !== 'Evet'}"><Check v-if="review.resolved === 'Evet'" :size="14" aria-hidden="true"/>Sorun çözüldü: {{ review.resolved }}</span>
      <span v-for="chip in review.chips ?? []" :key="chip" class="pill pill-cream">{{ chip }}</span>
      <span v-if="review.photoCount && !review.photos?.length" class="pill pill-cream">{{ review.photoCount }} fotoğraf</span>
    </div>
    <ul v-if="review.photos?.length" class="photos">
      <li v-for="photo in review.photos" :key="photo.src">
        <a :href="photo.src" target="_blank" rel="noopener noreferrer" :aria-label="`${photo.alt}, büyük boyutu yeni sekmede aç`">
          <img :src="photo.thumb ?? photo.src" :alt="photo.alt" width="96" height="72" loading="lazy" decoding="async">
        </a>
      </li>
    </ul>
    <div v-if="review.ownerReply" class="reply">
      <p class="t-mono-sm t-muted">İşletme yanıtı</p>
      <p class="t-body-sm">{{ review.ownerReply }}</p>
    </div>
    <div v-if="!props.preview && !live" class="actions t-label-sm">
      <button type="button" class="helpful" :aria-pressed="helpful" @click="helpful = !helpful">Faydalı ({{ review.helpful + (helpful ? 1 : 0) }})</button>
      <button type="button" class="report" :disabled="reported" @click="reported = true">{{ reported ? 'Bildirildi' : 'Bildir' }}</button>
    </div>
    <div v-else-if="!props.preview" class="actions t-label-sm">
      <button type="button" class="helpful" disabled title="Faydalı oyu henüz kullanılamıyor">Faydalı<span class="sr-only"> (henüz kullanılamıyor)</span></button>
      <NuxtLink v-if="signInHref" :to="signInHref" class="report">Bildirmek için giriş yap</NuxtLink>
      <p v-else-if="reported" class="t-body-sm t-muted" role="status">Bildirimin alındı. Sonucu Başvurularım sayfasından takip edebilirsin.</p>
      <button v-else-if="!reporting && report" type="button" class="report" @click="reporting = true"><Flag :size="12" aria-hidden="true"/>Bildir</button>
    </div>
    <form v-if="live && reporting && !reported" class="report-form" @submit.prevent="sendReport">
      <fieldset class="reasons" :disabled="sending">
        <legend class="field-label">Bu yorumu neden bildiriyorsun?</legend>
        <label v-for="option in reviewReportReasons" :key="option.value" class="reason t-body-sm">
          <input v-model="reportReason" type="radio" :name="`yorum-bildir-${review.id}`" class="radio" :value="option.value">
          {{ option.label }}
        </label>
      </fieldset>
      <label class="field">
        <span class="field-label">{{ textRequired ? 'Açıklama (en az 10 karakter)' : 'Açıklama (isteğe bağlı, yazarsan en az 10 karakter)' }}</span>
        <textarea v-model="reportText" class="textarea" maxlength="2000" :required="textRequired" :disabled="sending" placeholder="Örneğin: yorum bu işletmeyle ilgili değil."/>
      </label>
      <p v-if="reportError" class="t-body-sm error" role="alert">{{ reportError }}</p>
      <div class="report-actions">
        <button type="button" class="btn btn-outline btn-sm" :disabled="sending" @click="reporting = false">Vazgeç</button>
        <button type="submit" class="btn btn-primary btn-sm" :disabled="sending || !reportValid">{{ sending ? 'Gönderiliyor…' : 'Bildir' }}</button>
      </div>
    </form>
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
.report{display:inline-flex;align-items:center;gap:4px}
.helpful:disabled{opacity:.55;cursor:not-allowed;text-decoration:none}
.avatar.anon{display:grid;place-items:center;background:var(--cream-100);color:var(--ink-500)}
.photos{display:flex;flex-wrap:wrap;gap:8px}
.photos img{display:block;width:96px;height:72px;object-fit:cover;border-radius:12px;background:var(--cream-100)}
.report-form{display:flex;flex-direction:column;gap:10px}
.report-form .textarea{height:84px}
.reasons{border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.reasons legend{padding:0;margin-bottom:8px}
.reason{display:flex;align-items:center;gap:10px;cursor:pointer;color:var(--ink-800)}
.rating{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex:none}
.report-actions{display:flex;gap:8px;justify-content:flex-end}
.error{color:var(--red-500)}
.helpful:not(:disabled):hover,.report:not(:disabled):hover{text-decoration:underline;text-underline-offset:3px}
@media (max-width:480px){.profile-review{padding:20px}.who{flex-wrap:wrap}.rating{align-items:flex-start;width:100%}}
</style>
