<script setup lang="ts">
import {computed, onBeforeUnmount, reactive, ref} from 'vue';
import {ArrowRight, Clock, Info, Lock, Plus, X} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import V2Chip from '~/components/v2/V2Chip.vue';
import RequestBusinessHead from '~/components/v2/requests/RequestBusinessHead.vue';
import RequestStepper from '~/components/v2/requests/RequestStepper.vue';
import RequestSuccessCard from '~/components/v2/requests/RequestSuccessCard.vue';
import {useMemberPage} from '~/composables/useMemberPage';
import {
  DEFAULT_REQUEST_BUSINESS_ID, REQUEST_DESCRIPTION_MAX, requestBusiness, requestContactOptions, requestMockAnswers,
  requestServices, requestTimeOptions, requestVehicles, responseHoursFor,
} from '~/data/mock/requests';

// W14 · Teklif iste (Figma 126:524). Four-step wizard; step 3 "Sorunu anlat" is the Figma frame.
// ?adim=1..4 opens a step (later steps come pre-filled with mock answers), ?servis=<id> picks the business.
useMemberPage();

useSeoMeta({title: 'Teklif iste'});

const route = useRoute();
const router = useRouter();

const business = computed(() => requestBusiness(String(route.query.servis ?? '')) ?? requestBusiness(DEFAULT_REQUEST_BUSINESS_ID)!);

const steps = ['Hizmet', 'Araç', 'Sorun', 'Özet'];
const titles = ['Hizmeti seç', 'Aracını seç', 'Sorunu anlat', 'Kontrol et ve gönder'];
const leads = [
  'Yaptırmak istediğin işi seç. Emin değilsen en yakın olanı seçmen yeterli.',
  'Ön teklif aracına göre hazırlanır. Garajındaki araçlardan birini seç ya da yenisini yaz.',
  'İşletme, açıklamana göre ön teklif hazırlar. Kesin fiyat ön incelemeden sonra netleşir.',
  'Göndermeden önce son kez kontrol et. Talep yalnız seçtiğin işletmeye gider.',
];

const initialStep = Math.min(4, Math.max(1, Number.parseInt(String(route.query.adim ?? '1'), 10) || 1));
const step = ref(initialStep);
const submitted = ref(false);

interface Photo { src: string; name: string; local: boolean }
const form = reactive({
  serviceId: initialStep >= 2 ? requestMockAnswers.serviceId : '',
  vehicleId: initialStep >= 3 ? requestMockAnswers.vehicleId : '',
  otherBrand: '',
  otherModel: '',
  otherYear: '',
  description: initialStep >= 3 ? requestMockAnswers.description : '',
  photos: (initialStep >= 3 ? requestMockAnswers.photos.map((src, index) => ({src, name: `Fotoğraf ${index + 1}`, local: false})) : []) as Photo[],
  timeId: requestMockAnswers.timeId,
  contactId: requestMockAnswers.contactId,
  consent: false,
});

const service = computed(() => requestServices.find((item) => item.id === form.serviceId));
const vehicleLabel = computed(() => {
  if (form.vehicleId === 'diger') {
    const text = [form.otherBrand, form.otherModel].filter(Boolean).join(' ').trim();
    return text ? `${text}${form.otherYear ? ` · ${form.otherYear}` : ''}` : '';
  }
  return requestVehicles.find((item) => item.id === form.vehicleId)?.label ?? '';
});
const timeLabel = computed(() => requestTimeOptions.find((item) => item.id === form.timeId)?.label ?? '');
const contactLabel = computed(() => requestContactOptions.find((item) => item.id === form.contactId)?.label ?? '');

