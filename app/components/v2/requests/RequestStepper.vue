<script setup lang="ts">
import {Check} from '@lucide/vue';

// "Adımlar" (W14): done steps are dark with a lime tick, the current one is orange, later ones cream.
// Interaction note 07: steps get ticked as the wizard progresses. Done steps can be revisited.
const props = defineProps<{steps: string[]; current: number; done: number}>();
const emit = defineEmits<{go: [step: number]}>();

const state = (index: number) => (index + 1 <= props.done ? 'done' : index + 1 === props.current ? 'current' : 'todo');
</script>

<template>
  <ol class="stepper" aria-label="Adımlar">
    <template v-for="(label, index) in steps" :key="label">
      <li v-if="index > 0" class="bar" :class="{dark: index + 1 <= Math.max(current, done)}" aria-hidden="true"/>
      <li class="step" :class="state(index)">
        <button
          v-if="state(index) === 'done' && index + 1 !== current"
          type="button"
          class="step-btn"
          :aria-label="`${index + 1}. adım: ${label} (tamamlandı, düzenle)`"
          @click="emit('go', index + 1)"
        >
          <span class="dot"><Check :size="14" :stroke-width="3" aria-hidden="true"/></span>
          <span class="t-label-sm">{{ label }}</span>
        </button>
        <span v-else class="step-btn" :aria-current="index + 1 === current ? 'step' : undefined">
          <span class="dot">
            <Check v-if="state(index) === 'done'" :size="14" :stroke-width="3" aria-hidden="true"/>
            <template v-else>{{ index + 1 }}</template>
          </span>
          <span class="t-label-sm">{{ label }}<span v-if="state(index) === 'done'" class="sr-only"> (tamamlandı)</span></span>
        </span>
      </li>
    </template>
  </ol>
</template>

<style scoped>
.stepper{display:flex;align-items:center;gap:10px;width:620px;max-width:100%}
.step{flex:none}
.step-btn{display:flex;align-items:center;gap:8px;color:var(--ink-900)}
button.step-btn:hover .t-label-sm{text-decoration:underline}
.dot{width:30px;height:30px;flex:none;border-radius:999px;display:grid;place-items:center;font-family:var(--font-mono);font-weight:700;font-size:11px;letter-spacing:.06em;line-height:1.3}
.done .dot{background:var(--ink-900);color:var(--lime-400)}
.current .dot{background:var(--orange-500);color:var(--ink-900)}
.todo .dot{background:var(--cream-100);color:var(--ink-500)}
.todo .step-btn{color:var(--ink-500)}
.bar{flex:1 1 0;min-width:12px;height:2px;border-radius:2px;background:var(--cream-200)}
.bar.dark{background:var(--ink-900)}
@media (max-width:560px){
  .stepper{gap:6px}
  .step .t-label-sm{display:none}
  .step.current .t-label-sm{display:inline}
}
</style>
