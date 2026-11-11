<script setup lang="ts">
import {ref} from 'vue';
import PhotoDialog from '~/components/PhotoDialog.vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import type {ReviewPhoto} from '~/lib/review-photos-helpers';

const props = defineProps<{photo: ReviewPhoto; onOpen: () => Promise<Blob>; onDecision: (decision: string, reason: string, attested: boolean) => Promise<void>}>();

const {t: i18nT} = useLocale();
const opened = ref<Blob | null>(null);
const url = ref('');
const viewed = ref(false);
const attested = ref(false);
const reason = ref('');
const busy = ref(false);
const error = ref('');

useClientEffect(() => [opened.value], () => {
  if (!opened.value) {
    url.value = '';
    return;
  }
  const u = URL.createObjectURL(opened.value);
  url.value = u;
  return () => URL.revokeObjectURL(u);
});

async function run(f: () => Promise<void>) {
  busy.value = true;
  error.value = '';
  try {
    await f();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Fotoğraf işlemi tamamlanamadı.';
  } finally {
    busy.value = false;
  }
}
function openPhoto() {
  return run(async () => {
    opened.value = await props.onOpen();
    viewed.value = true;
  });
}
function closePhoto() {
  opened.value = null;
}
function submit(e: Event) {
  e.preventDefault();
  void run(() => props.onDecision(props.photo.status === 'approved' ? 'hide' : 'approve', reason.value.trim(), attested.value));
}
function reject() {
  return run(() => props.onDecision('reject', reason.value.trim(), false));
}
</script>

<template>
  <section class="ds-card ds-pad24 ds-col ds-g16">
    <div class="ds-col ds-g4">
      <h3 style="margin:0">{{ i18nT('Yorum fotoğrafı') }}</h3>
      <div class="ds-xs ds-muted">{{ photo.width }} × {{ photo.height }} · {{ Math.ceil(photo.bytes/1024) }} KB</div>
    </div>
    <div><button class="ds-btn s sm" :disabled="busy" @click="openPhoto">{{ i18nT('Fotoğrafı tam boyutta incele') }}</button></div>
    <PhotoDialog v-if="url" :src="url" :onClose="closePhoto"/>
    <div class="ds-note">{{ i18nT('Yüz, plaka, kişisel belge, uygunsuz içerik ve işletmeyle ilgisiz görüntü açısından incele. Görsel AI kontrolü bu akışta etkin değildir.') }}</div>
    <form class="ds-col ds-g16" @submit="submit">
      <label class="ds-col"><span class="ds-label">{{ i18nT('İnceleme gerekçesi') }}</span><textarea v-model="reason" class="ds-field" required minlength="10" maxlength="1000" :disabled="busy"/></label>
      <label v-if="photo.status==='pending'" class="ds-row ds-as ds-g10 ds-small"><input v-model="attested" class="ds-check" type="checkbox" :disabled="busy||!viewed"/>{{ i18nT('Fotoğrafı açıp kişisel bilgi ve yayın uygunluğunu kontrol ettim.') }}</label>
      <div class="ds-row ds-wrap ds-g10">
        <button class="ds-btn" :class="photo.status==='approved'?'d':'n'" :disabled="busy||(photo.status==='pending'&&(!viewed||!attested))">{{ photo.status==='approved'?i18nT('Yayından kaldır'):i18nT('Fotoğrafı yayımla') }}</button>
        <button v-if="photo.status==='pending'" type="button" class="ds-btn d" :disabled="busy||reason.trim().length<10" @click="reject">{{ i18nT('Gerekçeyle reddet') }}</button>
      </div>
    </form>
    <div v-if="error" role="alert" class="ds-note err">{{ i18nT(error) }}</div>
  </section>
</template>

<style scoped>
input.ds-check{width:20px;height:20px;min-height:0;padding:0}
@media(max-width:480px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;text-align:center}}
</style>
