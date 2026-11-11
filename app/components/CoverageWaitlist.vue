<script setup lang="ts">
import {computed, ref} from 'vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {errorStatus} from '~/lib/api-read';
import {waitlistApi} from '~/lib/member-api';

/** S02 "Açılınca haber ver" (web-12): verified members only; nothing is sent until delivery exists. */
const props = defineProps<{city: string}>();
const app = useApp();
const {t: i18nT} = useLocale();
const joined = ref<string[]>([]);
const busy = ref(false);
const message = ref<{tone: 'ok' | 'err' | 'info'; text: string} | null>(null);
const isJoined = computed(() => joined.value.includes(props.city));

useClientEffect(() => [app.user, app.demo], () => {
  const user = app.user;
  joined.value = [];
  if (!user || app.demo || !user.emailVerified) return;
  let cancelled = false;
  waitlistApi.read(() => user.getIdToken()).then(items => {
    if (!cancelled) joined.value = items.map(i => i.city);
  }).catch(() => {});
  return () => {
    cancelled = true;
  };
});

async function toggle() {
  const user = app.user;
  if (!user || busy.value) return;
  busy.value = true;
  message.value = null;
  try {
    if (isJoined.value) {
      await waitlistApi.leave(() => user.getIdToken(), props.city);
      joined.value = joined.value.filter(c => c !== props.city);
      message.value = {tone: 'info', text: 'Bekleme listesinden çıktın.'};
    } else {
      await waitlistApi.join(() => user.getIdToken(), props.city);
      joined.value = [...joined.value, props.city];
      message.value = {tone: 'ok', text: 'Bekleme listesine eklendin. Bildirim gönderimi henüz etkin değil; açılış duyurusu hesabında görünecek.'};
    }
  } catch (e) {
    const status = errorStatus(e);
    message.value = {tone: 'err', text: status === 409 ? 'En fazla 5 il için bekleme listesine katılabilirsin.' : status === 403 ? 'Önce e-posta adresini doğrula.' : e instanceof Error ? e.message : 'İşlem tamamlanamadı. Tekrar dene.'};
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <button v-if="app.demo" class="ds-btn p ds-passive" type="button" disabled aria-disabled="true" :title="i18nT('Önizlemede kullanılamaz')">{{ i18nT('Açılınca haber ver') }}</button>
  <NuxtLink v-else-if="!app.member" class="ds-btn p" to="/giris">{{ i18nT('Açılınca haber ver') }}</NuxtLink>
  <NuxtLink v-else-if="!app.user?.emailVerified" class="ds-btn p" to="/hesabim#guvenlik">{{ i18nT('Haber almak için e-postanı doğrula') }}</NuxtLink>
  <button v-else class="ds-btn p" type="button" :disabled="busy" :aria-pressed="isJoined" @click="toggle">{{ isJoined ? i18nT('Bekleme listesinden çık') : i18nT('Açılınca haber ver') }}</button>
  <p v-if="message" class="ds-note waitlist-note" :class="message.tone" :role="message.tone === 'err' ? 'alert' : 'status'">{{ i18nT(message.text) }}</p>
</template>

<style scoped>
.waitlist-note {flex-basis: 100%; margin: 0;}
</style>
