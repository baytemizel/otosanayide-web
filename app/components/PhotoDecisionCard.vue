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
  <section class="panel stack">
    <h3>{{ i18nT('Yorum fotoğrafı') }}</h3>
    <p>{{ photo.width }} × {{ photo.height }} · {{ Math.ceil(photo.bytes/1024) }} KB</p>
    <button class="button secondary" :disabled="busy" @click="openPhoto">{{ i18nT('Fotoğrafı tam boyutta incele') }}</button>
    <PhotoDialog v-if="url" :src="url" :onClose="closePhoto"/>
    <p class="small muted">{{ i18nT('Yüz, plaka, kişisel belge, uygunsuz içerik ve işletmeyle ilgisiz görüntü açısından incele. Görsel AI kontrolü bu akışta etkin değildir.') }}</p>
    <form @submit="submit">
      <label>{{ i18nT('İnceleme gerekçesi') }}<textarea v-model="reason" required minlength="10" maxlength="1000" :disabled="busy"/></label>
      <label v-if="photo.status==='pending'" class="evidence-attestation"><input v-model="attested" type="checkbox" :disabled="busy||!viewed"/>{{ i18nT('Fotoğrafı açıp kişisel bilgi ve yayın uygunluğunu kontrol ettim.') }}</label>
      <div class="row">
        <button class="button primary" :disabled="busy||(photo.status==='pending'&&(!viewed||!attested))">{{ photo.status==='approved'?i18nT('Yayından kaldır'):i18nT('Fotoğrafı yayımla') }}</button>
        <button v-if="photo.status==='pending'" type="button" class="button secondary" :disabled="busy||reason.trim().length<10" @click="reject">{{ i18nT('Gerekçeyle reddet') }}</button>
      </div>
    </form>
    <p v-if="error" role="alert" class="error">{{ i18nT(error) }}</p>
  </section>
</template>
