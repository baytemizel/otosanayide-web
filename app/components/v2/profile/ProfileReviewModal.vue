<script setup lang="ts">
import {computed, onBeforeUnmount, reactive, ref, watch} from 'vue';
import {Check, ImagePlus, Info, X} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import V2Chip from '~/components/v2/V2Chip.vue';
import V2Modal from '~/components/v2/V2Modal.vue';
import V2Select from '~/components/v2/V2Select.vue';
import ProfileReviewItem from './ProfileReviewItem.vue';
import ProfileStarInput from './ProfileStarInput.vue';
import {useLocale} from '~/composables/useLocale';
import type {MockBusiness} from '~/data/mock/businesses';
import {mockMember} from '~/data/mock/session';
import {ratingWords, resolvedOptions, reviewDimensions, visitMonths} from '~/data/mock/profile';
import type {OwnReviewView} from '@otosanayide/core/review-author-client';
import {
  answersFromOwn, monthLabel, reviewScoreLabels, reviewTextLimits, scoreChip, visitMonthOptions, wcChip,
  type ProfileReviewView, type ProfileView, type ReviewAnswers, type ReviewScoreKey,
} from '~/lib/v2/profile';

// W07 "Yorum yaz" modal: 1 Puan → 2 Deneyim (Figma 122:958) → 3 Fotoğraf → 4 Önizleme → success.
// Demo: everything local (mock). Live (`submit` set): the fields of POST /api/reviews (core reviewSchema):
// overall rating, quality / communication / price transparency / payment / cleanliness (+ WC cleanliness),
// resolved, WC, service (the profile's services), visit month (this month … 24 months back) and text.
// The photo step and the draft note stay demo-only: review photos are added to an existing review, not sent
// with it, and the API keeps no drafts. A guest (`signInHref`) is asked to sign in; a member who already
// reviewed sees that review's status and, when the API allows it (`canEdit`), edits it here (`edit`,
// PATCH /api/reviews/mine action edit; `startEdit` opens the form directly, e.g. from Yorumlarım).
const props = withDefaults(defineProps<{
  open: boolean;
  business: MockBusiness;
  profile: ProfileView;
  demo?: boolean;
  submit?: (answers: ReviewAnswers) => Promise<{id: string; status: string}>;
  edit?: (answers: ReviewAnswers) => Promise<{id: string; status: string}>;
  signInHref?: string | null;
  existing?: OwnReviewView | null;
  startEdit?: boolean;
}>(), {demo: false, submit: undefined, edit: undefined, signInHref: null, existing: null, startEdit: false});
const emit = defineEmits<{close: []}>();
// Values sent to the API (service, visit month, resolved, wc) stay as they are; labels are translated with t().
const {t, localeTag} = useLocale();

