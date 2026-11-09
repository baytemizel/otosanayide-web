<script setup lang="ts">
import {ref} from 'vue';
import PhotoDialog from '~/components/PhotoDialog.vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {optimizePhoto} from '~/lib/garage-media';
import type {ReviewPhoto} from '~/lib/review-photos-helpers';

const props = defineProps<{enabled: boolean; canUpload: boolean; items: ReviewPhoto[]; onUpload: (blob: Blob) => Promise<void>; onOpen: (id: string) => Promise<Blob>; onWithdraw: (id: string, version: number) => Promise<void>}>();

const {t: i18nT} = useLocale();
const candidate = ref<Blob | null>(null);
const preview = ref('');
const opened = ref<Blob | null>(null);
const openUrl = ref('');
const busy = ref(false);
const rights = ref(false);
const error = ref('');
const statusLabels: Record<string, string> = {uploading: 'İşleniyor', pending: 'İnceleme bekliyor', approved: 'Yayımlandı', rejected: 'Reddedildi', hidden: 'Yayında değil'};

useClientEffect(() => [candidate.value], () => {
  if (!candidate.value) {
    preview.value = '';
    return;
  }
  const url = URL.createObjectURL(candidate.value);
  preview.value = url;
  return () => URL.revokeObjectURL(url);
});
useClientEffect(() => [opened.value], () => {
  if (!opened.value) {
    openUrl.value = '';
    return;
  }
  const url = URL.createObjectURL(opened.value);
  openUrl.value = url;
  return () => URL.revokeObjectURL(url);
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
function openItem(p: ReviewPhoto) {
  return run(async () => {
    opened.value = await props.onOpen(p.id);
  });
}
function withdraw(p: ReviewPhoto) {
  return run(async () => {
    await props.onWithdraw(p.id, p.version);
    opened.value = null;
  });
}
function pickFile(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  target.value = '';
  if (file) void run(async () => {
    candidate.value = null;
    rights.value = false;
    const p = await optimizePhoto(file, 'review');
    candidate.value = p.full;
  });
}
function upload() {
  return run(async () => {
    if (!candidate.value || !rights.value) return;
    await props.onUpload(candidate.value);
    candidate.value = null;
    rights.value = false;
  });
}
function closeOpened() {
  opened.value = null;
}
</script>

<template>
  <section class="panel stack">
    <h3>{{ i18nT('Yorum fotoğrafların') }}</h3>
    <p class="small muted">{{ i18nT('En fazla 3 fotoğraf. Fotoğraflar incelemeden sonra yayımlanır. Plaka, yüz, belge ve kişisel bilgileri paylaşmadan önce kapat.') }}</p>
    <p v-if="!enabled" class="notice">{{ i18nT('Yorum fotoğrafı yükleme henüz açılmadı.') }}</p>
    <div v-for="(p,i) in items" :key="p.id" class="panel">
      <strong>{{ i18nT('Fotoğraf') }} {{ i+1 }}</strong>
      <p>{{ i18nT(statusLabels[p.status]??'Belirtilmedi') }}</p>
      <p v-if="p.reason">{{ i18nT('İnceleme gerekçesi') }}: {{ p.reason }}</p>
      <div class="row">
        <button class="button secondary" :disabled="busy||!enabled||p.status==='uploading'" @click="openItem(p)">{{ i18nT('Fotoğrafı aç') }}</button>
        <button class="text-button" :disabled="busy||p.status==='uploading'" @click="withdraw(p)">{{ i18nT('Fotoğrafı geri çek') }}</button>
      </div>
    </div>
    <template v-if="enabled&&canUpload&&items.length<3">
      <label>{{ i18nT('Fotoğraf seç') }}<input type="file" accept="image/jpeg,image/png,image/webp" :disabled="busy" @change="pickFile"/></label>
      <p class="small muted">{{ i18nT('JPEG, PNG veya WebP seç. Fotoğraf cihazında küçültülür; gönderilecek dosya en fazla 2,5 MB olur.') }}</p>
      <template v-if="preview">
        <img :src="preview" :alt="i18nT('Gönderilecek fotoğraf önizlemesi')" :style="{maxWidth:'100%',maxHeight:'300px',objectFit:'contain'}"/>
        <button type="button" class="text-link" @click="opened=candidate">{{ i18nT('Göndermeden önce tam boyutta kontrol et') }}</button>
        <label class="evidence-attestation"><input v-model="rights" type="checkbox" :disabled="busy"/>{{ i18nT('Bu fotoğrafı kendim çektim; paylaşma hakkım var ve gereksiz kişisel bilgileri kapattım.') }}</label>
        <div class="row">
          <button class="button primary" :disabled="busy||!rights" @click="upload">{{ i18nT('Fotoğrafı incelemeye gönder') }}</button>
          <button class="button secondary" :disabled="busy" @click="candidate=null">{{ i18nT('Seçimi kaldır') }}</button>
        </div>
      </template>
    </template>
    <p v-if="busy" role="status">{{ i18nT('Fotoğraf işleniyor…') }}</p>
    <p v-if="error" class="error" role="alert">{{ i18nT(error) }}</p>
    <PhotoDialog v-if="openUrl" :src="openUrl" :onClose="closeOpened"/>
    <p class="small muted">{{ i18nT('Geri çekme yeni erişimi kapatır; daha önce indirilmiş kopyaları silemez. Fiziksel dosya temizliği ayrı çalışır.') }}</p>
  </section>
</template>
