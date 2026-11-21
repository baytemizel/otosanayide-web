<script setup lang="ts">
import {computed, onBeforeUnmount, reactive, ref} from 'vue';
import {ArrowRight, Clock, Info, Lock, Plus, X} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import V2Chip from '~/components/v2/V2Chip.vue';
import RequestBusinessHead from '~/components/v2/requests/RequestBusinessHead.vue';
import RequestStepper from '~/components/v2/requests/RequestStepper.vue';
import RequestSuccessCard from '~/components/v2/requests/RequestSuccessCard.vue';
import {useLocale} from '~/composables/useLocale';
import {useMemberPage} from '~/composables/useMemberPage';
import {memberToken, requestKeyKeeper, requestSendError, sendRequest, useRequestBusiness} from '~/composables/v2/useRequests';
import {
  DEFAULT_REQUEST_BUSINESS_ID, REQUEST_DESCRIPTION_MAX, requestBusiness, requestContactOptions, requestMockAnswers,
  requestServices, requestTimeOptions, requestVehicles, responseHoursFor,
} from '~/data/mock/requests';
import {demoMode} from '~/lib/env';
import {contactParam, otherVehicleText, requestDraftProblem, vehicleOptions, windowParam} from '~/lib/v2/requests';

// W14 · Teklif iste (Figma 126:524). Four-step wizard; step 3 "Sorunu anlat" is the Figma frame.
// Demo: ?adim=1..4 opens a step (later steps come pre-filled with mock answers), ?servis=<id> picks
// the mock business. Live: ?servis=<id> is read from the API; the request is sent with
// POST /api/requests only when the business offers quotes, with the v2-01 fields: the "Tercih edilen
// zaman" chips (preferredWindow), the contact preference and, for a garage vehicle, its vehicleId.
// Photos have no API field, so they are not shown in live mode.
const app = useMemberPage();
const demo = demoMode();
const {t, localeTag} = useLocale();

useSeoMeta({title: () => t('Teklif iste'), robots: 'noindex, nofollow'});

const route = useRoute();
const router = useRouter();

const businessId = computed(() => String(route.query.servis ?? ''));
const live = useRequestBusiness(() => businessId.value, 'quotes');
const business = computed(() => (demo
  ? requestBusiness(businessId.value) ?? requestBusiness(DEFAULT_REQUEST_BUSINESS_ID)!
  : live.business.value));
/** Live only: why the wizard cannot be shown ('' when it can). */
const gate = computed(() => {
  if (demo) return '';
  if (live.state.value !== 'found') return live.state.value;
  return live.canRequest.value ? '' : 'closed';
});

const steps = computed(() => [t('Hizmet'), t('Araç'), t('Sorun'), t('Özet')]);
const titles = computed(() => [t('Hizmeti seç'), t('Aracını seç'), t('Sorunu anlat'), t('Kontrol et ve gönder')]);
const leads = computed(() => [
  t('Yaptırmak istediğin işi seç. Emin değilsen en yakın olanı seçmen yeterli.'),
  t('Ön teklif aracına göre hazırlanır. Garajındaki araçlardan birini seç ya da yenisini yaz.'),
  t('İşletme, açıklamana göre ön teklif hazırlar. Kesin fiyat ön incelemeden sonra netleşir.'),
  t('Göndermeden önce son kez kontrol et. Talep yalnız seçtiğin işletmeye gider.'),
]);

const initialStep = demo ? Math.min(4, Math.max(1, Number.parseInt(String(route.query.adim ?? '1'), 10) || 1)) : 1;
const step = ref(initialStep);
const submitted = ref(false);

/** `n`: number of a demo photo, named "Fotoğraf {n}" at render; uploads keep their file name. */
interface Photo { src: string; name: string; local: boolean; n?: number }
const form = reactive({
  serviceId: initialStep >= 2 ? requestMockAnswers.serviceId : '',
  vehicleId: initialStep >= 3 ? requestMockAnswers.vehicleId : '',
  otherBrand: '',
  otherModel: '',
  otherYear: '',
  description: initialStep >= 3 ? requestMockAnswers.description : '',
  photos: (initialStep >= 3 ? requestMockAnswers.photos.map((src, index) => ({src, name: '', local: false, n: index + 1})) : []) as Photo[],
  timeId: requestMockAnswers.timeId,
  contactId: requestMockAnswers.contactId,
  consent: false,
});