const live = computed(() => !!props.submit);
// Step names are Turkish source texts, translated where they are shown.
const steps = computed(() => (live.value ? ['Puan', 'Deneyim', 'Önizleme'] as const : ['Puan', 'Deneyim', 'Fotoğraf', 'Önizleme'] as const));
const maxText = computed(() => (live.value ? reviewTextLimits.max : 2000));
const minText = computed(() => (live.value ? reviewTextLimits.min : 20));
const maxPhotos = 5;
const liveScoreKeys = computed<ReviewScoreKey[]>(() => {
  const keys: ReviewScoreKey[] = ['quality', 'communication', 'priceTransparency', 'payment', 'cleanliness'];
  return form.wc === 'yes' ? [...keys, 'wcCleanliness'] : keys;
});
// Live pickers: '' = not given (the field is left out of the body). The month list is rebuilt on every open.
const liveMonths = ref(visitMonthOptions());
const liveMonthOptions = computed(() => [{value: '', label: t('Belirtilmedi')}, ...liveMonths.value.map((m) => ({value: m.value, label: monthLabel(m.value, localeTag.value)}))]);
const liveServiceOptions = computed(() => {
  const services = [...props.profile.services];
  // An edited review keeps its service even if the business no longer lists it.
  if (editing.value && props.existing?.service && !services.includes(props.existing.service)) services.unshift(props.existing.service);
  return [{value: '', label: t('Belirtilmedi')}, ...services.filter((s) => s.length <= 120).map((s) => ({value: s, label: t(s)}))];
});
// Demo pickers: the mock services and months are the values; the labels are translated.
const demoServiceOptions = computed(() => props.profile.services.map((s) => ({value: s, label: t(s)})));
const demoMonthOptions = computed(() => visitMonths.map((m) => ({value: m, label: t(m)})));
const wcOptions = [{value: 'yes', label: 'Evet'}, {value: 'no', label: 'Hayır'}, {value: 'unknown', label: 'Bilmiyorum'}] as const;
const ownStatus: Record<string, string> = {pending: 'İncelemede', approved: 'Yayında', rejected: 'Reddedildi', hidden: 'Gizlendi', withdrawn: 'Geri çekildi'};
const ownStatusLabel = computed(() => {
  const status = props.existing?.status ?? '';
  return ownStatus[status] ? t(ownStatus[status]) : status;
});
// "… Yorumunun durumu: {status}." with the status in bold where the language puts it.
const statusParts = computed(() => t('İşletme başına bir değerlendirme alınır. Yorumunun durumu: {status}.').split(/(\{status\})/).filter(Boolean));
const sending = ref(false);
const sendError = ref('');
const editing = ref(false);
const droppedMonth = ref(false);
const gate = computed(() => (live.value && !done.value ? (props.signInHref ? 'guest' : props.existing && !editing.value ? 'existing' : null) : null));
const canEditExisting = computed(() => !!props.edit && !!props.existing?.canEdit);

const step = ref(1);
const done = ref(false);
const form = reactive({
  rating: 0,
  dims: reviewDimensions.map(() => 0),
  resolved: '' as '' | (typeof resolvedOptions)[number],
  scores: {} as Partial<Record<ReviewScoreKey, number>>,
  wc: 'unknown' as ReviewAnswers['wc'],
  service: '',
  month: visitMonths[0]!,
  visitMonth: '',
  text: '',
  consent: false,
});
const photos = ref<{id: number; url: string; name: string}[]>([]);
let photoSeq = 0;

function reset() {
  step.value = 1;
  done.value = false;
  editing.value = false;
  droppedMonth.value = false;
  Object.assign(form, {rating: 0, dims: reviewDimensions.map(() => 0), resolved: '', scores: {}, wc: 'unknown', service: live.value ? '' : props.profile.services[0] ?? '', month: visitMonths[0]!, visitMonth: '', text: '', consent: false});
  sendError.value = '';
  clearPhotos();
}

/** Fills the form with the member's own review; the API rewrites the whole review on save. */
function startEditing() {
  if (!props.existing || !canEditExisting.value) return;
  const {answers, droppedMonth: dropped} = answersFromOwn(props.existing);
  liveMonths.value = visitMonthOptions();
  Object.assign(form, {rating: answers.rating, scores: {...answers.scores}, resolved: answers.resolved, wc: answers.wc, service: answers.service ?? '', visitMonth: answers.visitMonth ?? '', text: answers.text, consent: false});
  droppedMonth.value = dropped;
  sendError.value = '';
  editing.value = true;
  step.value = 2;
}

function fillDemo() {
  // The exact state drawn in Figma W07 (step 2).
  Object.assign(form, {rating: 5, dims: [5, 5, 4, 5, 4], resolved: 'Evet', service: props.profile.services[0] ?? '', month: 'Ekim 2026', text: 'Kapıdaki göçük iz bırakmadan çıktı. Fiyatı işe başlamadan söylediler, teslimde değişmedi.', consent: true});
  step.value = 2;
}

watch(() => props.open, (open) => {
  if (!open) return;
  if (done.value) reset();
  if (!live.value && !form.service) form.service = props.profile.services[0] ?? '';
  if (live.value) liveMonths.value = visitMonthOptions();
  sendError.value = '';
  if (props.demo) fillDemo();
}, {immediate: true});
// "Düzenle" on Yorumlarım opens the form at once, as soon as the own review has loaded.
watch(() => [props.open, props.startEdit, props.existing] as const, ([open, start, existing]) => {
  if (open && start && existing && !editing.value && !done.value) startEditing();
}, {immediate: true});

