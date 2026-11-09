<script setup lang="ts">
import {useLocale} from '~/composables/useLocale';
import {vDefaultValue} from '~/lib/directives';

withDefaults(defineProps<{name: string; label: string; required?: boolean; initial?: number}>(), {required: false});

const {t: i18nT} = useLocale();
</script>

<template>
  <label>{{ i18nT(label) }}<select v-default-value="initial??''" :name="name" :required="required">
    <option value="">{{ required?i18nT('Puan seç'):i18nT('Değerlendirmedim') }}</option>
    <option v-for="n in [5,4,3,2,1]" :key="n" :value="n">{{ n }} / 5</option>
  </select></label>
</template>
