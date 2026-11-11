<script setup lang="ts">
import {ref} from 'vue';
import {FileCheck2, FileText, LockKeyhole, Upload} from '@lucide/vue';
import {evidenceKinds} from '@otosanayide/core/claim-evidence';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import type {EvidenceList} from '~/lib/claim-evidence-helpers';
import {optimizePhoto} from '~/lib/garage-media';

const props = defineProps<{data: EvidenceList; canUpload: boolean; onUpload: (blob: Blob, kind: string) => Promise<void>; onOpen: (id: string) => Promise<Blob>; onWithdraw: (id: string) => Promise<void>; onViewed?: (id: string) => void}>();
const {t: i18nT, localeTag: i18nLocaleTag} = useLocale();
const kind = ref<keyof typeof evidenceKinds>('registration');
const candidate = ref<Blob | null>(null);
const preview = ref('');
const opened = ref<Blob | null>(null);
const openUrl = ref('');
const busy = ref(false);
const error = ref('');

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

async function run(action: () => Promise<void>) {
  busy.value = true;
  error.value = '';
  try {
    await action();
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Belge işlemi tamamlanamadı.';
  } finally {
    busy.value = false;
  }
}

function openItem(id: string) {
  return run(async () => {
    opened.value = await props.onOpen(id);
    props.onViewed?.(id);
  });
}

function withdrawItem(id: string) {
  return run(async () => {
    await props.onWithdraw(id);
    opened.value = null;
  });
}

function pickFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file) {
    void run(async () => {
      candidate.value = null;
      const result = await optimizePhoto(file, 'document');
      candidate.value = result.full;
    });
  }
}

function uploadCandidate() {
  return run(async () => {
    if (!candidate.value) return;
    await props.onUpload(candidate.value, kind.value);
    candidate.value = null;
  });
}
</script>

<template>
  <section class="ds-col ds-g16">
    <h3 class="ds-row ds-g8"><LockKeyhole :size="18" class="ds-i"/>{{ i18nT('Özel başvuru belgeleri') }}</h3>
    <p class="ds-small ds-muted">{{ i18nT('Bu belgeler servis profilinde yayımlanmaz. Yalnızca başvuru sahibi ve yetkili inceleme ekibi erişebilir.') }}</p>
    <div v-if="!data.enabled" class="ds-note warn">{{ i18nT('Güvenli belge deposu henüz açılmadı. Şu anda belge gönderme.') }}</div>
    <p v-if="data.pendingUploads>0" role="status" class="ds-small">{{ data.pendingUploads }}{{ i18nT(' belge işleniyor. Bir süre sonra listeyi yenile.') }}</p>
    <div v-for="(item,i) in data.items" :key="item.id" class="ev-row">
      <FileCheck2 :size="20" class="ds-i"/>
      <div class="ds-col ds-f1 ev-text">
        <span class="ds-small ds-b">{{ i+1 }}. {{ i18nT(evidenceKinds[item.kind]??'Belge sayfası') }}</span>
        <span class="ds-xs ds-muted">{{ Math.ceil(item.bytes/1024) }}{{ i18nT(' KB · Erişim sonu: ') }}{{ new Date(item.expiresAtMs).toLocaleDateString(i18nLocaleTag,{timeZone:'Europe/Istanbul'}) }}</span>
      </div>
      <div class="ds-row ds-wrap ds-g8">
        <button class="ds-btn s sm" :disabled="busy||!data.enabled||item.expiresAtMs<=Date.now()" @click="openItem(item.id)">{{ i18nT('Belgeyi aç') }}</button>
        <button v-if="canUpload" class="ds-btn g sm" :disabled="busy" @click="withdrawItem(item.id)">{{ i18nT('Başvurudan çıkar') }}</button>
      </div>
    </div>
    <div v-if="openUrl" class="ds-card ds-pad16 ds-col ds-g12">
      <div class="ds-row ds-sb ds-wrap ds-g10">
        <h4>{{ i18nT('Belge görünümü') }}</h4>
        <button class="ds-btn s sm" @click="opened=null">{{ i18nT('Belgeyi kapat') }}</button>
      </div>
      <img :src="openUrl" :alt="i18nT('Özel başvuru belgesi')" :style="{maxWidth:'100%',maxHeight:'600px',objectFit:'contain'}"/>
      <a :href="openUrl" target="_blank" rel="noreferrer" class="text-link">{{ i18nT('Tam boyutta aç') }}</a>
    </div>
    <div v-if="canUpload&&data.enabled&&data.items.length+data.pendingUploads<5" class="ds-col ds-g12">
      <label class="ds-col"><span class="ds-label">{{ i18nT('Belge türü') }}</span><select v-model="kind" class="ds-field" :disabled="busy"><option v-for="[id,label] in Object.entries(evidenceKinds)" :key="id" :value="id">{{ i18nT(label) }}</option></select></label>
      <div class="ev-row">
        <FileText :size="20" class="ds-i"/>
        <div class="ds-col ds-f1 ev-text">
          <span class="ds-small ds-b">{{ i18nT('Belge sayfasının fotoğrafı') }}</span>
          <span class="ds-xs ds-muted">{{ i18nT('Başvuru başına en fazla 5 sayfa. JPEG, PNG, WebP; cihazda hazırlanmış sayfa en fazla 4 MB. Kimlik kartı veya banka/kart bilgisi yükleme; belgede gerekli olmayan kişisel alanları önceden kapat.') }}</span>
        </div>
        <label :class="['ds-btn', 's', 'sm', 'ev-upload', {'is-busy': busy}]"><Upload :size="15"/>{{ i18nT('Yükle') }}<input class="sr-only" type="file" accept="image/jpeg,image/png,image/webp" :aria-label="i18nT('Belge sayfasının fotoğrafı')" :disabled="busy" @change="pickFile"/></label>
      </div>
      <template v-if="preview">
        <img :src="preview" :alt="i18nT('Gönderilecek belge önizlemesi')" :style="{maxWidth:'100%',maxHeight:'360px',objectFit:'contain'}"/>
        <a :href="preview" target="_blank" rel="noreferrer" class="text-link">{{ i18nT('Göndermeden önce okunabilirliğini kontrol et') }}</a>
        <div class="ds-row ds-wrap ds-g10">
          <button class="ds-btn p sm" :disabled="busy" @click="uploadCandidate"><Upload :size="16"/>{{ busy?i18nT('Gönderiliyor…'):i18nT('Belgeyi güvenli gönder') }}</button>
          <button class="ds-btn g sm" :disabled="busy" @click="candidate=null">{{ i18nT('Seçimi kaldır') }}</button>
        </div>
      </template>
    </div>
    <p v-if="busy" role="status" class="ds-small ds-muted">{{ i18nT('Belge işlemi sürüyor…') }}</p>
    <div v-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</div>
    <p class="ds-xs ds-muted">{{ i18nT('Belge erişimi yüklemeden 90 gün sonra kapanır. Başvurudan çıkarma incelemeyi geri alır; dosyayı anında fiziksel olarak silmez.') }}</p>
  </section>
</template>

<style scoped>
p {margin: 0;}
h3 {margin: 0;}
h4 {margin: 0; font-size: 15px;}
.ev-row {display: flex; align-items: center; flex-wrap: wrap; gap: 12px; padding: 14px; border: 1px solid #dfe5eb; border-radius: 12px;}
.ev-text {min-width: 200px;}
.ev-upload {position: relative;}
.ev-upload:focus-within {outline: 2px solid #2459b4; outline-offset: 2px;}
.is-busy {opacity: .55; cursor: wait;}
</style>