const stepValid = computed(() => {
  if (step.value === 1) return Boolean(form.serviceId);
  if (step.value === 2) return form.vehicleId === 'diger' ? Boolean(form.otherBrand.trim() && form.otherModel.trim()) : Boolean(form.vehicleId);
  if (step.value === 3) return form.description.trim().length >= 10;
  return form.consent;
});
const stepHint = computed(() => [
  'Devam etmek için bir hizmet seç.',
  'Devam etmek için bir araç seç ya da marka ve modeli yaz.',
  'Açıklama en az 10 karakter olmalı.',
  'Göndermek için onay kutusunu işaretle.',
][step.value - 1]);
const tried = ref(false);

function go(target: number) {
  step.value = target;
  tried.value = false;
  void router.replace({query: {...route.query, adim: String(target)}});
  if (import.meta.client) window.scrollTo({top: 0, behavior: 'smooth'});
}
function next() {
  if (!stepValid.value) {
    tried.value = true;
    return;
  }
  if (step.value < 4) go(step.value + 1);
  else submit();
}
function submit() {
  submitted.value = true;
  if (import.meta.client) window.scrollTo({top: 0, behavior: 'smooth'});
}

const fileInput = ref<HTMLInputElement | null>(null);
const MAX_PHOTOS = 5;
function onFiles(event: Event) {
  const input = event.target as HTMLInputElement;
  for (const file of Array.from(input.files ?? [])) {
    if (form.photos.length >= MAX_PHOTOS || !file.type.startsWith('image/')) continue;
    form.photos.push({src: URL.createObjectURL(file), name: file.name, local: true});
  }
  input.value = '';
}
function removePhoto(index: number) {
  const [photo] = form.photos.splice(index, 1);
  if (photo?.local) URL.revokeObjectURL(photo.src);
}
onBeforeUnmount(() => form.photos.forEach((photo) => photo.local && URL.revokeObjectURL(photo.src)));

const nextLabel = computed(() => (step.value < 4 ? `Devam: ${steps[step.value]}` : 'Talebi gönder'));
</script>

