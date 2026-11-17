<script setup lang="ts">
import {reactive, ref, watch} from 'vue';
import {ArrowRight} from '@lucide/vue';
import V2Modal from '~/components/v2/V2Modal.vue';
import type {MockBusiness} from '~/data/mock/businesses';

// "Yeni liste" (W13 header action). No Figma frame: V2Modal + shared form classes. In-memory only.
const props = defineProps<{open: boolean; businesses: MockBusiness[]}>();
const emit = defineEmits<{close: []; save: [data: {name: string; businessIds: string[]}]}>();
const form = reactive({name: '', ids: [] as string[]});
const error = ref('');

watch(() => props.open, (open) => {
  if (!open) return;
  form.name = '';
  form.ids = [];
  error.value = '';
}, {immediate: true});

function save() {
  error.value = form.name.trim() ? '' : 'Listeye bir ad ver.';
  if (!error.value) emit('save', {name: form.name.trim(), businessIds: [...form.ids]});
}
</script>

<template>
  <V2Modal :open="open" title="Yeni liste" subtitle="Kaydettiğin servisleri konuya göre grupla." :width="560" @close="emit('close')">
    <form id="saved-list-form" class="body" novalidate @submit.prevent="save">
      <div class="field">
        <label class="field-label" for="list-name">Liste adı</label>
        <input id="list-name" v-model="form.name" class="input" placeholder="Örn. Yaz bakımı" maxlength="40" :aria-invalid="error ? 'true' : undefined" :aria-describedby="error ? 'list-name-err' : undefined">
        <p v-if="error" id="list-name-err" class="err" role="alert">{{ error }}</p>
      </div>
      <fieldset v-if="businesses.length" class="pick">
        <legend class="field-label">Listeye ekle</legend>
        <label v-for="b in businesses" :key="b.id" class="option"><input v-model="form.ids" type="checkbox" class="checkbox" :value="b.id">{{ b.name }}</label>
      </fieldset>
    </form>
    <template #footer>
      <button type="button" class="btn btn-outline" @click="emit('close')">Vazgeç</button>
      <button type="submit" form="saved-list-form" class="btn btn-primary">Oluştur<ArrowRight aria-hidden="true"/></button>
    </template>
  </V2Modal>
</template>

<style scoped>
.body{display:flex;flex-direction:column;gap:20px;min-width:0}
.body :is(input,select){min-width:0}
.pick{border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;max-height:320px;overflow-y:auto}
.pick legend{padding:0;margin-bottom:8px}
.err{font-size:13px;font-weight:600;color:var(--red-500)}
</style>
