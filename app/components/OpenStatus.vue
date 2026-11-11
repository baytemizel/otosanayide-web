<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref} from 'vue';
import {useLocale} from '~/composables/useLocale';
import {openState, type OpeningHours} from '~/lib/opening-hours';

/**
 * Open/closed only from structured hours (web-07). The clock is read after mount so the
 * server and client render the same markup; free-text hours are shown as written.
 */
const props = defineProps<{openingHours?: OpeningHours; hours?: string}>();
const {t: i18nT} = useLocale();
const now = ref<Date | null>(null);
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  now.value = new Date();
  if (props.openingHours) timer = setInterval(() => (now.value = new Date()), 60_000);
});
onBeforeUnmount(() => clearInterval(timer));
const state = computed(() => (props.openingHours && now.value ? openState(props.openingHours, now.value) : null));
</script>

<template>
  <span v-if="state?.open" class="ds-badge ok">● {{ i18nT('Şu an açık · Kapanış {0}', {'0': state.until}) }}</span>
  <span v-else-if="state" class="ds-badge neu">● {{ state.opensAt ? i18nT('Şu an kapalı · Açılış {0}', {'0': state.opensAt}) : i18nT('Şu an kapalı') }}</span>
  <span v-else-if="!openingHours" class="ds-badge neu">● {{ hours || i18nT('Saat bilgisi yok') }}</span>
</template>