/**
 * Live: the business's own services (API text, shown as sent); the generic list only when it lists none.
 * `text` is what the request carries: the generic list keeps its Turkish name, only `label` is translated.
 */
const serviceOptions = computed(() => (demo || !live.services.value.length
  ? requestServices.map((item) => ({id: item.id, label: t(item.label), hint: t(item.hint), text: item.label}))
  : live.services.value.map((label) => ({id: label, label, hint: '', text: label}))));
const vehicles = computed(() => (demo
  ? requestVehicles.map((item) => ({...item, detail: t(item.detail), text: item.label}))
  : vehicleOptions(app.data.vehicles, localeTag.value)));
const photoName = (photo: Photo) => (photo.n ? t('Fotoğraf {n}', {n: photo.n}) : photo.name);

const service = computed(() => serviceOptions.value.find((item) => item.id === form.serviceId));
const vehicleLabel = computed(() => {
  if (form.vehicleId === 'diger') {
    const text = [form.otherBrand, form.otherModel].filter(Boolean).join(' ').trim();
    return text ? `${text}${form.otherYear ? ` · ${form.otherYear}` : ''}` : '';
  }
  return vehicles.value.find((item) => item.id === form.vehicleId)?.label ?? '';
});
const vehicleText = computed(() => (form.vehicleId === 'diger'
  ? otherVehicleText(form.otherBrand, form.otherModel, form.otherYear)
  : vehicles.value.find((item) => item.id === form.vehicleId)?.text ?? ''));
const timeLabel = computed(() => t(requestTimeOptions.find((item) => item.id === form.timeId)?.label ?? ''));
const contactLabel = computed(() => t(requestContactOptions.find((item) => item.id === form.contactId)?.label ?? ''));

const stepValid = computed(() => {
  if (step.value === 1) return Boolean(form.serviceId);
  if (step.value === 2) return form.vehicleId === 'diger' ? Boolean(form.otherBrand.trim() && form.otherModel.trim()) : Boolean(form.vehicleId);
  if (step.value === 3) return form.description.trim().length >= 10;
  return form.consent;
});
const stepHint = computed(() => [
  t('Devam etmek için bir hizmet seç.'),
  t('Devam etmek için bir araç seç ya da marka ve modeli yaz.'),
  t('Açıklama en az 10 karakter olmalı.'),
  t('Göndermek için onay kutusunu işaretle.'),
][step.value - 1]);
const tried = ref(false);

function go(target: number) {
  if (sending.value) return;
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
  else void submit();
}

