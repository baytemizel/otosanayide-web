<script setup lang="ts">
import {computed, ref} from 'vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {optimizeBrandImage} from '~/lib/brand-image';
import type {BrandView} from '@otosanayide/core/brand-campaigns';

const props = withDefaults(defineProps<{item: BrandView; enabled?: boolean; demo?: boolean; disabled?: boolean; onSaved?: (item: BrandView) => void; onBusy?: (busy: boolean) => void}>(), {enabled: false, demo: false, disabled: false});
const {t} = useLocale();
const app = useApp();
const candidate = ref<Blob | null>(null);
const preview = ref('');
const current = ref('');
const rights = ref(false);
const busy = ref(false);
const error = ref('');
let lock = false, mounted = true;

useClientEffect(() => [], () => {
  mounted = true;
  return () => {
    mounted = false;
  };
});
useClientEffect(() => [candidate.value], () => {
  const blob = candidate.value;
  if (!blob) {
    preview.value = '';
    return;
  }
  const url = URL.createObjectURL(blob);
  preview.value = url;
  return () => URL.revokeObjectURL(url);
});
useClientEffect(() => [current.value], () => {
  const url = current.value;
  return () => {
    if (url) URL.revokeObjectURL(url);
  };
});

async function run(fn: () => Promise<void>) {
  if (lock) return;
  lock = true;
  busy.value = true;
  props.onBusy?.(true);
  error.value = '';
  try {
    await fn();
  } catch (e) {
    if (mounted) error.value = e instanceof Error ? e.message : 'Görsel işlemi başarısız.';
  } finally {
    lock = false;
    if (mounted) busy.value = false;
    props.onBusy?.(false);
  }
}

async function request(method: 'GET' | 'POST') {
  const item = props.item, body = candidate.value;
  const token = await app.user?.getIdToken();
  const query = new URLSearchParams({campaignId: item.id});
  if (method === 'POST') {
    query.set('version', String(item.version));
    query.set('rights', 'yes');
  }
  const r = await apiFetch('/api/admin/brand-media?' + query, {method, headers: {Authorization: `Bearer ${token}`, ...(method === 'POST' ? {'Content-Type': 'image/webp'} : {})}, body: method === 'POST' ? body : undefined, cache: 'no-store'});
  if (!r.ok) {
    const d = await r.json();
    throw Error(d.error);
  }
  return r;
}

const editable = computed(() => ['draft', 'rejected', 'paused'].includes(props.item.status));

function openCurrent() {
  void run(async () => {
    const r = await request('GET'), blob = await r.blob();
    if (mounted) current.value = URL.createObjectURL(blob);
  });
}

function pickFile(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file) void run(async () => {
    const blob = await optimizeBrandImage(file);
    if (mounted) {
      candidate.value = blob;
      rights.value = false;
    }
  });
}

function upload() {
  void run(async () => {
    const r = await request('POST'), d = await r.json();
    props.onSaved?.(d.item);
  });
}
</script>

<template>
  <section class="stack" :aria-label="t('Marka görseli')">
    <h4>{{ t('Marka görseli') }}</h4>
    <template v-if="item.image">
      <p class="small">{{ item.image.width }} × {{ item.image.height }} · {{ Math.ceil(item.image.bytes/1024) }} KB</p>
      <button class="button secondary" :disabled="disabled||busy" @click="openCurrent">{{ t('Güncel görseli aç ve incele') }}</button>
      <img v-if="current" :src="current" :alt="t('Kayıtlı marka görseli')" :style="{width:'100%',maxHeight:'360px',objectFit:'contain',borderRadius:'12px'}"/>
    </template>
    <template v-if="editable">
      <label>{{ t('Görsel seç') }}<input type="file" accept="image/jpeg,image/png,image/webp" :disabled="disabled||busy" @change="pickFile"/></label>
      <p class="small muted">{{ t('JPEG, PNG veya WebP · En fazla 20 MB. Yüklemeden önce cihazında optimize edilir.') }}</p>
      <template v-if="preview">
        <img :src="preview" :alt="t('Yükleme öncesi görsel önizlemesi')" :style="{width:'100%',maxHeight:'360px',objectFit:'contain',borderRadius:'12px'}"/>
        <p>{{ t('Optimize edilmiş boyut') }}: {{ Math.ceil((candidate?.size??0)/1024) }} KB</p>
        <label class="row"><input v-model="rights" type="checkbox" :disabled="disabled||busy"/>{{ t('Bu görseli kullanma iznim olduğunu doğruluyorum.') }}</label>
        <button class="button primary" :disabled="disabled||busy||!rights||!enabled||demo||!item.version" @click="upload">{{ t('Görseli yükle') }}</button>
      </template>
      <p v-if="!enabled||demo" class="notice">{{ t('Yerel önizleme kullanılabilir. Güvenli depolama açılana kadar görsel yükleme kapalıdır.') }}</p>
      <p v-if="!item.version">{{ t('Görsel yüklemeden önce marka taslağını kaydet.') }}</p>
    </template>
    <p v-if="busy" role="status">{{ t('İşleniyor…') }}</p>
    <p v-if="error" role="alert" class="error">{{ t(error) }}</p>
  </section>
</template>
