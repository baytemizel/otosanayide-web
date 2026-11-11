<script setup lang="ts">
import {ref} from 'vue';
import {Flag} from '@lucide/vue';
import {useApp} from '~/composables/useApp';
import {useLocale} from '~/composables/useLocale';
import {apiFetch} from '~/lib/api';
import {responseJson} from '~/lib/response-json';
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
  const d = await responseJson(r);
  if (!r.ok) throw Error(d.error);
  open.value = false;
  sent.value = true;
}
</script>

<template>
  <template v-if="!app.demo">
    <NuxtLink v-if="!app.user&&kind==='report'" class="cb-link" to="/giris">{{ i18nT('Bildirmek için giriş yap') }}</NuxtLink>
    <template v-else-if="app.user">
      <p v-if="sent" role="status" class="ds-xs cb-full">{{ i18nT('Başvurun alındı. Sonucu Başvurularım bölümünden takip edebilirsin.') }}</p>
      <CaseForm v-else-if="open" :kind="kind" :onCancel="close" :onSubmit="submit"/>
      <button v-else type="button" class="cb-link" :aria-label="i18nT(kind==='report'?'Yorumu bildir':'Karara itiraz et')" @click="open=true"><Flag :size="12"/>{{ i18nT(kind==='report'?'Bildir':'Karara itiraz et') }}</button>
      <NuxtLink class="cb-link" to="/basvurularim">{{ i18nT('Başvurularım') }}</NuxtLink>
    </template>
  </template>
</template>

<style scoped>
.cb-link {display: inline-flex; align-items: center; gap: 4px; padding: 0; border: 0; background: none; color: #586879; font-size: 12px; line-height: 1.5; text-decoration: none; cursor: pointer;}
.cb-full {flex-basis: 100%; margin: 0;}
</style>
