<script setup lang="ts">
import {computed} from 'vue';
import {useLocale} from '~/composables/useLocale';
import {portalUrl, type PortalTarget} from '~/lib/portal';

/** A link into the business portal; passive (K183 rule) while no portal origin is configured. */
const props = defineProps<{target: PortalTarget; business?: string}>();
const {t: i18nT} = useLocale();
const href = computed(() => portalUrl(props.target, {business: props.business}));
</script>

<template>
  <a v-if="href" :href="href" rel="noopener"><slot/></a>
  <span v-else class="ds-passive" aria-disabled="true" :title="i18nT('Yakında')"><slot/></span>
</template>
