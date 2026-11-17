<script setup lang="ts">
import {computed, onBeforeUnmount, reactive, ref, watch} from 'vue';
import {Check, ChevronDown, ImagePlus, Info, X} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import V2Chip from '~/components/v2/V2Chip.vue';
import V2Modal from '~/components/v2/V2Modal.vue';
import ProfileReviewItem from './ProfileReviewItem.vue';
import ProfileStarInput from './ProfileStarInput.vue';
import type {MockBusiness} from '~/data/mock/businesses';
import {mockMember} from '~/data/mock/session';
import {ratingWords, resolvedOptions, reviewDimensions, visitMonths, type ProfileData, type ProfileReview} from '~/data/mock/profile';

// W07 "Yorum yaz" modal: 1 Puan → 2 Deneyim (Figma 122:958) → 3 Fotoğraf → 4 Önizleme → success. Mock only.
const props = withDefaults(defineProps<{open: boolean; business: MockBusiness; profile: ProfileData; demo?: boolean}>(), {demo: false});
const emit = defineEmits<{close: []}>();

const steps = ['Puan', 'Deneyim', 'Fotoğraf', 'Önizleme'] as const;
const maxText = 2000;
const maxPhotos = 5;

const step = ref(1);
const done = ref(false);
const form = reactive({
  rating: 0,
  dims: reviewDimensions.map(() => 0),
  resolved: '' as '' | (typeof resolvedOptions)[number],
  service: '',
  month: visitMonths[0]!,
  text: '',
  consent: false,
});
const photos = ref<{id: number; url: string; name: string}[]>([]);
let photoSeq = 0;

function reset() {
  step.value = 1;
  done.value = false;
  Object.assign(form, {rating: 0, dims: reviewDimensions.map(() => 0), resolved: '', service: props.profile.services[0] ?? '', month: visitMonths[0]!, text: '', consent: false});
  clearPhotos();
}

function fillDemo() {
  // The exact state drawn in Figma W07 (step 2).
  Object.assign(form, {rating: 5, dims: [5, 5, 4, 5, 4], resolved: 'Evet', service: props.profile.services[0] ?? '', month: 'Ekim 2026', text: 'Kapıdaki göçük iz bırakmadan çıktı. Fiyatı işe başlamadan söylediler, teslimde değişmedi.', consent: true});
  step.value = 2;
}

watch(() => props.open, (open) => {
  if (!open) return;
  if (done.value) reset();
  if (!form.service) form.service = props.profile.services[0] ?? '';
  if (props.demo) fillDemo();
}, {immediate: true});

const dirty = computed(() => form.rating > 0 || form.text.length > 0);
const canContinue = computed(() => {
  if (step.value === 1) return form.rating > 0;
  if (step.value === 2) return form.rating > 0 && form.text.trim().length >= 20 && form.consent;
  return true;
});
const primaryLabel = computed(() => (step.value < steps.length ? `Devam: ${steps[step.value]}` : 'Yorumu gönder'));
const textHint = computed(() => (form.text.trim().length > 0 && form.text.trim().length < 20 ? 'En az 20 karakter yazın.' : 'Plaka, telefon veya fatura kimlik bilgisi yazmayın.'));

