<script setup lang="ts">
import {ref} from 'vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import CaseForm from '~/components/CaseForm.vue';

const props = defineProps<{reviewId: string; kind: 'report' | 'appeal'}>();
const app = useApp();
const {t: i18nT} = useLocale();
const open = ref(false);
const sent = ref(false);

function close() {
  open.value = false;
}

async function submit(text: string) {
  const user = app.user!;
  const r = await apiFetch('/api/review-cases', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${await user.getIdToken()}`}, body: JSON.stringify({reviewId: props.reviewId, kind: props.kind, text})});
  const d = await r.json();
  if (!r.ok) throw Error(d.error);
  open.value = false;
  sent.value = true;
}
</script>

<template>
  <template v-if="!app.demo">
    <NuxtLink v-if="!app.user&&kind==='report'" to="/giris">{{ i18nT('Bildirmek için giriş yap') }}</NuxtLink>
    <template v-else-if="app.user">
      <p v-if="sent" role="status">{{ i18nT('Başvurun alındı. Sonucu Başvurularım bölümünden takip edebilirsin.') }}</p>
      <CaseForm v-else-if="open" :kind="kind" :onCancel="close" :onSubmit="submit"/>
      <button v-else class="text-button" @click="open=true">{{ i18nT(kind==='report'?'Yorumu bildir':'Karara itiraz et') }}</button>
      <NuxtLink class="text-link" to="/basvurularim">{{ i18nT('Başvurularım') }}</NuxtLink>
    </template>
  </template>
</template>
