<script setup lang="ts">
import {useLocale} from '~/composables/useLocale';

const {locale, setLocale} = useLocale();
</script>

<template>
  <div class="ds-chip line ds-lang" style="height:36px" role="group" aria-label="Language / Dil">
    <button type="button" :class="{on: locale === 'tr'}" :aria-pressed="locale === 'tr'" @click="setLocale('tr')">TR</button>
    <span class="ds-muted">/</span>
    <button type="button" :class="{on: locale === 'en'}" :aria-pressed="locale === 'en'" @click="setLocale('en')">EN</button>
  </div>
</template>
