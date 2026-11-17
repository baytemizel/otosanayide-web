<script setup lang="ts">
import {ref, watch} from 'vue';
import {Check, Info} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import V2Modal from '~/components/v2/V2Modal.vue';
import {reportReasons} from '~/data/mock/profile';

// S08 "Yanlış bilgi bildir" modal (Figma 128:932). Submitting only shows a confirmation (mock).
const props = defineProps<{open: boolean; businessName: string}>();
const emit = defineEmits<{close: []}>();

const reason = ref('');
const note = ref('');
const sent = ref(false);

watch(() => props.open, (open) => {
  if (open && sent.value) { reason.value = ''; note.value = ''; sent.value = false; }
});

function submit() {
  if (reason.value) sent.value = true;
}
</script>

<template>
  <V2Modal :open="open" title="Yanlış bilgi bildir" :subtitle="businessName" :width="640" @close="emit('close')">
    <div v-if="sent" class="sent" role="status">
      <span class="sent-icon"><Check :size="28" aria-hidden="true"/></span>
      <p class="t-h4">Bildirimin alındı</p>
      <p class="t-body-sm t-muted">“{{ reason }}” bildirimin incelenecek. Profil değişirse eski ve yeni değer zamanıyla birlikte kaydedilir.</p>
    </div>
    <form v-else id="bildir-form" class="form" @submit.prevent="submit">
      <fieldset class="options">
        <legend class="sr-only">Sorun ne?</legend>
        <label v-for="option in reportReasons" :key="option" class="option">
          <input v-model="reason" type="radio" name="bildir-neden" class="radio" :value="option">
          {{ option }}
        </label>
      </fieldset>
      <label class="field">
        <span class="field-label">Doğrusu ne? (isteğe bağlı)</span>
        <textarea v-model="note" class="textarea" maxlength="500" placeholder="İşletme aynı sitede C bloğa taşınmış."/>
      </label>
      <p class="hint"><Info aria-hidden="true"/>Bildirimin incelenir; profil değişikliği eski ve yeni değerle birlikte kaydedilir.</p>
    </form>
    <template #footer>
      <V2Button v-if="sent" @click="emit('close')">Kapat</V2Button>
      <template v-else>
        <V2Button variant="outline" @click="emit('close')">Vazgeç</V2Button>
        <V2Button type="submit" form="bildir-form" arrow :disabled="!reason">Bildir</V2Button>
      </template>
    </template>
  </V2Modal>
</template>

<style scoped>
.form{display:flex;flex-direction:column;gap:20px}
.options{border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.textarea{height:96px}
.sent{display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px 8px 4px;text-align:center}
.sent-icon{display:grid;place-items:center;width:64px;height:64px;border-radius:999px;background:var(--lime-400);color:var(--ink-900);margin-bottom:4px}
</style>