<template>
  <div class="talep">
    <header class="head v2-wrap">
      <p class="t-mono-md t-eyebrow">TEKLİF İSTE</p>
      <h1 class="t-h2">{{ submitted ? 'Talebin gönderildi' : titles[step - 1] }}</h1>
      <RequestStepper :steps="steps" :current="submitted ? 5 : step" :done="submitted ? 4 : step - 1" @go="go"/>
    </header>

    <div class="body v2-wrap">
      <RequestSuccessCard
        v-if="submitted"
        class="main"
        eyebrow="TALEP GÖNDERİLDİ"
        :title="`${business.name} talebini aldı.`"
        :text="`Ortalama ${responseHoursFor(business.id)} saat içinde ön teklif gelir. Teklif gelince bildirim alırsın; Taleplerim sayfasından takip edebilirsin.`"
      >
        <template #actions>
          <V2Button to="/taleplerim" size="lg" arrow>Taleplerime git</V2Button>
          <V2Button to="/" variant="outline">Ana sayfaya dön</V2Button>
        </template>
      </RequestSuccessCard>

      <form v-else class="main surface form" novalidate @submit.prevent="next">
        <p class="t-body-md t-muted lead">{{ leads[step - 1] }}</p>

        <!-- 1 · Hizmet -->
        <fieldset v-if="step === 1" class="group">
          <legend class="field-label">Hizmet</legend>
          <div class="option-grid">
            <label v-for="item in requestServices" :key="item.id" class="option">
              <input v-model="form.serviceId" type="radio" name="hizmet" :value="item.id" class="radio">
              <span class="opt-copy"><span>{{ item.label }}</span><span class="t-body-sm t-muted opt-hint">{{ item.hint }}</span></span>
            </label>
          </div>
        </fieldset>

        <!-- 2 · Araç -->
        <fieldset v-else-if="step === 2" class="group">
          <legend class="field-label">Garajındaki araçlar</legend>
          <div class="option-list">
            <label v-for="item in requestVehicles" :key="item.id" class="option">
              <input v-model="form.vehicleId" type="radio" name="arac" :value="item.id" class="radio">
              <span class="opt-copy"><span>{{ item.label }}</span><span class="t-body-sm t-muted opt-hint">{{ item.detail }}</span></span>
            </label>
            <label class="option">
              <input v-model="form.vehicleId" type="radio" name="arac" value="diger" class="radio">
              <span class="opt-copy"><span>Başka bir araç</span><span class="t-body-sm t-muted opt-hint">Garajına eklemeden yaz</span></span>
            </label>
          </div>
          <div v-if="form.vehicleId === 'diger'" class="other">
            <label class="field"><span class="field-label">Marka</span><input v-model="form.otherBrand" class="input" placeholder="Örn. Toyota" autocomplete="off"></label>
            <label class="field"><span class="field-label">Model</span><input v-model="form.otherModel" class="input" placeholder="Örn. Corolla" autocomplete="off"></label>
            <label class="field"><span class="field-label">Yıl</span><input v-model="form.otherYear" class="input" inputmode="numeric" maxlength="4" placeholder="2020" autocomplete="off"></label>
          </div>
        </fieldset>

        <!-- 3 · Sorun (Figma) -->
        <template v-else-if="step === 3">
          <div class="field">
            <label for="talep-aciklama" class="field-label">Açıklama</label>
            <textarea
              id="talep-aciklama"
              v-model="form.description"
              class="textarea desc"
              :class="{filled: form.description}"
              :maxlength="REQUEST_DESCRIPTION_MAX"
              placeholder="Ne oldu, ne zamandır var, hangi durumda ortaya çıkıyor?"
              aria-describedby="talep-aciklama-not"
            />
            <div id="talep-aciklama-not" class="desc-foot">
              <span class="hint"><Lock :size="14" aria-hidden="true"/>Plaka ve telefon gibi kişisel bilgileri yazman gerekmez.</span>
              <span class="t-mono-sm t-muted count">{{ form.description.length }} / {{ REQUEST_DESCRIPTION_MAX }}</span>
            </div>
          </div>

          <div class="group photos-group">
            <p id="talep-foto" class="field-label">Fotoğraf (isteğe bağlı)</p>
            <ul class="photos" aria-labelledby="talep-foto">
              <li v-for="(photo, index) in form.photos" :key="photo.src" class="photo">
                <img :src="photo.src" :alt="photo.name" width="112" height="112">
                <button type="button" class="photo-x" :aria-label="`${photo.name} kaldır`" @click="removePhoto(index)"><X :size="14" aria-hidden="true"/></button>
              </li>
              <li v-if="form.photos.length < MAX_PHOTOS">
                <button type="button" class="add" @click="fileInput?.click()">
                  <Plus :size="22" aria-hidden="true"/><span class="t-label-sm">Ekle</span>
                </button>
                <input ref="fileInput" type="file" accept="image/*" multiple class="sr-only" tabindex="-1" aria-hidden="true" @change="onFiles">
              </li>
            </ul>
            <p class="t-body-sm t-muted small">Konum bilgisi (EXIF) yükleme sırasında temizlenir.</p>
          </div>

          <div class="group">
            <p id="talep-zaman" class="field-label">Tercih edilen zaman</p>
            <div class="chips" role="group" aria-labelledby="talep-zaman">
              <V2Chip v-for="item in requestTimeOptions" :key="item.id" as="button" :variant="form.timeId === item.id ? 'active' : 'default'" :pressed="form.timeId === item.id" @click="form.timeId = item.id">{{ item.label }}</V2Chip>
            </div>
          </div>

          <div class="group">
            <p id="talep-iletisim" class="field-label">İletişim tercihi</p>
            <div class="chips" role="group" aria-labelledby="talep-iletisim">
              <V2Chip v-for="item in requestContactOptions" :key="item.id" as="button" :variant="form.contactId === item.id ? 'active' : 'default'" :pressed="form.contactId === item.id" @click="form.contactId = item.id">{{ item.label }}</V2Chip>
            </div>
          </div>
        </template>

        <!-- 4 · Özet -->
        <template v-else>
          <dl class="review">
            <div class="review-row"><dt>Hizmet</dt><dd>{{ service?.label }}</dd><button type="button" class="edit" @click="go(1)">Düzenle</button></div>
            <div class="review-row"><dt>Araç</dt><dd>{{ vehicleLabel }}</dd><button type="button" class="edit" @click="go(2)">Düzenle</button></div>
            <div class="review-row"><dt>Açıklama</dt><dd class="long">{{ form.description }}</dd><button type="button" class="edit" @click="go(3)">Düzenle</button></div>
            <div class="review-row">
              <dt>Fotoğraf</dt>
              <dd>
                <span v-if="!form.photos.length">Eklenmedi</span>
                <span v-else class="mini-photos"><img v-for="photo in form.photos" :key="photo.src" :src="photo.src" :alt="photo.name" width="48" height="48"></span>
              </dd>
              <button type="button" class="edit" @click="go(3)">Düzenle</button>
            </div>
            <div class="review-row"><dt>Tercih edilen zaman</dt><dd>{{ timeLabel }}</dd><button type="button" class="edit" @click="go(3)">Düzenle</button></div>
            <div class="review-row"><dt>İletişim tercihi</dt><dd>{{ contactLabel }}</dd><button type="button" class="edit" @click="go(3)">Düzenle</button></div>
          </dl>
          <label class="consent">
            <input v-model="form.consent" type="checkbox" class="checkbox">
            <span class="t-body-sm">Açıklamamın ve fotoğraflarımın yalnız {{ business.name }} ile paylaşılmasını onaylıyorum.</span>
          </label>
        </template>

        <p v-if="tried && !stepValid" class="error t-body-sm" role="alert">{{ stepHint }}</p>

        <hr class="divider">
        <div class="actions">
          <V2Button v-if="step > 1" variant="outline" @click="go(step - 1)">Geri</V2Button>
          <V2Button v-else variant="outline" :to="`/servis/${business.id}`">Vazgeç</V2Button>
          <span class="spacer"/>
          <button type="submit" class="btn btn-primary btn-lg" :aria-disabled="!stepValid">{{ nextLabel }}<ArrowRight aria-hidden="true"/></button>
        </div>
      </form>

      <aside class="summary surface" aria-label="Talep özeti">
        <p class="t-mono-sm t-muted">TALEBİN GİDECEĞİ İŞLETME</p>
        <RequestBusinessHead :business="business"/>
        <p class="resp t-body-sm"><Clock :size="16" aria-hidden="true"/>Ortalama yanıt süresi: {{ responseHoursFor(business.id) }} saat</p>
        <hr class="divider">
        <p class="t-mono-sm t-muted">SEÇİMLERİN</p>
        <div class="row"><span class="t-body-sm t-muted">Hizmet</span><span class="t-label-sm">{{ service?.label || '—' }}</span></div>
        <div class="row"><span class="t-body-sm t-muted">Araç</span><span class="t-label-sm">{{ vehicleLabel || '—' }}</span></div>
        <div class="note"><Info :size="16" aria-hidden="true"/><p class="t-body-sm">Talep yalnız bu işletmeye gider. Yanıt gelmezse benzer işletmelere göndermeyi sen seçersin.</p></div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.head{display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding-top:48px}
