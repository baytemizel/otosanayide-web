<script setup lang="ts" generic="T extends string | number">
import {computed, nextTick, onBeforeUnmount, ref, useId, watch} from 'vue';
import {Check, ChevronDown} from '@lucide/vue';

// Custom dropdown that replaces the browser's native <select> list everywhere in Web v2.
// It follows the WAI-ARIA "select-only combobox" pattern: focus stays on the trigger button and the
// highlighted option is announced through aria-activedescendant. The list is teleported to <body> with
// fixed positioning, so it is never clipped by modals or rounded cards, and it opens downwards at the
// width of its anchor (the trigger, or the closest ancestor matching `anchor`, e.g. a search field).
type OptionObject = {value: T; label?: string; hint?: string; disabled?: boolean; group?: string};
type Option = T | OptionObject;

const props = withDefaults(defineProps<{
  modelValue?: T | null;
  options: readonly Option[];
  placeholder?: string;
  /** field: bordered form control (.select look); bare: inline text + chevron that inherits type. */
  variant?: 'field' | 'bare';
  /** CSS selector of the ancestor the list aligns to and takes its width from. Defaults to the trigger. */
  anchor?: string;
  /** Let the whole positioned parent (a pill or card) act as the click target. */
  stretch?: boolean;
  /** true: list is exactly the anchor's width; false: at least the anchor's width. */
  matchWidth?: boolean;
  id?: string;
  ariaLabel?: string;
  disabled?: boolean;
  invalid?: boolean;
}>(), {modelValue: null, placeholder: 'Seç', variant: 'field', anchor: undefined, stretch: false, matchWidth: true, id: undefined, ariaLabel: undefined, disabled: false, invalid: false});

defineOptions({inheritAttrs: false});
const emit = defineEmits<{'update:modelValue': [value: T]; change: [value: T]}>();

type Item = {value: T; label: string; hint?: string; disabled: boolean; group?: string; key: string};

const uid = useId();
const listId = `${uid}-list`;
const items = computed<Item[]>(() => props.options.map((option, index) => {
  const o: OptionObject = typeof option === 'object' ? option : {value: option};
  return {value: o.value, label: o.label ?? String(o.value), hint: o.hint, disabled: !!o.disabled, group: o.group, key: `${uid}-o${index}`};
}));
const selectedIndex = computed(() => items.value.findIndex((item) => item.value === props.modelValue));
const selected = computed(() => items.value[selectedIndex.value]);

const open = ref(false);
const active = ref(-1);
const trigger = ref<HTMLButtonElement | null>(null);
const panel = ref<HTMLElement | null>(null);
const pop = ref<HTMLElement | null>(null);
const place = ref<{top?: number; bottom?: number; left: number; width: number; maxHeight: number; caret: number}>({left: 0, width: 0, maxHeight: 320, caret: 24});

const enabled = (index: number) => index >= 0 && index < items.value.length && !items.value[index].disabled;
function step(from: number, dir: 1 | -1) {
  for (let i = from + dir; i >= 0 && i < items.value.length; i += dir) if (enabled(i)) return i;
  return from;
}
const first = () => step(-1, 1);
const last = () => step(items.value.length, -1);

function anchorEl() {
  const el = trigger.value;
  return (props.anchor && el?.closest<HTMLElement>(props.anchor)) || el;
}
function position() {
  const el = anchorEl();
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const gap = 12; // room for the caret
  const margin = 12;
  const viewport = window.innerHeight;
  const below = viewport - rect.bottom - gap - margin;
  const above = rect.top - gap - margin;
  const wanted = Math.min(320, panel.value?.scrollHeight ?? 320);
  // Open downwards (the design); only flip up when the list cannot fit below and there is more room above.
  const up = below < Math.min(wanted, 200) && above > below;
  const width = Math.min(rect.width, window.innerWidth - margin * 2);
  const left = Math.max(margin, Math.min(rect.left, window.innerWidth - margin - Math.max(width, 200)));
  // The caret points at the trigger's chevron, kept clear of the rounded corners.
  const chev = trigger.value?.querySelector('.v2-select-chev')?.getBoundingClientRect();
  const target = chev ? chev.left + chev.width / 2 : rect.left + rect.width / 2;
  const caret = Math.max(24, Math.min(target - left, Math.max(width, 200) - 24));
  place.value = up
    ? {bottom: viewport - rect.top + gap, left, width, maxHeight: Math.max(120, Math.min(320, above)), caret}
    : {top: rect.bottom + gap, left, width, maxHeight: Math.max(120, Math.min(320, below)), caret};
}
const popStyle = computed(() => ({
  top: place.value.top === undefined ? undefined : `${place.value.top}px`,
  bottom: place.value.bottom === undefined ? undefined : `${place.value.bottom}px`,
  left: `${place.value.left}px`,
  [props.matchWidth ? 'width' : 'minWidth']: `${place.value.width}px`,
  '--caret-x': `${place.value.caret}px`,
}));