const dirty = computed(() => form.rating > 0 || form.text.length > 0);
const canContinue = computed(() => {
  if (sending.value) return false;
  if (step.value === 1) return form.rating > 0;
  if (step.value === 2) return form.rating > 0 && form.text.trim().length >= minText.value && form.consent;
  return true;
});
const primaryLabel = computed(() => {
  if (step.value < steps.value.length) return t('Devam: {step}', {step: t(steps.value[step.value]!)});
  if (!live.value) return t('Yorumu gönder');
  if (sending.value) return t('Gönderiliyor…');
  return editing.value ? t('Güncelle ve incelemeye gönder') : t('İncelemeye gönder');
});
const textHint = computed(() => (form.text.trim().length > 0 && form.text.trim().length < minText.value ? t('En az {count} karakter yazın.', {count: minText.value}) : t('Plaka, telefon veya fatura kimlik bilgisi yazmayın.')));

async function send() {
  const action = editing.value ? props.edit : props.submit;
  if (!action) return;
  sending.value = true;
  sendError.value = '';
  try {
    await action({rating: form.rating, scores: {...form.scores}, resolved: form.resolved, wc: form.wc, text: form.text, service: form.service, visitMonth: form.visitMonth});
    done.value = true;
  } catch (error) {
    // A Zod issue list starts with "["; the API's own message is readable Turkish.
    sendError.value = error instanceof Error && error.message && !error.message.startsWith('[') ? t(error.message) : t('Puanını ve yorumunu kontrol et.');
  } finally {
    sending.value = false;
  }
}
function next() {
  if (!canContinue.value) return;
  if (step.value < steps.value.length) step.value += 1;
  else if (live.value) void send();
  else done.value = true;
}
function back() {
  if (sending.value) return;
  if (step.value > 1) step.value -= 1;
  else if (editing.value) editing.value = false;
  else emit('close');
}
function close() {
  if (!sending.value) emit('close');
}
function setScore(key: ReviewScoreKey, value: number) {
  form.scores = {...form.scores, [key]: value};
}

function addPhotos(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files ?? []).filter((file) => file.type.startsWith('image/'));
  for (const file of files.slice(0, maxPhotos - photos.value.length)) {
    photos.value.push({id: ++photoSeq, url: URL.createObjectURL(file), name: file.name});
  }
  input.value = '';
}
function removePhoto(id: number) {
  const photo = photos.value.find((p) => p.id === id);
  if (photo) URL.revokeObjectURL(photo.url);
  photos.value = photos.value.filter((p) => p.id !== id);
}
function clearPhotos() {
  if (import.meta.client) photos.value.forEach((p) => URL.revokeObjectURL(p.url));
  photos.value = [];
}
onBeforeUnmount(clearPhotos);

const previewReview = computed<ProfileReviewView>(() => (live.value
  ? {
    // The short account name is added by the API on publication; the preview stays anonymous.
    id: 'onizleme',
    author: '',
    initials: '',
    avatarColor: 'var(--cream-100)',
    meta: [form.visitMonth ? monthLabel(form.visitMonth, localeTag.value) : '', form.service ? t(form.service) : ''].filter(Boolean).join(' · '),
    rating: form.rating,
    text: form.text.trim(),
    resolved: form.resolved || 'Henüz belli değil',
    photoCount: 0,
    ownerReply: null,
    helpful: 0,
    chips: [
      ...liveScoreKeys.value.filter((key) => form.scores[key]).map((key) => scoreChip(key, form.scores[key]!, t)),
      ...(form.wc === 'unknown' ? [] : [wcChip(form.wc, t)]),
    ],
  }
  : {
    id: 'onizleme',
    author: mockMember.shortName,
    initials: mockMember.initials,
    avatarColor: 'var(--lime-100)',
    meta: [form.month ? t(form.month) : '', form.service ? t(form.service) : ''].filter(Boolean).join(' · '),
    rating: form.rating,
    text: form.text.trim(),
    resolved: form.resolved || 'Henüz belli değil',
    photoCount: photos.value.length,
    ownerReply: null,
    helpful: 0,
  }));
