<script setup lang="ts">
import {computed, ref} from 'vue';

const props = defineProps<{id: string; label: string}>();
const digits = ref('');
const focused = ref(false);
const boxes = computed(() => Array.from({length: 6}, (_, index) => digits.value[index] ?? ''));
const current = computed(() => Math.min(digits.value.length, 5));

/** The input stays uncontrolled so FormData reads what the user typed. */
function sync(event: Event) {
  digits.value = (event.target as HTMLInputElement).value.replace(/\D/g, '').slice(0, 6);
}
</script>

<template>
  <div class="auth-code">
    <div class="auth-code-boxes" aria-hidden="true">
      <span v-for="(digit, index) in boxes" :key="index" :class="{on: focused && index === current}">{{ digit }}</span>
    </div>
    <input :id="props.id" name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" :aria-label="props.label" required @input="sync" @focus="focused = true" @blur="focused = false"/>
  </div>
</template>

<style scoped>
.auth-code {position: relative; width: 100%;}
.auth-code-boxes {display: grid; grid-template-columns: repeat(6, minmax(0, 52px)); gap: 8px;}
.auth-code-boxes span {display: grid; place-items: center; height: 60px; border: 1px solid #c9d2dc; border-radius: 12px; background: #fff; color: #10243a; font-size: 26px; font-weight: 700;}
.auth-code-boxes span.on {border-color: #2459b4; box-shadow: 0 0 0 1px #2459b4;}
.auth-code input {position: absolute; inset: 0; width: 100%; height: 100%; min-height: 0; padding: 0; border: 0; background: transparent; color: transparent; caret-color: transparent; opacity: .01; font-size: 26px;}
.auth-code input:focus-visible {outline: 0;}
</style>
