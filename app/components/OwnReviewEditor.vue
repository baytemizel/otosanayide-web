<script setup lang="ts">
import {ref} from 'vue';
import {useLocale} from '~/composables/useLocale';
import type {OwnReviewView} from '~/lib/own-review-status-helpers';
import OwnReviewCard from '~/components/OwnReviewCard.vue';
import ReviewForm from '~/components/ReviewForm.vue';

const props = defineProps<{review: OwnReviewView; onEdit: (fields: Record<string, unknown>, version: number) => Promise<void>; onWithdraw: (version: number) => Promise<void>}>();
const {t: i18nT} = useLocale();
const editing = ref(false);
const confirming = ref(false);
const busy = ref(false);
const error = ref('');

function startEdit() {
  error.value = '';
  editing.value = true;
}
function startWithdraw() {
  error.value = '';
  confirming.value = true;
}
function cancelEdit() {
  editing.value = false;
}
async function submitEdit(fields: Record<string, unknown>) {
  await props.onEdit(fields, props.review.version);
  editing.value = false;
}
async function confirmWithdraw() {
  busy.value = true;
  error.value = '';
  try {
    await props.onWithdraw(props.review.version);
    confirming.value = false;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'İşlem tamamlanamadı.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <OwnReviewCard :review="review"/>
  <template v-if="editing"><p class="notice">{{ i18nT('Kaydedince eski yorumun ve puanın yayından kalkar; yeni sürüm yeniden incelenir. Önceki fotoğraflar ve işletme yanıtı taşınmaz. Fotoğraflarını yeniden eklemen gerekir.') }}</p><ReviewForm :initial="{...review,rating:review.rating??undefined}" :onCancel="cancelEdit" :onSubmit="submitEdit"/></template>
  <div v-else class="row"><button v-if="review.canEdit" class="button secondary" :disabled="busy||confirming" @click="startEdit">{{ review.status==='withdrawn'?i18nT('Düzenle ve yeniden gönder'):i18nT('Yorumunu düzenle') }}</button><button v-if="review.canWithdraw" class="text-button" :disabled="busy||confirming" @click="startWithdraw">{{ i18nT('Yorumunu geri çek') }}</button></div>
  <section v-if="confirming" class="notice"><p>{{ i18nT('Yorumun, puanın, fotoğrafların ve işletme yanıtı kamu görünümünden kaldırılacak. Bu işlem geçmiş kaydını fiziksel olarak silmez.') }}</p><div class="row"><button class="button primary" :disabled="busy" @click="confirmWithdraw">{{ i18nT('Geri çekmeyi onayla') }}</button><button class="button secondary" :disabled="busy" @click="confirming=false">{{ i18nT('Vazgeç') }}</button></div></section>
  <p v-if="error" role="alert" class="error">{{ i18nT(error) }}</p>
</template>