function scrollActive() {
  const item = items.value[active.value];
  if (!item || !panel.value) return;
  // Scroll only the list: scrollIntoView would also scroll the page when the list is near the edge.
  const list = panel.value;
  const row = list.querySelector<HTMLElement>(`#${CSS.escape(item.key)}`);
  if (!row) return;
  const pad = 6;
  if (row.offsetTop - pad < list.scrollTop) list.scrollTop = row.offsetTop - pad;
  else if (row.offsetTop + row.offsetHeight + pad > list.scrollTop + list.clientHeight) list.scrollTop = row.offsetTop + row.offsetHeight + pad - list.clientHeight;
}
async function show(at?: number) {
  if (props.disabled || open.value) return;
  active.value = at ?? (enabled(selectedIndex.value) ? selectedIndex.value : first());
  position();
  open.value = true;
  await nextTick();
  position();
  scrollActive();
}
function hide(refocus = false) {
  if (!open.value) return;
  open.value = false;
  if (refocus) trigger.value?.focus();
}
function choose(index: number) {
  if (!open.value || !enabled(index)) return;
  const value = items.value[index].value;
  hide(true);
  if (value !== props.modelValue) {
    emit('update:modelValue', value);
    emit('change', value);
  }
}
function toggle() {
  if (open.value) hide();
  else void show();
}
function move(to: number) {
  active.value = to;
  void nextTick(scrollActive);
}

// Type-to-select, as in a native select: letters typed within half a second build one search string.
let typed = '';
let typedAt = 0;
const fold = (s: string) => s.toLocaleLowerCase('tr-TR');
function typeahead(char: string) {
  const now = Date.now();
  typed = now - typedAt > 500 ? char : typed + char;
  typedAt = now;
  const term = fold(typed);
  const start = typed.length === 1 ? active.value + 1 : Math.max(active.value, 0);
  const order = [...items.value.keys()].map((i) => (start + i) % items.value.length);
  const hit = order.find((i) => enabled(i) && fold(items.value[i].label).startsWith(term));
  if (hit === undefined) return;
  if (open.value) move(hit);
  else choose(hit);
}

function onKeydown(event: KeyboardEvent) {
  if (props.disabled) return;
  const {key} = event;
  if (!open.value) {
    if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(key)) {
      event.preventDefault();
      void show();
    } else if (key === 'Home' || key === 'End') {
      event.preventDefault();
      void show(key === 'Home' ? first() : last());
    } else if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      typeahead(key);
    }
    return;
  }
  switch (key) {
    case 'ArrowDown': event.preventDefault(); move(event.altKey ? active.value : step(active.value, 1)); break;
    case 'ArrowUp': event.preventDefault(); if (event.altKey) choose(active.value); else move(step(active.value, -1)); break;
    case 'Home': event.preventDefault(); move(first()); break;
    case 'End': event.preventDefault(); move(last()); break;
    case 'PageDown': event.preventDefault(); move([...Array(10)].reduce((i: number) => step(i, 1), active.value)); break;
    case 'PageUp': event.preventDefault(); move([...Array(10)].reduce((i: number) => step(i, -1), active.value)); break;
    case 'Enter': event.preventDefault(); choose(active.value); break;
    case ' ': event.preventDefault(); if (typed && Date.now() - typedAt < 500) typeahead(' '); else choose(active.value); break;
    case 'Escape': event.preventDefault(); event.stopPropagation(); hide(true); break;
    case 'Tab': hide(); break;
    default: if (key.length === 1 && !event.ctrlKey && !event.metaKey) typeahead(key);
  }
}

function onPointerDown(event: Event) {
  const target = event.target as Node;
  if (pop.value?.contains(target) || trigger.value?.contains(target)) return;
  hide();
}
function onScroll(event: Event) {
  if (pop.value?.contains(event.target as Node)) return;
  position();
}
function listen(on: boolean) {
  if (!import.meta.client) return;
  if (on) {
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', position);
  } else {
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('scroll', onScroll, true);
    window.removeEventListener('resize', position);
  }
}
watch(open, listen);
watch(() => props.disabled, (value) => { if (value) hide(); });
onBeforeUnmount(() => listen(false));

defineExpose({focus: () => trigger.value?.focus()});
</script>