</script>

<template>
  <V2Modal :open="open" :title="t('Deneyimini paylaş')" :subtitle="business.name" :width="760" @close="close">
    <div v-if="done" class="success" role="status">
      <span class="success-icon"><Check :size="30" aria-hidden="true"/></span>
      <p class="t-h3">{{ editing ? t('Yorumun güncellendi') : t('Teşekkürler, yorumun alındı') }}</p>
      <p v-if="live && editing" class="t-body-md t-muted">{{ t('Güncel hali yeniden incelemeye alındı. Onaylanana kadar {name} profilinde görünmez; durumunu Yorumlarım sayfasından takip edebilirsin.', {name: business.name}) }}</p>
      <p v-else-if="live" class="t-body-md t-muted">{{ t('Yorumun incelemeye alındı. Onaylandığında {name} profilinde yayınlanır; durumunu Yorumlarım sayfasından takip edebilirsin.', {name: business.name}) }}</p>
      <p v-else class="t-body-md t-muted">{{ t('Yorumun incelendikten sonra {name} profilinde yayınlanır. İşletme yanıt verdiğinde sana haber vereceğiz.', {name: business.name}) }}</p>
    </div>

    <div v-else-if="gate === 'guest'" class="success">
      <p class="t-h3">{{ t('Yorum yazmak için giriş yap') }}</p>
      <p class="t-body-md t-muted">{{ t('Yorumlar e-postası doğrulanmış üyelerden alınır ve yayımlanmadan önce incelenir.') }}</p>
    </div>

    <div v-else-if="gate === 'existing'" class="success" role="status">
      <p class="t-h3">{{ t('Bu işletme için yorumun var') }}</p>
      <p class="t-body-md t-muted"><template v-for="(part, i) in statusParts" :key="i"><strong v-if="part === '{status}'">{{ ownStatusLabel }}</strong><template v-else>{{ part }}</template></template></p>
      <p class="t-body-sm t-muted">{{ canEditExisting ? t('Düzenlediğin yorum yeniden incelenir; onaylanana kadar profilde görünmez. Geri çekme Yorumlarım sayfasında.') : t('Bu yorum şu anda düzenlenemiyor. Geri çekme Yorumlarım sayfasında.') }}</p>
    </div>

    <div v-else class="body">
      <ol class="steps" :aria-label="t('Adımlar')">
        <template v-for="(label, i) in steps" :key="label">
          <li class="step" :class="{done: i + 1 < step, current: i + 1 === step}" :aria-current="i + 1 === step ? 'step' : undefined">
            <span class="num"><Check v-if="i + 1 < step" :size="14" aria-hidden="true"/><template v-else>{{ i + 1 }}</template></span>
            <span class="t-label-sm">{{ t(label) }}</span>
          </li>
          <li v-if="i < steps.length - 1" class="line" :class="{on: i + 1 < step}" aria-hidden="true"/>
        </template>
      </ol>

      <!-- 1 · Puan -->
      <section v-if="step === 1" class="pane" :aria-label="t('Puan')">
        <div class="pick">
          <p class="t-label-md">{{ t('Genel deneyim') }}</p>
          <ProfileStarInput v-model="form.rating" :label="t('Genel deneyim puanı')" :size="44"/>
          <p class="t-label-sm t-muted">{{ form.rating ? t(ratingWords[form.rating]!) : t('Puanını seç') }}</p>
        </div>
        <p class="hint"><Info aria-hidden="true"/>{{ t('Ayrıntılı boyut puanlarını ve yorumunu bir sonraki adımda ekleyebilirsin.') }}</p>
      </section>

      <!-- 2 · Deneyim (Figma W07) -->
      <section v-else-if="step === 2" class="pane" :aria-label="t('Deneyim')">
        <div class="overall">
          <p class="t-label-md">{{ t('Genel deneyim') }}</p>
          <span class="grow"/>
          <ProfileStarInput v-model="form.rating" :label="t('Genel deneyim puanı')" :size="28"/>
          <p class="t-label-sm t-muted word">{{ t(ratingWords[form.rating] ?? '') }}</p>
        </div>
        <div v-if="live" class="dims">
          <div v-for="key in liveScoreKeys" :key="key" class="dim">
            <span class="t-body-sm">{{ t(reviewScoreLabels[key]) }}</span>
            <ProfileStarInput :model-value="form.scores[key] ?? 0" :label="t('{label} puanı', {label: t(reviewScoreLabels[key])})" :size="18" @update:model-value="setScore(key, $event)"/>
          </div>
          <p class="t-body-sm t-muted dim-note">{{ t('Boyut puanları isteğe bağlıdır.') }}</p>
        </div>
        <div v-else class="dims">
          <div v-for="(dim, i) in reviewDimensions" :key="dim" class="dim">
            <span class="t-body-sm">{{ t(dim) }}</span>
            <ProfileStarInput :model-value="form.dims[i] ?? 0" :label="t('{label} puanı', {label: t(dim)})" :size="18" @update:model-value="form.dims[i] = $event"/>
          </div>
          <p class="t-body-sm t-muted dim-note">{{ t('Boyut puanları isteğe bağlıdır.') }}</p>
        </div>
        <fieldset class="group">
          <legend class="field-label">{{ t('Sorun çözüldü mü?') }}</legend>
          <div class="chips">
            <V2Chip v-for="option in resolvedOptions" :key="option" as="button" :variant="form.resolved === option ? 'active' : 'default'" :pressed="form.resolved === option" @click="form.resolved = option">{{ t(option) }}</V2Chip>
          </div>
        </fieldset>
        <fieldset v-if="live" class="group">
          <legend class="field-label">{{ t('WC var mıydı?') }}</legend>
          <div class="chips">
            <V2Chip v-for="option in wcOptions" :key="option.value" as="button" :variant="form.wc === option.value ? 'active' : 'default'" :pressed="form.wc === option.value" @click="form.wc = option.value">{{ t(option.label) }}</V2Chip>
          </div>
        </fieldset>
        <div v-if="live" class="two">
          <div v-if="liveServiceOptions.length > 1" class="field">
            <span id="yorum-hizmet" class="field-label">{{ t('Hizmet') }}</span>
            <V2Select v-model="form.service" :options="liveServiceOptions" :placeholder="t('Hizmet seç')" aria-labelledby="yorum-hizmet"/>
          </div>
          <div class="field">
            <span id="yorum-ay" class="field-label">{{ t('Ziyaret ayı') }}</span>
            <V2Select v-model="form.visitMonth" :options="liveMonthOptions" :placeholder="t('Ay seç')" aria-labelledby="yorum-ay"/>
            <span v-if="droppedMonth && !form.visitMonth" class="t-body-sm t-muted">{{ t('Önceki ziyaret ayı 24 aydan eski olduğu için kaldırıldı; istersen yeni bir ay seç.') }}</span>
          </div>
        </div>
        <div v-else class="two">
          <label class="field">
            <span class="field-label">{{ t('Hizmet') }}</span>
            <V2Select v-model="form.service" :options="demoServiceOptions" :placeholder="t('Hizmet seç')" :aria-label="t('Hizmet')"/>
          </label>
          <label class="field">
            <span class="field-label">{{ t('Ziyaret ayı') }}</span>
            <V2Select v-model="form.month" :options="demoMonthOptions" :placeholder="t('Ay seç')" :aria-label="t('Ziyaret ayı')"/>
          </label>
        </div>
        <label class="field">
          <span class="field-label">{{ t('Yorumun') }}</span>
          <textarea v-model="form.text" class="textarea review-text" :maxlength="maxText" :placeholder="t('Ne yaptırdın, nasıl geçti? Fiyat, süre ve iletişim hakkında yaz.')" aria-describedby="yorum-ipucu"/>
          <span id="yorum-ipucu" class="counter-row">
            <span>{{ textHint }}</span>
            <span class="t-mono-sm counter">{{ form.text.length }} / {{ maxText }}</span>
          </span>
        </label>
        <label class="consent">
          <input v-model="form.consent" type="checkbox" class="checkbox">
          <span class="t-body-sm">{{ t('Yorumumu gerçek bir ziyarete dayanarak yazdığımı beyan ederim.') }}</span>
        </label>
      </section>

      <!-- 3 · Fotoğraf (demo only) -->
      <section v-else-if="step === 3 && !live" class="pane" :aria-label="t('Fotoğraf')">
        <label class="drop" :class="{full: photos.length >= maxPhotos}">
          <input type="file" accept="image/*" multiple class="sr-only" :disabled="photos.length >= maxPhotos" @change="addPhotos">
          <span class="drop-icon"><ImagePlus :size="26" aria-hidden="true"/></span>
          <span class="t-label-md">{{ photos.length >= maxPhotos ? t('Fotoğraf sınırına ulaştın') : t('Fotoğraf ekle') }}</span>
          <span class="t-body-sm t-muted">{{ t('En fazla {count} fotoğraf · JPG veya PNG · İsteğe bağlı', {count: maxPhotos}) }}</span>
        </label>
        <ul v-if="photos.length" class="thumbs">
          <li v-for="photo in photos" :key="photo.id" class="thumb">
            <img :src="photo.url" :alt="photo.name">
            <button type="button" class="remove" :aria-label="t('{name} fotoğrafını kaldır', {name: photo.name})" @click="removePhoto(photo.id)"><X :size="14" aria-hidden="true"/></button>
          </li>
        </ul>
        <p class="hint"><Info aria-hidden="true"/>{{ t('Plaka, yüz ve fatura bilgisi görünmesin. Fotoğraflar yayından önce incelenir.') }}</p>
      </section>

      <!-- Önizleme -->
      <section v-else class="pane" :aria-label="t('Önizleme')">
        <p class="field-label">{{ t('Yorumun profilde böyle görünecek') }}</p>
        <ProfileReviewItem :review="previewReview" preview/>
        <ul v-if="!live && form.dims.some((d) => d > 0)" class="dim-summary t-body-sm">
          <li v-for="(dim, i) in reviewDimensions" v-show="form.dims[i]" :key="dim"><span class="t-muted">{{ t(dim) }}</span> <strong>{{ form.dims[i] }}/5</strong></li>
        </ul>
        <p class="hint"><Info aria-hidden="true"/>{{ live ? t('Yorumun incelendikten sonra yayınlanır. İşletme başına bir değerlendirme alınır. Hesabında adın varsa profilde kısaltılmış hali (ör. “Selin A.”) görünür; yoksa yorum isimsiz görünür.') : t('Yorumun incelendikten sonra yayınlanır. İşletme yanıt verebilir; yanıtı yorumunun altında görünür.') }}</p>
        <p v-if="sendError" class="send-error t-body-sm" role="alert">{{ sendError }}</p>
      </section>
    </div>

    <template #footer>
      <template v-if="done">
        <V2Button @click="close">{{ t('Kapat') }}</V2Button>
      </template>
      <template v-else-if="gate === 'guest'">
        <V2Button variant="outline" @click="close">{{ t('Vazgeç') }}</V2Button>
        <V2Button :to="signInHref ?? undefined" arrow>{{ t('Giriş yap') }}</V2Button>
      </template>
      <template v-else-if="gate === 'existing'">
        <V2Button variant="outline" @click="close">{{ t('Kapat') }}</V2Button>
        <V2Button v-if="canEditExisting" arrow @click="startEditing">{{ t('Düzenle') }}</V2Button>
        <V2Button v-else to="/yorumlarim" arrow>{{ t('Yorumlarım') }}</V2Button>
      </template>
      <template v-else>
        <p v-if="dirty && !live" class="draft t-body-sm"><Check :size="16" aria-hidden="true"/>{{ t('Taslak otomatik kaydedildi') }}</p>
        <V2Button variant="outline" :disabled="sending" @click="back">{{ step === 1 ? t('Vazgeç') : t('Geri') }}</V2Button>
        <V2Button :arrow="step < steps.length" :disabled="!canContinue" @click="next">{{ primaryLabel }}</V2Button>
      </template>
    </template>
  </V2Modal>
