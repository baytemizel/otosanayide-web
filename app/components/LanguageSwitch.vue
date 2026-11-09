<script setup lang="ts">
import {parseLocale} from '@otosanayide/core/i18n';
import {useLocale} from '~/composables/useLocale';

const {locale, setLocale} = useLocale();
</script>

<template>
  <label class="language-switch">
    <span class="sr-only">Language / Dil</span>
    <select aria-label="Language / Dil" :value="locale" @change="setLocale(parseLocale(($event.target as HTMLSelectElement).value))">
      <option value="tr">Türkçe</option>
      <option value="en">English</option>
    </select>
  </label>
</template>