<template>
  <button
    v-bind="$attrs" :id="id" ref="trigger" type="button" class="v2-select" :class="[`v2-select-${variant}`, {open, stretch, placeholder: !selected}]"
    role="combobox" aria-haspopup="listbox" :aria-expanded="open" :aria-controls="listId" :aria-label="ariaLabel"
    :aria-activedescendant="open && items[active] ? items[active].key : undefined" :aria-invalid="invalid ? 'true' : undefined"
    :disabled="disabled" @click="toggle" @keydown="onKeydown">
    <span class="v2-select-value">{{ selected ? selected.label : placeholder }}</span>
    <ChevronDown :size="16" class="v2-select-chev" aria-hidden="true"/>
  </button>
  <Teleport to="body">
    <Transition name="v2-select-pop">
      <div v-if="open" ref="pop" class="v2-select-pop" :class="{up: place.bottom !== undefined}" :style="popStyle">
        <span class="v2-select-caret" aria-hidden="true"/>
        <ul :id="listId" ref="panel" class="v2-select-list" role="listbox" :aria-label="ariaLabel" tabindex="-1" :style="{maxHeight: `${place.maxHeight}px`}">
        <template v-for="(item, index) in items" :key="item.key">
          <li v-if="item.group && item.group !== items[index - 1]?.group" class="v2-select-group t-mono-sm" role="presentation">{{ item.group }}</li>
          <li
            :id="item.key" class="v2-select-option" role="option" :class="{active: index === active, on: index === selectedIndex}"
            :aria-selected="index === selectedIndex" :aria-disabled="item.disabled || undefined"
            @pointerdown.prevent @pointermove="!item.disabled && (active = index)" @click="choose(index)">
            <span class="v2-select-label">{{ item.label }}<span v-if="item.hint" class="v2-select-hint">{{ item.hint }}</span></span>
            <Check v-if="index === selectedIndex" :size="16" class="v2-select-check" aria-hidden="true"/>
          </li>
        </template>
        </ul>
      </div>
    </Transition>
  </Teleport>
</template>

<style>
/* Unscoped: the list lives under <body>. Colours, radius and shadow follow the account menu (--shadow-pop). */
.v2-select{display:inline-flex;align-items:center;gap:8px;min-width:0;max-width:100%;text-align:left;cursor:pointer}
.v2-select:disabled{cursor:not-allowed;opacity:.55}
.v2-select-value{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.v2-select-chev{flex:none;color:var(--ink-900);transition:transform .15s ease}
.v2-select.open .v2-select-chev{transform:rotate(180deg)}

.v2-select-field{display:flex;width:100%;background:var(--white);border:1px solid var(--cream-200);border-radius:18px;padding:15px 16px;font-size:15px;line-height:1.5;color:var(--ink-900)}
.v2-select-field.placeholder .v2-select-value{color:var(--ink-300)}
.v2-select-field:focus-visible,.v2-select-field.open{outline:none;border-color:var(--ink-900);box-shadow:0 0 0 3px rgba(243,107,33,.18)}
.v2-select-field[aria-invalid=true]{border-color:var(--red-500)}

.v2-select-bare{gap:6px;color:inherit;font:inherit}
.v2-select-bare:focus-visible{outline:none}
.v2-select-bare.placeholder .v2-select-value{color:var(--ink-500)}
.v2-select.stretch::after{content:"";position:absolute;inset:0;border-radius:inherit}

.v2-select-pop{position:fixed;z-index:200;background:var(--white);border:1px solid var(--cream-200);border-radius:20px;box-shadow:var(--shadow-pop)}
/* Upward pointer ("iğne") joining the list to its field; it flips to the bottom when the list opens upwards. */
.v2-select-caret{position:absolute;top:-8px;left:var(--caret-x);width:14px;height:14px;margin-left:-7px;background:var(--white);border:1px solid var(--cream-200);border-right:0;border-bottom:0;border-top-left-radius:3px;transform:rotate(45deg)}
.v2-select-pop.up .v2-select-caret{top:auto;bottom:-8px;transform:rotate(225deg)}
.v2-select-list{position:relative;margin:0;padding:6px;list-style:none;overflow-y:auto;overscroll-behavior:contain;border-radius:inherit;scrollbar-width:thin;scrollbar-color:var(--cream-200) transparent}
.v2-select-list:focus{outline:none}
.v2-select-group{padding:12px 12px 6px;color:var(--ink-500)}
.v2-select-group:first-child{padding-top:8px}
.v2-select-option{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:11px 12px;border-radius:12px;font-weight:600;font-size:14px;line-height:1.3;color:var(--ink-800);cursor:pointer;scroll-margin:6px}
.v2-select-option.active{background:var(--cream-50)}
.v2-select-option.on{background:var(--cream-100);color:var(--ink-900)}
.v2-select-option[aria-disabled=true]{color:var(--ink-300);cursor:not-allowed;background:none}
.v2-select-label{min-width:0;overflow-wrap:anywhere}
.v2-select-hint{display:block;margin-top:2px;font-weight:400;font-size:12px;color:var(--ink-500)}
.v2-select-check{flex:none;color:var(--orange-600)}

.v2-select-pop-enter-active,.v2-select-pop-leave-active{transition:opacity .12s ease,transform .12s ease}
.v2-select-pop-leave-active{pointer-events:none}
.v2-select-pop-enter-from,.v2-select-pop-leave-to{opacity:0;transform:translateY(-4px)}
.v2-select-pop.up.v2-select-pop-enter-from,.v2-select-pop.up.v2-select-pop-leave-to{transform:translateY(4px)}
</style>