</template>

<style scoped>
.body{display:flex;flex-direction:column;gap:22px}
.pane{display:flex;flex-direction:column;gap:22px}

.steps{display:flex;align-items:center;gap:10px}
.step{display:flex;align-items:center;gap:8px;flex:none;color:var(--ink-500)}
.num{display:grid;place-items:center;width:28px;height:28px;border-radius:999px;background:var(--cream-100);font-family:var(--font-mono);font-weight:700;font-size:11px;letter-spacing:.06em;color:var(--ink-500)}
.step.current,.step.done{color:var(--ink-900)}
.step.current .num{background:var(--orange-500);color:var(--ink-900)}
.step.done .num{background:var(--ink-900);color:var(--lime-400)}
.line{flex:1;min-width:12px;height:2px;background:var(--cream-200)}
.line.on{background:var(--ink-900)}

.pick{display:flex;flex-direction:column;align-items:center;gap:14px;padding:32px 16px;background:var(--cream-50);border:1px solid var(--cream-200);border-radius:20px;text-align:center}
.overall{display:flex;align-items:center;gap:16px;padding:16px;background:var(--cream-50);border:1px solid var(--cream-200);border-radius:20px}
.grow{flex:1}
.word{min-width:52px}
.dims{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 16px}
.dim{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--ink-700)}
.group{border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:10px}
.group legend{padding:0;margin-bottom:10px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.two{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.review-text{height:120px;min-height:120px}
.counter-row{display:flex;justify-content:space-between;gap:12px;font-size:13px;line-height:1.45;color:var(--ink-500)}
.counter{flex:none}
.consent{display:flex;align-items:center;gap:10px;cursor:pointer;color:var(--ink-800)}
.consent .checkbox:checked{background:var(--orange-500);border-color:var(--orange-500)}
.consent .checkbox:checked::before{border-color:var(--ink-900)}

.drop{display:flex;flex-direction:column;align-items:center;gap:10px;padding:36px 16px;background:var(--cream-50);border:1.5px dashed var(--cream-200);border-radius:20px;text-align:center;cursor:pointer;transition:border-color .15s ease}
.drop:hover,.drop:focus-within{border-color:var(--ink-900)}
.drop.full{cursor:default;opacity:.7}
.drop-icon{display:grid;place-items:center;width:64px;height:64px;border-radius:999px;background:var(--white);color:var(--ink-700)}
.thumbs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:10px}
.thumb{position:relative;aspect-ratio:1;border-radius:16px;overflow:hidden;background:var(--cream-100)}
.thumb img{width:100%;height:100%;object-fit:cover}
.remove{position:absolute;top:6px;right:6px;display:grid;place-items:center;width:26px;height:26px;border-radius:999px;background:var(--white);color:var(--ink-900);box-shadow:0 4px 8px rgba(10,20,36,.15)}

.send-error{color:var(--red-500)}
.dim-summary{display:flex;flex-wrap:wrap;gap:6px 18px}
.dim-summary strong{font-weight:600}

.draft{display:flex;align-items:center;gap:12px;margin-right:auto;color:var(--ink-500)}
.draft :deep(svg){color:var(--green-500)}

.success{display:flex;flex-direction:column;align-items:center;gap:12px;padding:24px 8px 8px;text-align:center}
.success-icon{display:grid;place-items:center;width:72px;height:72px;border-radius:999px;background:var(--lime-400);color:var(--ink-900);margin-bottom:6px}
.success .t-body-md{max-width:480px}

@media (max-width:640px){
  .steps .step .t-label-sm{display:none}
  .step.current .t-label-sm{display:inline}
  .dims,.two{grid-template-columns:1fr}
  .overall{flex-wrap:wrap}
  .thumbs{grid-template-columns:repeat(3,minmax(0,1fr))}
  .draft{width:100%}
}
</style>