function next() {
  if (!canContinue.value) return;
  if (step.value < steps.length) step.value += 1;
  else done.value = true;
}
function back() {
  if (step.value > 1) step.value -= 1;
  else emit('close');
}
function close() {
  emit('close');
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

const previewReview = computed<ProfileReview>(() => ({
  id: 'onizleme',
  author: mockMember.shortName,
  initials: mockMember.initials,
  avatarColor: 'var(--lime-100)',
  meta: [form.month, form.service].filter(Boolean).join(' · '),
  rating: form.rating,
  text: form.text.trim(),
  resolved: form.resolved || 'Henüz belli değil',
  photoCount: photos.value.length,
  ownerReply: null,
  helpful: 0,
}));
</script>

<template>
  <V2Modal :open="open" title="Deneyimini paylaş" :subtitle="business.name" :width="760" @close="close">
    <div v-if="done" class="success" role="status">
      <span class="success-icon"><Check :size="30" aria-hidden="true"/></span>
      <p class="t-h3">Teşekkürler, yorumun alındı</p>
      <p class="t-body-md t-muted">Yorumun incelendikten sonra {{ business.name }} profilinde yayınlanır. İşletme yanıt verdiğinde sana haber vereceğiz.</p>
    </div>

    <div v-else class="body">
      <ol class="steps" aria-label="Adımlar">
        <template v-for="(label, i) in steps" :key="label">
          <li class="step" :class="{done: i + 1 < step, current: i + 1 === step}" :aria-current="i + 1 === step ? 'step' : undefined">
            <span class="num"><Check v-if="i + 1 < step" :size="14" aria-hidden="true"/><template v-else>{{ i + 1 }}</template></span>
            <span class="t-label-sm">{{ label }}</span>
          </li>
          <li v-if="i < steps.length - 1" class="line" :class="{on: i + 1 < step}" aria-hidden="true"/>
        </template>
      </ol>

      <!-- 1 · Puan -->
      <section v-if="step === 1" class="pane" aria-label="Puan">
        <div class="pick">
          <p class="t-label-md">Genel deneyim</p>
          <ProfileStarInput v-model="form.rating" label="Genel deneyim puanı" :size="44"/>
          <p class="t-label-sm t-muted">{{ form.rating ? ratingWords[form.rating] : 'Puanını seç' }}</p>
        </div>
        <p class="hint"><Info aria-hidden="true"/>Ayrıntılı boyut puanlarını ve yorumunu bir sonraki adımda ekleyebilirsin.</p>
      </section>

      <!-- 2 · Deneyim (Figma W07) -->
      <section v-else-if="step === 2" class="pane" aria-label="Deneyim">
        <div class="overall">
          <p class="t-label-md">Genel deneyim</p>
          <span class="grow"/>
          <ProfileStarInput v-model="form.rating" label="Genel deneyim puanı" :size="28"/>
          <p class="t-label-sm t-muted word">{{ ratingWords[form.rating] }}</p>
        </div>
        <div class="dims">
          <div v-for="(dim, i) in reviewDimensions" :key="dim" class="dim">
            <span class="t-body-sm">{{ dim }}</span>
            <ProfileStarInput :model-value="form.dims[i] ?? 0" :label="`${dim} puanı`" :size="18" @update:model-value="form.dims[i] = $event"/>
          </div>
          <p class="t-body-sm t-muted dim-note">Boyut puanları isteğe bağlıdır.</p>
        </div>
        <fieldset class="group">
          <legend class="field-label">Sorun çözüldü mü?</legend>
          <div class="chips">
            <V2Chip v-for="option in resolvedOptions" :key="option" as="button" :variant="form.resolved === option ? 'active' : 'default'" :pressed="form.resolved === option" @click="form.resolved = option">{{ option }}</V2Chip>
          </div>
        </fieldset>
        <div class="two">
          <label class="field">
            <span class="field-label">Hizmet</span>
            <span class="select-wrap">
              <select v-model="form.service" class="select">
                <option v-for="service in profile.services" :key="service" :value="service">{{ service }}</option>
              </select>
              <ChevronDown :size="16" aria-hidden="true"/>
            </span>
          </label>
          <label class="field">
            <span class="field-label">Ziyaret ayı</span>
            <span class="select-wrap">
              <select v-model="form.month" class="select">
                <option v-for="month in visitMonths" :key="month" :value="month">{{ month }}</option>
              </select>
              <ChevronDown :size="16" aria-hidden="true"/>
            </span>
          </label>
        </div>
        <label class="field">
          <span class="field-label">Yorumun</span>
          <textarea v-model="form.text" class="textarea review-text" :maxlength="maxText" placeholder="Ne yaptırdın, nasıl geçti? Fiyat, süre ve iletişim hakkında yaz." aria-describedby="yorum-ipucu"/>
          <span id="yorum-ipucu" class="counter-row">
            <span>{{ textHint }}</span>
            <span class="t-mono-sm counter">{{ form.text.length }} / {{ maxText }}</span>
          </span>
        </label>
        <label class="consent">
          <input v-model="form.consent" type="checkbox" class="checkbox">
          <span class="t-body-sm">Yorumumu gerçek bir ziyarete dayanarak yazdığımı beyan ederim.</span>
        </label>
      </section>

      <!-- 3 · Fotoğraf -->
      <section v-else-if="step === 3" class="pane" aria-label="Fotoğraf">
        <label class="drop" :class="{full: photos.length >= maxPhotos}">
          <input type="file" accept="image/*" multiple class="sr-only" :disabled="photos.length >= maxPhotos" @change="addPhotos">
          <span class="drop-icon"><ImagePlus :size="26" aria-hidden="true"/></span>
          <span class="t-label-md">{{ photos.length >= maxPhotos ? 'Fotoğraf sınırına ulaştın' : 'Fotoğraf ekle' }}</span>
          <span class="t-body-sm t-muted">En fazla {{ maxPhotos }} fotoğraf · JPG veya PNG · İsteğe bağlı</span>
        </label>
        <ul v-if="photos.length" class="thumbs">
          <li v-for="photo in photos" :key="photo.id" class="thumb">
            <img :src="photo.url" :alt="photo.name">
            <button type="button" class="remove" :aria-label="`${photo.name} fotoğrafını kaldır`" @click="removePhoto(photo.id)"><X :size="14" aria-hidden="true"/></button>
          </li>
        </ul>
        <p class="hint"><Info aria-hidden="true"/>Plaka, yüz ve fatura bilgisi görünmesin. Fotoğraflar yayından önce incelenir.</p>
      </section>

      <!-- 4 · Önizleme -->
      <section v-else class="pane" aria-label="Önizleme">
        <p class="field-label">Yorumun profilde böyle görünecek</p>
        <ProfileReviewItem :review="previewReview" preview/>
        <ul v-if="form.dims.some((d) => d > 0)" class="dim-summary t-body-sm">
          <li v-for="(dim, i) in reviewDimensions" v-show="form.dims[i]" :key="dim"><span class="t-muted">{{ dim }}</span> <strong>{{ form.dims[i] }}/5</strong></li>
        </ul>
        <p class="hint"><Info aria-hidden="true"/>Yorumun incelendikten sonra yayınlanır. İşletme yanıt verebilir; yanıtı yorumunun altında görünür.</p>
      </section>
    </div>

    <template #footer>
      <template v-if="done">
        <V2Button @click="close">Kapat</V2Button>
      </template>
      <template v-else>
        <p v-if="dirty" class="draft t-body-sm"><Check :size="16" aria-hidden="true"/>Taslak otomatik kaydedildi</p>
        <V2Button variant="outline" @click="back">{{ step === 1 ? 'Vazgeç' : 'Geri' }}</V2Button>
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
.select-wrap{position:relative;display:block}
.select-wrap .select{appearance:none;-webkit-appearance:none;padding:14px 42px 14px 16px;border-radius:16px;cursor:pointer}
.select-wrap :deep(svg){position:absolute;right:16px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--ink-900)}
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