const token = memberToken();
const sending = ref(false);
const sendError = ref('');
const requestKey = requestKeyKeeper();
async function submit() {
  if (demo) {
    submitted.value = true;
    if (import.meta.client) window.scrollTo({top: 0, behavior: 'smooth'});
    return;
  }
  if (sending.value || !business.value) return;
  const draft = {
    businessId: business.value.id, kind: 'quotes' as const, service: service.value?.text ?? '', vehicle: vehicleText.value,
    message: form.description.trim(), preferredWindow: windowParam[form.timeId], contactPreference: contactParam[form.contactId],
    ...(form.vehicleId && form.vehicleId !== 'diger' ? {vehicleId: form.vehicleId} : {}),
  };
  sendError.value = requestDraftProblem(draft, t);
  if (sendError.value) return;
  sending.value = true;
  try {
    await sendRequest(token, draft, requestKey.for(draft));
    requestKey.clear();
    submitted.value = true;
    if (import.meta.client) window.scrollTo({top: 0, behavior: 'smooth'});
  } catch (error) {
    sendError.value = requestSendError(error, 'quotes', t);
  } finally {
    sending.value = false;
  }
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

const nextLabel = computed(() => (step.value < 4 ? t('Devam: {step}', {step: steps.value[step.value]!}) : sending.value ? t('Gönderiliyor…') : t('Talebi gönder')));
/** "Garajında araç yok. … {link} sayfasından …" split around {link}, so "Araçlarım" can be a link. */
const noVehicleParts = computed(() => t('Garajında araç yok. Aracını aşağıya yazabilir ya da {link} sayfasından ekleyebilirsin.').split('{link}'));
</script>

<template>
  <div class="talep">
    <header class="head v2-wrap">
      <p class="t-mono-md t-eyebrow">{{ t('TEKLİF İSTE') }}</p>
      <h1 class="t-h2">{{ submitted ? t('Talebin gönderildi') : gate ? t('Teklif iste') : titles[step - 1] }}</h1>
      <RequestStepper v-if="!gate" :steps="steps" :current="submitted ? 5 : step" :done="submitted ? 4 : step - 1" @go="go"/>
    </header>

    <div v-if="gate || !business" class="body v2-wrap">
      <section class="main surface state" :aria-busy="gate === 'loading'">
        <p v-if="gate === 'loading'" class="t-body-md t-muted" role="status">{{ t('İşletme bilgisi yükleniyor…') }}</p>
        <template v-else-if="gate === 'unavailable'">
          <h2 class="t-h4">{{ t('Talep şu anda açılamıyor.') }}</h2>
          <p class="t-body-md t-muted">{{ t('İşletme bilgisi alınamadı. Bağlantını kontrol edip tekrar dene.') }}</p>
          <V2Button variant="outline" @click="router.go(0)">{{ t('Tekrar dene') }}</V2Button>
        </template>
        <template v-else>
          <h2 class="t-h4">{{ gate === 'closed' && business ? t('{name} şu anda teklif talebi kabul etmiyor.', {name: business.name}) : t('Teklif istenecek işletme bulunamadı.') }}</h2>
          <p class="t-body-md t-muted">{{ t('Teklif ve randevu yalnızca bu hizmeti etkinleştiren doğrulanmış işletmelerde kullanılabilir. İşletme profilindeki “Teklif iste” düğmesiyle başla.') }}</p>
          <div class="state-actions">
            <V2Button v-if="business" variant="outline" :to="`/servis/${business.id}`">{{ t('İşletme profiline dön') }}</V2Button>
            <V2Button to="/ara" arrow>{{ t('Servis bul') }}</V2Button>
          </div>
        </template>
      </section>
    </div>

    <div v-else class="body v2-wrap">
      <RequestSuccessCard
        v-if="submitted"
        class="main"
        :eyebrow="t('TALEP GÖNDERİLDİ')"
        :title="t('{name} talebini aldı.', {name: business.name})"
        :text="demo
          ? t('Ortalama {count} saat içinde ön teklif gelir. Teklif gelince bildirim alırsın; Taleplerim sayfasından takip edebilirsin.', {count: responseHoursFor(business.id)})
          : t('İşletme yanıtladığında bildirim alırsın; Taleplerim sayfasından takip edebilirsin. Bu talep bir fiyat taahhüdü veya randevu oluşturmaz.')"
      >
        <template #actions>
          <V2Button to="/taleplerim" size="lg" arrow>{{ t('Taleplerime git') }}</V2Button>
          <V2Button to="/" variant="outline">{{ t('Ana sayfaya dön') }}</V2Button>
        </template>
      </RequestSuccessCard>

      <form v-else class="main surface form" novalidate @submit.prevent="next">
        <p class="t-body-md t-muted lead">{{ leads[step - 1] }}</p>

        <!-- 1 · Hizmet -->
        <fieldset v-if="step === 1" class="group">
          <legend class="field-label">{{ t('Hizmet') }}</legend>
          <div class="option-grid">
            <label v-for="item in serviceOptions" :key="item.id" class="option">
              <input v-model="form.serviceId" type="radio" name="hizmet" :value="item.id" class="radio">
              <span class="opt-copy"><span>{{ item.label }}</span><span v-if="item.hint" class="t-body-sm t-muted opt-hint">{{ item.hint }}</span></span>
            </label>
          </div>
        </fieldset>

        <!-- 2 · Araç -->
        <fieldset v-else-if="step === 2" class="group">
          <legend class="field-label">{{ t('Garajındaki araçlar') }}</legend>
          <div class="option-list">
            <label v-for="item in vehicles" :key="item.id" class="option">
              <input v-model="form.vehicleId" type="radio" name="arac" :value="item.id" class="radio">
              <span class="opt-copy"><span>{{ item.label }}</span><span v-if="item.detail" class="t-body-sm t-muted opt-hint">{{ item.detail }}</span></span>
            </label>
            <p v-if="!vehicles.length" class="t-body-sm t-muted">{{ noVehicleParts[0] }}<NuxtLink to="/araclarim" class="link">{{ t('Araçlarım') }}</NuxtLink>{{ noVehicleParts[1] }}</p>
            <label class="option">
              <input v-model="form.vehicleId" type="radio" name="arac" value="diger" class="radio">
              <span class="opt-copy"><span>{{ t('Başka bir araç') }}</span><span class="t-body-sm t-muted opt-hint">{{ t('Garajına eklemeden yaz') }}</span></span>
            </label>
          </div>
          <div v-if="form.vehicleId === 'diger'" class="other">
            <label class="field"><span class="field-label">{{ t('Marka') }}</span><input v-model="form.otherBrand" class="input" :placeholder="t('Örn. Toyota')" autocomplete="off"></label>
            <label class="field"><span class="field-label">{{ t('Model') }}</span><input v-model="form.otherModel" class="input" :placeholder="t('Örn. Corolla')" autocomplete="off"></label>
            <label class="field"><span class="field-label">{{ t('Yıl') }}</span><input v-model="form.otherYear" class="input" inputmode="numeric" maxlength="4" placeholder="2020" autocomplete="off"></label>
          </div>
        </fieldset>

        <!-- 3 · Sorun (Figma) -->
        <template v-else-if="step === 3">
          <div class="field">
            <label for="talep-aciklama" class="field-label">{{ t('Açıklama') }}</label>
            <textarea
              id="talep-aciklama"
              v-model="form.description"
              class="textarea desc"
              :class="{filled: form.description}"
              :maxlength="REQUEST_DESCRIPTION_MAX"
              :placeholder="t('Ne oldu, ne zamandır var, hangi durumda ortaya çıkıyor?')"
              aria-describedby="talep-aciklama-not"
            />
            <div id="talep-aciklama-not" class="desc-foot">
              <span class="hint"><Lock :size="14" aria-hidden="true"/>{{ t('Plaka ve telefon gibi kişisel bilgileri yazman gerekmez.') }}</span>
              <span class="t-mono-sm t-muted count">{{ form.description.length }} / {{ REQUEST_DESCRIPTION_MAX }}</span>
            </div>
          </div>

          <div v-if="demo" class="group photos-group">
            <p id="talep-foto" class="field-label">{{ t('Fotoğraf (isteğe bağlı)') }}</p>
            <ul class="photos" aria-labelledby="talep-foto">
              <li v-for="(photo, index) in form.photos" :key="photo.src" class="photo">
                <img :src="photo.src" :alt="photoName(photo)" width="112" height="112">
                <button type="button" class="photo-x" :aria-label="t('{name} kaldır', {name: photoName(photo)})" @click="removePhoto(index)"><X :size="14" aria-hidden="true"/></button>
              </li>
              <li v-if="form.photos.length < MAX_PHOTOS">
                <button type="button" class="add" @click="fileInput?.click()">
                  <Plus :size="22" aria-hidden="true"/><span class="t-label-sm">{{ t('Ekle') }}</span>
                </button>
                <input ref="fileInput" type="file" accept="image/*" multiple class="sr-only" tabindex="-1" aria-hidden="true" @change="onFiles">
              </li>
            </ul>
            <p class="t-body-sm t-muted small">{{ t('Konum bilgisi (EXIF) yükleme sırasında temizlenir.') }}</p>
          </div>

          <div class="group">
            <p id="talep-zaman" class="field-label">{{ t('Tercih edilen zaman') }}</p>
            <div class="chips" role="group" aria-labelledby="talep-zaman">
              <V2Chip v-for="item in requestTimeOptions" :key="item.id" as="button" :variant="form.timeId === item.id ? 'active' : 'default'" :pressed="form.timeId === item.id" @click="form.timeId = item.id">{{ t(item.label) }}</V2Chip>
            </div>
          </div>

          <div class="group">
            <p id="talep-iletisim" class="field-label">{{ t('İletişim tercihi') }}</p>
            <div class="chips" role="group" aria-labelledby="talep-iletisim">
              <V2Chip v-for="item in requestContactOptions" :key="item.id" as="button" :variant="form.contactId === item.id ? 'active' : 'default'" :pressed="form.contactId === item.id" @click="form.contactId = item.id">{{ t(item.label) }}</V2Chip>
            </div>
            <p v-if="!demo" class="t-body-sm t-muted small">{{ t('Tercihin işletmeye iletilir. Telefon numaran ve e-posta adresin işletmeyle paylaşılmaz; yazışma Taleplerim sayfasından sürer.') }}</p>
          </div>
        </template>

        <!-- 4 · Özet -->
        <template v-else>
          <dl class="review">
            <div class="review-row"><dt>{{ t('Hizmet') }}</dt><dd>{{ service?.label }}</dd><button type="button" class="edit" @click="go(1)">{{ t('Düzenle') }}</button></div>
            <div class="review-row"><dt>{{ t('Araç') }}</dt><dd>{{ vehicleLabel }}</dd><button type="button" class="edit" @click="go(2)">{{ t('Düzenle') }}</button></div>
            <div class="review-row"><dt>{{ t('Açıklama') }}</dt><dd class="long">{{ form.description }}</dd><button type="button" class="edit" @click="go(3)">{{ t('Düzenle') }}</button></div>
            <div v-if="demo" class="review-row">
              <dt>{{ t('Fotoğraf') }}</dt>
              <dd>
                <span v-if="!form.photos.length">{{ t('Eklenmedi') }}</span>
                <span v-else class="mini-photos"><img v-for="photo in form.photos" :key="photo.src" :src="photo.src" :alt="photoName(photo)" width="48" height="48"></span>
              </dd>
              <button type="button" class="edit" @click="go(3)">{{ t('Düzenle') }}</button>
            </div>
            <div class="review-row"><dt>{{ t('Tercih edilen zaman') }}</dt><dd>{{ timeLabel }}</dd><button type="button" class="edit" @click="go(3)">{{ t('Düzenle') }}</button></div>
            <div class="review-row"><dt>{{ t('İletişim tercihi') }}</dt><dd>{{ contactLabel }}</dd><button type="button" class="edit" @click="go(3)">{{ t('Düzenle') }}</button></div>
          </dl>
          <label class="consent">
            <input v-model="form.consent" type="checkbox" class="checkbox">
            <span class="t-body-sm">{{ demo ? t('Açıklamamın ve fotoğraflarımın yalnız {name} ile paylaşılmasını onaylıyorum.', {name: business.name}) : t('Açıklamamın ve araç bilgimin yalnız {name} ile paylaşılmasını onaylıyorum.', {name: business.name}) }}</span>
          </label>
        </template>

        <p v-if="tried && !stepValid" class="error t-body-sm" role="alert">{{ stepHint }}</p>
        <p v-else-if="sendError" class="error t-body-sm" role="alert">{{ sendError }}</p>

        <hr class="divider">
        <div class="actions">
          <V2Button v-if="step > 1" variant="outline" :disabled="sending" @click="go(step - 1)">{{ t('Geri') }}</V2Button>
          <V2Button v-else variant="outline" :to="`/servis/${business.id}`">{{ t('Vazgeç') }}</V2Button>
          <span class="spacer"/>
          <button type="submit" class="btn btn-primary btn-lg" :aria-disabled="!stepValid" :disabled="sending">{{ nextLabel }}<ArrowRight aria-hidden="true"/></button>
        </div>
      </form>

      <aside class="summary surface" :aria-label="t('Talep özeti')">
        <p class="t-mono-sm t-muted">{{ t('TALEBİN GİDECEĞİ İŞLETME') }}</p>
        <RequestBusinessHead :business="business"/>
        <p v-if="demo" class="resp t-body-sm"><Clock :size="16" aria-hidden="true"/>{{ t('Ortalama yanıt süresi: {count} saat', {count: responseHoursFor(business.id)}) }}</p>
        <hr class="divider">
        <p class="t-mono-sm t-muted">{{ t('SEÇİMLERİN') }}</p>
        <div class="row"><span class="t-body-sm t-muted">{{ t('Hizmet') }}</span><span class="t-label-sm">{{ service?.label || '—' }}</span></div>
        <div class="row"><span class="t-body-sm t-muted">{{ t('Araç') }}</span><span class="t-label-sm">{{ vehicleLabel || '—' }}</span></div>
        <div class="note"><Info :size="16" aria-hidden="true"/><p class="t-body-sm">{{ demo ? t('Talep yalnız bu işletmeye gider. Yanıt gelmezse benzer işletmelere göndermeyi sen seçersin.') : t('Talep yalnız bu işletmeye gider. İşletmenin kabulü olmadan randevu kesinleşmez; bu adımda ödeme alınmaz.') }}</p></div>
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
.state{display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:32px}
.state-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px}
.link{color:var(--orange-600);font-weight:600}
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
