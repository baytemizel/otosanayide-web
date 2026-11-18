<script setup lang="ts">
import {reactive, ref, watch} from 'vue';
import {ArrowRight} from '@lucide/vue';
import V2Modal from '~/components/v2/V2Modal.vue';
import {listNameError} from '~/lib/v2/saved';

// "Yeni liste" (W13 header action) and "Listeyi yeniden adlandır". No Figma frame: V2Modal + shared
// form classes. The page saves (demo: in memory; live: /api/me/lists) and passes `busy` / `error` back.
const props = withDefaults(defineProps<{
  open: boolean;
  businesses: {id: string; name: string}[];
  /** Set for renaming: the current name; the service picker is hidden. */
  renaming?: string | null;
  maxLength?: number;
  busy?: boolean;
  error?: string;
}>(), {renaming: null, maxLength: 40, busy: false, error: ''});
const emit = defineEmits<{close: []; save: [data: {name: string; businessIds: string[]}]}>();
const form = reactive({name: '', ids: [] as string[]});
const nameError = ref('');

watch(() => props.open, (open) => {
  if (!open) return;
  form.name = props.renaming ?? '';
  form.ids = [];
  nameError.value = '';
}, {immediate: true});

function save() {
  if (props.busy) return;
  nameError.value = listNameError(form.name, props.maxLength);
  if (!nameError.value) emit('save', {name: form.name.trim(), businessIds: [...form.ids]});
}
</script>

<template>
  <V2Modal
    :open="open"
    :title="renaming !== null ? 'Listeyi yeniden adlandır' : 'Yeni liste'"
    :subtitle="renaming !== null ? undefined : 'Kaydettiğin servisleri konuya göre grupla.'"
    :width="560"
    @close="emit('close')">
    <form id="saved-list-form" class="body" novalidate @submit.prevent="save">
      <div class="field">
        <label class="field-label" for="list-name">Liste adı</label>
        <input id="list-name" v-model="form.name" class="input" placeholder="Örn. Yaz bakımı" :maxlength="maxLength" :aria-invalid="nameError ? 'true' : undefined" :aria-describedby="nameError ? 'list-name-err' : undefined">
        <p v-if="nameError" id="list-name-err" class="err" role="alert">{{ nameError }}</p>
      </div>
      <fieldset v-if="renaming === null && businesses.length" class="pick">
        <legend class="field-label">Listeye ekle</legend>
        <label v-for="b in businesses" :key="b.id" class="option"><input v-model="form.ids" type="checkbox" class="checkbox" :value="b.id">{{ b.name }}</label>
      </fieldset>
      <p v-if="error" class="err form-err" role="alert">{{ error }}</p>
    </form>
    <template #footer>
      <button type="button" class="btn btn-outline" @click="emit('close')">Vazgeç</button>
      <button type="submit" form="saved-list-form" class="btn btn-primary" :disabled="busy">{{ busy ? 'Kaydediliyor…' : renaming !== null ? 'Kaydet' : 'Oluştur' }}<ArrowRight aria-hidden="true"/></button>
    </template>
  </V2Modal>
</template>

<style scoped>
.body{display:flex;flex-direction:column;gap:20px;min-width:0}
.body :is(input,select){min-width:0}
.pick{border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;max-height:320px;overflow-y:auto}
.pick legend{padding:0;margin-bottom:8px}
.err{font-size:13px;font-weight:600;color:var(--red-500)}
.form-err{padding:10px 14px;border-radius:14px;background:var(--orange-100);color:var(--ink-800)}
</style>
