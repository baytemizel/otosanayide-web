<script setup lang="ts">
import {computed} from 'vue';
import {Mail} from '@lucide/vue';
import {businessContactEmail} from '@otosanayide/core/contact';
import {useLocale} from '~/composables/useLocale';

const props = withDefaults(defineProps<{address?: string; sample?: boolean}>(), {sample: false});
const {t} = useLocale();
const email = computed(() => businessContactEmail(props.address));
</script>

<template>
  <a v-if="!sample && email" class="button secondary full" :href="email.href" :aria-label="t('İşletmeye e-posta gönder')"><Mail :size="18"/><span :style="{overflowWrap:'anywhere'}">{{ email.address }}</span></a>
</template>
