<script setup lang="ts">
import {ref} from 'vue';
import {Eye, EyeOff} from '@lucide/vue';
import {useLocale} from '~/composables/useLocale';

withDefaults(defineProps<{id: string; autocomplete: string; invalid?: boolean; name?: string; minlength?: number}>(), {invalid: false, name: 'password', minlength: 10});
const {t: i18nT} = useLocale();
const visible = ref(false);
</script>

<template>
  <div class="ds-field auth-password" :class="{err: invalid}">
    <input :id="id" :name="name" :type="visible ? 'text' : 'password'" :minlength="minlength" :autocomplete="autocomplete" :aria-invalid="invalid || undefined" required/>
    <button type="button" :aria-label="i18nT(visible ? 'Şifreyi gizle' : 'Şifreyi göster')" :aria-pressed="visible" @click="visible = !visible">
      <EyeOff v-if="visible" :size="18"/>
      <Eye v-else :size="18"/>
    </button>
  </div>
</template>

<style scoped>
.auth-password:focus-within {border-color: #2459b4; box-shadow: 0 0 0 1px #2459b4;}
.auth-password.err:focus-within {border-color: #b42318; box-shadow: 0 0 0 1px #b42318;}
.auth-password input {flex: 1; min-width: 0; width: auto; min-height: 0; padding: 0; border: 0; border-radius: 0; background: none; font-size: 15px;}
.auth-password input:focus-visible {outline: 0;}
.auth-password button {display: grid; place-items: center; flex: none; width: 24px; height: 24px; padding: 0; border: 0; background: none; color: #10243a;}
.auth-password button:focus-visible {outline: 2px solid #2459b4; outline-offset: 2px; border-radius: 4px;}
</style>
