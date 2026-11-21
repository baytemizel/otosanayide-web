<script setup lang="ts">
import {computed, ref, type Component} from 'vue';
import {Eye, EyeOff} from '@lucide/vue';
import {useLocale} from '~/composables/useLocale';

// Labelled input with a leading Lucide icon (W10 "Alan · E-posta adresi" / "Alan · Şifre").
// type="password" adds the show/hide eye button.
const props = withDefaults(defineProps<{
  id: string;
  label: string;
  icon?: Component;
  type?: string;
  placeholder?: string;
  autocomplete?: string;
  inputmode?: 'text' | 'email' | 'tel' | 'numeric';
  error?: string;
  hint?: string;
}>(), {type: 'text'});
const model = defineModel<string>({default: ''});
const {t} = useLocale();
const reveal = ref(false);
const inputType = computed(() => (props.type === 'password' && reveal.value ? 'text' : props.type));
const describedBy = computed(() => [props.error && `${props.id}-err`, props.hint && `${props.id}-hint`].filter(Boolean).join(' ') || undefined);
</script>

<template>
  <div class="auth-field">
    <label class="field-label" :for="id">{{ label }}</label>
    <div class="control" :class="{invalid: !!error}">
      <component :is="icon" v-if="icon" :size="18" class="lead" aria-hidden="true"/>
      <input
        :id="id"
        v-model="model"
        :type="inputType"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="describedBy">
      <button v-if="type === 'password'" type="button" class="eye" :aria-label="reveal ? t('Şifreyi gizle') : t('Şifreyi göster')" :aria-pressed="reveal" @click="reveal = !reveal">
        <EyeOff v-if="reveal" :size="16" aria-hidden="true"/>
        <Eye v-else :size="16" aria-hidden="true"/>
      </button>
    </div>
    <p v-if="error" :id="`${id}-err`" class="err" role="alert">{{ error }}</p>
    <p v-else-if="hint" :id="`${id}-hint`" class="hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.auth-field{display:flex;flex-direction:column;gap:8px}
.control{display:flex;align-items:center;gap:10px;padding:14px 16px;background:var(--white);border:1px solid var(--cream-200);border-radius:16px;transition:border-color .15s ease}
.control:focus-within{border:1.5px solid var(--ink-900);padding:13.5px 15.5px}
.control.invalid{border:1.5px solid var(--red-500);padding:13.5px 15.5px}
.lead{flex:none;color:var(--ink-500)}
input{flex:1;min-width:0;border:0;padding:0;background:transparent;font-size:15px;line-height:1.5;color:var(--ink-900);outline:none}
input::placeholder{color:var(--ink-300)}
input[type=password]::placeholder{letter-spacing:.1em}
.eye{flex:none;display:grid;place-items:center;width:28px;height:28px;margin:-6px -6px -6px 0;border-radius:999px;color:var(--ink-500)}
.eye:hover{color:var(--ink-900);background:var(--cream-100)}
.err{font-size:13px;line-height:1.45;color:var(--red-500);font-weight:600}
</style>
