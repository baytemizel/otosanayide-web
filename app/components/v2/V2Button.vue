<script setup lang="ts">
import {computed} from 'vue';
import {ArrowRight} from '@lucide/vue';

// V2/Button/{Primary,PrimaryLG,Dark,Lime,Outline,White,OutlineDark}. Renders a link when `to` or `href` is set.
const props = withDefaults(defineProps<{
  variant?: 'primary' | 'dark' | 'lime' | 'outline' | 'white' | 'outline-dark' | 'ghost';
  size?: 'md' | 'lg' | 'sm';
  to?: string;
  href?: string;
  type?: 'button' | 'submit';
  arrow?: boolean;
  disabled?: boolean;
}>(), {variant: 'primary', size: 'md', type: 'button', arrow: false, disabled: false});

const classes = computed(() => ['btn', `btn-${props.variant}`, props.size !== 'md' && `btn-${props.size}`]);
</script>

<template>
  <NuxtLink v-if="to && !disabled" :to="to" :class="classes"><slot/><ArrowRight v-if="arrow" aria-hidden="true"/></NuxtLink>
  <a v-else-if="href && !disabled" :href="href" :class="classes"><slot/><ArrowRight v-if="arrow" aria-hidden="true"/></a>
  <button v-else :type="type" :class="classes" :disabled="disabled"><slot/><ArrowRight v-if="arrow" aria-hidden="true"/></button>
</template>
