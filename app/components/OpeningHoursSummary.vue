<script setup lang="ts">
import {computed} from 'vue';
import {useLocale} from '~/composables/useLocale';
import {openingHoursSchema, weekdayName, weekRows} from '~/lib/opening-hours';

/** Compact weekly hours; anything that does not parse is shown as "unknown", never as open. */
const props = defineProps<{value: unknown}>();
const {t: i18nT, localeTag} = useLocale();
const parsed = computed(() => {
  const r = openingHoursSchema.safeParse(props.value);
  return r.success ? weekRows(r.data) : null;
});
</script>

<template>
  <span v-if="!parsed" class="ds-muted">{{ i18nT('Saat bilgisi yok') }}</span>
  <span v-else class="hours">
    <span v-for="row in parsed" :key="row.day">{{ weekdayName(row.day, localeTag) }}: {{ row.intervals.length ? row.intervals.map(i => `${i.open}–${i.close}`).join(', ') : i18nT('Kapalı') }}</span>
  </span>
</template>

<style scoped>
.hours {display: flex; flex-direction: column; gap: 2px; text-transform: capitalize;}
</style>
