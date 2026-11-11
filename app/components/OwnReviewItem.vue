<script setup lang="ts">
import {ref} from 'vue';
import {Store} from '@lucide/vue';
import OwnReviewStatus from '~/components/OwnReviewStatus.vue';
import {useLocale} from '~/composables/useLocale';
import {readBusiness} from '~/lib/server-read';

/**
 * One business the member may have reviewed. The existing per-business status, editor,
 * withdrawal, photos and appeal controls are reused; the card stays hidden while the
 * member has no review there.
 */
const props = withDefaults(defineProps<{businessId: string; businessName?: string; available?: boolean; onPresence?: (businessId: string, value: boolean | null) => void}>(), {available: true});
const {t: i18nT, locale} = useLocale();
const present = ref<boolean | null>(null);
const name = ref(props.businessName ?? '');

function presence(value: boolean | null) {
  present.value = value;
  props.onPresence?.(props.businessId, value);
  if (value && !name.value) {
    void readBusiness(props.businessId, locale.value).then(read => {
      if (read.status === 'found') name.value = read.business.name;
    });
  }
}
</script>

<template>
  <article v-show="present !== false" class="ds-card ds-pad24 ds-col ds-g12 own-review" :aria-busy="present === null">
    <h2 class="ds-row ds-g8"><Store class="ds-i" :size="18" aria-hidden="true"/><NuxtLink v-if="available" :to="`/servis/${encodeURIComponent(businessId)}`">{{ name || i18nT('İşletme profili') }}</NuxtLink><span v-else>{{ name }} <span class="ds-badge neu">{{ i18nT('Yayında değil') }}</span></span></h2>
    <OwnReviewStatus :businessId="businessId" :onPresence="presence"/>
  </article>
</template>

<style scoped>
.own-review h2 {margin: 0; font: 700 17px/24px Arimo, Arial, sans-serif;}
.own-review h2 a {color: #10243a;}
</style>
