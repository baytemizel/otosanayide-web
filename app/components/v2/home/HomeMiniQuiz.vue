<script setup lang="ts">
import {computed, ref} from 'vue';
import {ArrowRight, Check, RotateCcw, X} from '@lucide/vue';
import {useLocale} from '~/composables/useLocale';
import {homeGuides, homeQuiz} from '~/data/mock/home';

// Figma 113:436 "Mini test · interaktif": five quick questions, then a related guide is suggested.
// Questions, options and guide texts are Turkish source text, translated at render.
const {t, localeTag} = useLocale();
const current = ref(0);
const answers = ref<number[]>([]);
const letters = ['A', 'B', 'C', 'D'];
const finished = ref(false);
const question = computed(() => homeQuiz[current.value]!);
const picked = computed(() => answers.value[current.value]);
const score = computed(() => answers.value.filter((a, i) => a === homeQuiz[i]!.correct).length);
const suggestion = computed(() => {
  const missed = homeQuiz.find((q, i) => answers.value[i] !== q.correct);
  return homeGuides.find((g) => g.id === (missed ?? homeQuiz[0]!).guide) ?? homeGuides[0]!;
});

function answer(i: number) {
  if (picked.value !== undefined) return;
  answers.value = [...answers.value, i];
}
function next() {
  if (current.value < homeQuiz.length - 1) current.value++;
  else finished.value = true;
}
function restart() {
  answers.value = [];
  current.value = 0;
  finished.value = false;
}
const state = (i: number) => {
  if (picked.value === undefined) return '';
  if (i === question.value.correct) return 'right';
  return i === picked.value ? 'wrong' : 'dim';
};
</script>

<template>
  <div class="home-quiz" role="region" :aria-label="t('Mini test')">
    <div class="top">
      <span class="tag-quiz t-mono-sm">{{ t('MİNİ TEST') }}</span>
      <span class="t-mono-sm step">{{ finished ? t('SONUÇ') : `${current + 1} / ${homeQuiz.length}` }}</span>
    </div>

    <template v-if="!finished">
      <p class="t-h4 question" aria-live="polite">{{ t(question.question) }}</p>
      <ul class="options">
        <li v-for="(opt, i) in question.options" :key="opt">
          <button type="button" class="option-btn" :class="state(i)" :disabled="picked !== undefined" @click="answer(i)">
            <span class="letter" aria-hidden="true">
              <Check v-if="state(i) === 'right'" :size="13" :stroke-width="2.5"/>
              <X v-else-if="state(i) === 'wrong'" :size="13" :stroke-width="2.5"/>
              <template v-else>{{ letters[i] }}</template>
            </span>
            <span class="t-label-sm">{{ t(opt) }}</span>
            <span v-if="state(i) === 'right'" class="sr-only">{{ t('(doğru cevap)') }}</span>
            <span v-else-if="state(i) === 'wrong'" class="sr-only">{{ t('(senin cevabın, yanlış)') }}</span>
          </button>
        </li>
      </ul>
    </template>

    <div v-else class="result" aria-live="polite">
      <p class="t-h4 question">{{ t('{score} / {total} doğru', {score, total: homeQuiz.length}) }}</p>
      <p class="t-body-sm muted">{{ t('Sana uygun rehber:') }}</p>
      <NuxtLink :to="suggestion.to" class="suggest">
        <span class="t-mono-sm topic">{{ t(suggestion.topic).toLocaleUpperCase(localeTag) }}</span>
        <span class="t-label-md">{{ t(suggestion.title) }}</span>
        <span class="go t-label-sm">{{ t('Rehberi oku') }}<ArrowRight :size="16" aria-hidden="true"/></span>
      </NuxtLink>
      <button type="button" class="again t-label-sm" @click="restart"><RotateCcw :size="14" aria-hidden="true"/>{{ t('Tekrar başla') }}</button>
    </div>

    <div class="foot">
      <span class="dots" aria-hidden="true">
        <span v-for="(q, i) in homeQuiz" :key="q.question" class="dot" :class="{on: !finished && i === current, done: i < answers.length && (finished || i !== current)}"/>
      </span>
      <button v-if="!finished && picked !== undefined" type="button" class="next t-label-sm" @click="next">{{ current < homeQuiz.length - 1 ? t('Sonraki') : t('Sonucu gör') }}<ArrowRight :size="14" aria-hidden="true"/></button>
      <span v-else-if="!finished" class="t-body-sm muted">{{ t('Sonunda sana uygun rehber') }}</span>
    </div>
  </div>
</template>

<style scoped>
.home-quiz{display:flex;flex-direction:column;gap:16px;padding:24px;border-radius:28px;background:var(--ink-900);color:var(--white)}
.top{display:flex;align-items:center;justify-content:space-between}
.tag-quiz{padding:6px 11px;border-radius:999px;background:var(--lime-400);color:var(--ink-900);font-weight:700}
.step{color:var(--ink-300)}
.question{color:var(--white)}
.options{display:flex;flex-direction:column;gap:16px}
.option-btn{width:100%;display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.08);color:var(--white);text-align:left;transition:background-color .15s ease,color .15s ease,opacity .15s ease}
.option-btn:hover:not(:disabled){background:rgba(255,255,255,.14)}
.option-btn:disabled{cursor:default}
.letter{flex:none;display:grid;place-items:center;width:24px;height:24px;border-radius:999px;background:rgba(255,255,255,.14);font-family:var(--font-mono);font-weight:700;font-size:11px;letter-spacing:.06em}
.option-btn.right{background:var(--lime-400);color:var(--ink-900)}
.option-btn.right .letter{background:var(--ink-900);color:var(--lime-400)}
.option-btn.wrong{background:rgba(229,72,77,.22)}
.option-btn.wrong .letter{background:var(--red-500);color:var(--white)}
.option-btn.dim{opacity:.6}
.result{display:flex;flex-direction:column;align-items:flex-start;gap:10px}
.muted{color:var(--ink-300)}
.suggest{width:100%;display:flex;flex-direction:column;gap:6px;padding:14px;border-radius:16px;background:rgba(255,255,255,.08);color:var(--white)}
.suggest:hover{background:rgba(255,255,255,.14)}
.suggest .topic{color:var(--lime-400)}
.go{display:flex;align-items:center;gap:6px;color:var(--lime-400)}
.again{display:flex;align-items:center;gap:6px;color:var(--ink-300)}
.again:hover{color:var(--white)}
.foot{display:flex;align-items:center;gap:12px;padding-top:4px;margin-top:auto}
.dots{display:flex;gap:6px}
.dot{width:6px;height:6px;border-radius:999px;background:rgba(255,255,255,.24);transition:width .2s ease,background-color .2s ease}
.dot.on{width:22px;background:var(--lime-400)}
.dot.done{background:rgba(200,240,60,.6)}
.next{margin-left:auto;display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;background:var(--lime-400);color:var(--ink-900)}
</style>
