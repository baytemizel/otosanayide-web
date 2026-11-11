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
  <form class="ds-surface cf" @submit="submit">
    <h3>{{ i18nT(kind==='report'?'Yorumu bildir':'Karara itiraz et') }}</h3>
    <p class="ds-small">{{ i18nT('Başvurun özeldir. Kişisel bilgi ekleme. Bildirim otomatik kaldırma, itiraz doğrudan yayın anlamına gelmez.') }}</p>
    <label class="ds-label cf-field">{{ i18nT('Başvuru açıklaması') }}<textarea v-model="text" class="ds-field" required minlength="10" maxlength="2000" :disabled="busy"></textarea></label>
    <p class="ds-xs ds-muted">{{ i18nT('Yorum, fotoğraf veya işletme yanıtıyla ilgili sorunu açıkça belirt.') }}</p>
    <p v-if="error" role="alert" class="ds-note err">{{ i18nT(error) }}</p>
    <div class="ds-row ds-g8 ds-wrap"><button class="ds-btn p sm" :disabled="busy">{{ i18nT('Başvuruyu gönder') }}</button><button type="button" class="ds-btn s sm" :disabled="busy" @click="onCancel()">{{ i18nT('Vazgeç') }}</button></div>
  </form>
</template>

<style scoped>
.cf {flex-basis: 100%; display: flex; flex-direction: column; gap: 10px; padding: 16px; border-radius: 12px;}
.cf h3, .cf p {margin: 0;}
.cf h3 {font-size: 16px;}
.cf-field {display: flex; flex-direction: column; gap: 6px; margin: 0;}
</style>
