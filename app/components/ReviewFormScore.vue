<script setup lang="ts">
import {ref, useId} from 'vue';
import {Star, X} from '@lucide/vue';
import {useLocale} from '~/composables/useLocale';

const props = withDefaults(defineProps<{name: string; label: string; required?: boolean; initial?: number; large?: boolean}>(), {required: false, large: false});

const {t: i18nT} = useLocale();
const labelId = useId();
const current = ref<number | null>(props.initial ?? null);
const hovered = ref<number | null>(null);
</script>

<template>
  <div class="score" :class="{lead:large}" role="radiogroup" :aria-labelledby="labelId" :aria-required="required||undefined" @mouseleave="hovered=null">
    <span :id="labelId" class="score-label">{{ i18nT(label) }}</span>
    <span class="score-stars">
      <label v-for="n in [1,2,3,4,5]" :key="n" class="score-star" @mouseenter="hovered=n">
        <input type="radio" :name="name" :value="n" :required="required" :checked="current===n" @change="current=n"/>
        <Star :size="large?30:22" :fill="n<=(hovered??current??0)?'currentColor':'none'" aria-hidden="true"/>
        <span class="sr-only">{{ n }} / 5</span>
      </label>
      <label v-if="!required" class="score-star score-clear" :title="i18nT('Değerlendirmedim')">
        <input type="radio" :name="name" value="" :checked="current===null" @change="current=null"/>
        <X :size="14" aria-hidden="true"/>
        <span class="sr-only">{{ i18nT('Değerlendirmedim') }}</span>
      </label>
    </span>
  </div>
</template>

<style scoped>
.score {display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13px;}
.score.lead {flex-direction: column; align-items: flex-start; gap: 6px;}
.score.lead .score-label {font-weight: 700;}
.score-stars {display: flex; align-items: center; gap: 2px; color: #f36b21;}
.score-star {position: relative; display: block; line-height: 0; cursor: pointer;}
.score-star input {position: absolute; inset: 0; width: 100%; height: 100%; min-height: 0; margin: 0; padding: 0; opacity: 0; cursor: pointer;}
.score-star:has(input:focus-visible) {outline: 2px solid #2459b4; outline-offset: 1px; border-radius: 4px;}
.score-clear {margin-left: 4px; color: #586879;}
</style>