.body{display:flex;align-items:flex-start;gap:32px;padding-top:36px;padding-bottom:104px}
.main{flex:1 1 0;min-width:0}
.form{display:flex;flex-direction:column;gap:24px;padding:32px}
.lead{max-width:700px}

.group{display:flex;flex-direction:column;gap:10px;border:0;margin:0;padding:0;min-width:0}
fieldset.group legend{padding:0;margin-bottom:10px}
.option-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.option-list{display:flex;flex-direction:column;gap:10px}
.opt-copy{display:flex;flex-direction:column;gap:3px;min-width:0}
.opt-hint{font-weight:400}
.other{display:grid;grid-template-columns:1fr 1fr 140px;gap:12px;margin-top:6px}

.desc{height:130px;min-height:130px;padding:16px}
.desc.filled{border:1.5px solid var(--ink-900);padding:15.5px}
.desc-foot{display:flex;align-items:center;justify-content:space-between;gap:8px}
.desc-foot .hint{align-items:center}
.desc-foot .hint svg{width:14px;height:14px;margin:0}
.count{flex:none}
.small{font-size:13px}

.photos{display:flex;flex-wrap:wrap;gap:12px}
.photo{position:relative;width:112px;height:112px}
.photo img{width:112px;height:112px;border-radius:18px;object-fit:cover}
.photo-x{position:absolute;top:6px;right:6px;width:26px;height:26px;border-radius:999px;background:rgba(10,21,36,.72);color:var(--white);display:grid;place-items:center;transition:opacity .15s ease}
@media (hover:hover){
  .photo-x{opacity:0}
  .photo:hover .photo-x,.photo-x:focus-visible{opacity:1}
}
.add{width:112px;height:112px;border-radius:18px;border:1px dashed var(--ink-300);background:var(--cream-50);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--ink-700)}
.add:hover{border-color:var(--ink-700)}

