<script setup lang="ts">
import {ref} from 'vue';
import {z} from 'zod';
import {accountJson} from '@otosanayide/core/account-client';
import {businessPhotoDecision} from '@otosanayide/core/business-photos';
import {fetchBusinessPhotoMedia} from '@otosanayide/core/public-review-photo-client';
import BusinessPhotosDialog from '~/components/BusinessPhotosDialog.vue';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import type {MediaOptions, ModerationItem} from '~/lib/business-photos-helpers';

const props = defineProps<{photo: ModerationItem; options: MediaOptions; guard: () => void; reload: () => void}>();
const {t} = useLocale();
const uri = ref('');
const viewed = ref(false);
const attest = ref(false);
const reason = ref('');
const busy = ref(false);
const locked = ref(false);
const error = ref(false);

async function decide(decision: 'approve' | 'reject' | 'hide') {
  const guard = props.guard;
  const options = props.options;
  busy.value = true;
  try {
    const value = businessPhotoDecision.parse({id: props.photo.id, version: props.photo.version, decision, reason: reason.value, attested: attest.value});
    let token = '';
    await accountJson({
      guard,
      token: async () => {
        token = await options.token();
        return token;
      },
      request: signal => apiFetch('/api/admin/business-photos', {method: 'PATCH', signal, credentials: 'omit', cache: 'no-store', redirect: 'error', headers: {Authorization: 'Bearer ' + token, 'Content-Type': 'application/json'}, body: JSON.stringify(value)}),
      decode: raw => z.object({ok: z.literal(true)}).strict().parse(raw),
    });
    guard();
    props.reload();
  } catch {
    try {
      guard();
      error.value = true;
      locked.value = true;
    } catch {}
  } finally {
    try {
      guard();
      busy.value = false;
    } catch {}
  }
}

async function inspect() {
  const guard = props.guard;
  const options = props.options;
  busy.value = true;
  try {
    const v = await fetchBusinessPhotoMedia({...options, businessId: props.photo.businessId, id: props.photo.id, thumbnail: false}, {guard, token: options.token});
    guard();
    uri.value = v.uri;
    viewed.value = true;
  } catch {
    error.value = true;
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <article class="panel stack business-media">
    <h3>{{ t('İşletme fotoğrafı') }} · {{ photo.businessId }}</h3>
    <p>{{ photo.width }}×{{ photo.height }} · {{ Math.ceil(photo.bytes/1024) }} KB</p>
    <button class="button secondary" :disabled="busy || locked" @click="inspect">{{ t('Fotoğrafı tam boyutta incele') }}</button>
    <BusinessPhotosDialog v-if="uri" :src="uri" :close="()=>{uri=''}"/>
    <p>{{ t('Yüz, plaka, kişisel belge, uygunsuz içerik ve işletmeyle ilgisiz görüntü açısından incele. Görsel AI kontrolü bu akışta etkin değildir.') }}</p>
    <label>{{ t('İnceleme gerekçesi') }}<textarea v-model="reason" maxlength="1000" :disabled="busy || locked"/></label>
    <label><input v-model="attest" type="checkbox" :disabled="!viewed || busy || locked"/>{{ t('Fotoğrafı açıp kişisel bilgi ve yayın uygunluğunu kontrol ettim.') }}</label>
    <div class="row"><button class="button primary" :disabled="busy || locked || reason.trim().length<10 || (photo.status==='pending' && (!viewed || !attest))" @click="decide(photo.status==='approved'?'hide':'approve')">{{ t(photo.status==='approved' ? 'Yayından kaldır' : 'Fotoğrafı yayımla') }}</button><button v-if="photo.status==='pending'" class="button secondary" :disabled="busy || locked || reason.trim().length<10" @click="decide('reject')">{{ t('Gerekçeyle reddet') }}</button></div>
    <p v-if="error" role="alert">{{ t('İşlem sonucu belirsiz. Yeni işlemden önce galeriyi yenile; yükleme otomatik tekrarlanmaz.') }}</p>
  </article>
</template>
