<script setup lang="ts">
import {ref} from 'vue';
import {useLocale} from '~/composables/useLocale';

const props = defineProps<{kind: 'report' | 'appeal'; onSubmit: (text: string) => Promise<void>; onCancel: () => void}>();
const {t: i18nT} = useLocale();
const text = ref('');
const busy = ref(false);
const error = ref('');

async function submit(e: Event) {
  e.preventDefault();
  busy.value = true;
  error.value = '';
  try {
    await props.onSubmit(text.value.trim());
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'İşlem tamamlanamadı.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <form class="panel stack" @submit="submit">
    <h3>{{ i18nT(kind==='report'?'Yorumu bildir':'Karara itiraz et') }}</h3>
    <p>{{ i18nT('Başvurun özeldir. Kişisel bilgi ekleme. Bildirim otomatik kaldırma, itiraz doğrudan yayın anlamına gelmez.') }}</p>
    <label>{{ i18nT('Başvuru açıklaması') }}<textarea required minlength="10" maxlength="2000" :disabled="busy" v-model="text"></textarea></label>
    <p class="small muted">{{ i18nT('Yorum, fotoğraf veya işletme yanıtıyla ilgili sorunu açıkça belirt.') }}</p>
    <p v-if="error" role="alert" class="error">{{ i18nT(error) }}</p>
    <div class="row"><button class="button primary" :disabled="busy">{{ i18nT('Başvuruyu gönder') }}</button><button type="button" class="button secondary" :disabled="busy" @click="onCancel()">{{ i18nT('Vazgeç') }}</button></div>
  </form>
</template>