.chips{display:flex;flex-wrap:wrap;gap:8px}

.review{display:flex;flex-direction:column;border:1px solid var(--cream-200);border-radius:20px;overflow:hidden}
.review-row{display:grid;grid-template-columns:170px minmax(0,1fr) auto;gap:16px;align-items:center;padding:14px 18px}
.review-row + .review-row{border-top:1px solid var(--cream-200)}
.review dt{font-size:14px;color:var(--ink-500)}
.review dd{font-weight:600;font-size:15px;line-height:1.35;color:var(--ink-900);min-width:0}
.review dd.long{font-weight:400;font-size:14px;line-height:1.45}
.mini-photos{display:flex;gap:8px}
.mini-photos img{width:48px;height:48px;border-radius:12px;object-fit:cover}
.edit{font-weight:600;font-size:13px;color:var(--orange-600)}
.edit:hover{text-decoration:underline}
.consent{display:flex;align-items:flex-start;gap:12px;cursor:pointer}
.consent .t-body-sm{padding-top:2px;color:var(--ink-700)}

.error{color:var(--red-500);font-weight:600;margin-top:-8px}
.actions{display:flex;align-items:center}
.spacer{flex:1}
.btn-primary[aria-disabled=true]{opacity:.55}

.summary{width:380px;flex:none;display:flex;flex-direction:column;align-items:flex-start;gap:16px;padding:24px}
.resp{display:flex;align-items:center;gap:8px;color:var(--ink-700)}
.resp svg{color:var(--ink-500)}
.summary .divider{width:100%}
.row{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%}
.row .t-label-sm{text-align:right;color:var(--ink-900)}
.note{display:flex;align-items:flex-start;gap:10px;width:100%;padding:14px;background:var(--cream-50);border:1px solid var(--cream-200);border-radius:18px}
.note svg{flex:none;color:var(--ink-500);margin-top:1px}
.note p{font-size:13px;color:var(--ink-700)}

@media (max-width:1100px){
  .body{flex-direction:column;align-items:stretch}
  .summary{width:100%}
}
@media (max-width:760px){
  .head{padding-top:32px}
  .body{padding-top:24px;padding-bottom:64px;gap:20px}
  .form{padding:22px;gap:20px}
  .option-grid{grid-template-columns:1fr}
  .other{grid-template-columns:1fr 1fr}
  .desc-foot{flex-direction:column;align-items:flex-start}
  .photos{gap:10px}
  .photo,.photo img,.add{width:96px;height:96px}
  .review-row{grid-template-columns:1fr auto;gap:4px 12px}
  .review-row dt{grid-column:1 / -1}
  .actions .btn-lg{padding:16px 22px;font-size:16px}
}
</style>
