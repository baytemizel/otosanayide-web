<script setup lang="ts">
import {computed, ref, watch} from 'vue';
import {Check, Info} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import V2Modal from '~/components/v2/V2Modal.vue';
import {reportReasons} from '~/data/mock/profile';

// S08 "Yanlış bilgi bildir" modal (Figma 128:932).
// Demo: the mock reasons and a local confirmation. Live (`submit` set): the web-04 reasons, members only
// (`signInHref` for a guest), POST /api/businesses/{id}/reports; "Diğer" needs a 10+ character note.
const props = withDefaults(defineProps<{
  open: boolean;
  businessName: string;
  reasons?: {value: string; label: string}[];
  submit?: (reason: string, note: string) => Promise<void>;
  signInHref?: string | null;
}>(), {reasons: () => reportReasons.map((label) => ({value: label, label})), submit: undefined, signInHref: null});
const emit = defineEmits<{close: []}>();

const reason = ref('');
const note = ref('');
const sent = ref(false);
const busy = ref(false);
const error = ref('');
const reasonLabel = computed(() => props.reasons.find((r) => r.value === reason.value)?.label ?? reason.value);
const live = computed(() => !!props.submit);
const needsNote = computed(() => live.value && reason.value === 'other');
const ready = computed(() => !!reason.value && (!needsNote.value || note.value.trim().length >= 10));
const guest = computed(() => !!props.submit && !!props.signInHref);

watch(() => props.open, (open) => {
  if (open && sent.value) { reason.value = ''; note.value = ''; sent.value = false; }
  if (open) error.value = '';
});

async function send() {
  if (!ready.value || busy.value) return;
  if (!props.submit) {
    sent.value = true;
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    await props.submit(reason.value, note.value.trim());
    sent.value = true;
  } catch (e) {
    error.value = e instanceof Error && e.message ? e.message : 'Bildirim gönderilemedi. Daha sonra tekrar dene.';
  } finally {
    busy.value = false;
  }
}
function close() {
  if (!busy.value) emit('close');
}
</script>

<template>
  <V2Modal :open="open" title="Yanlış bilgi bildir" :subtitle="businessName" :width="640" @close="close">
    <div v-if="sent" class="sent" role="status">
      <span class="sent-icon"><Check :size="28" aria-hidden="true"/></span>
      <p class="t-h4">Bildirimin alındı</p>
      <p class="t-body-sm t-muted">“{{ reasonLabel }}” bildirimin incelenecek. Bildirim profili doğrudan değiştirmez; profil değişirse eski ve yeni değer zamanıyla birlikte kaydedilir.</p>
    </div>
    <div v-else-if="guest" class="sent">
      <p class="t-h4">Bildirim için giriş yap</p>
      <p class="t-body-sm t-muted">Yanlış bilgi bildirimi e-postası doğrulanmış üyelerden alınır.</p>
    </div>
    <form v-else id="bildir-form" class="form" @submit.prevent="send">
      <fieldset class="options" :disabled="busy">
        <legend class="sr-only">Sorun ne?</legend>
        <label v-for="option in reasons" :key="option.value" class="option">
          <input v-model="reason" type="radio" name="bildir-neden" class="radio" :value="option.value">
          {{ option.label }}
        </label>
      </fieldset>
      <label class="field">
        <span class="field-label">{{ needsNote ? 'Açıklama (en az 10 karakter)' : 'Doğrusu ne? (isteğe bağlı)' }}</span>
        <textarea v-model="note" class="textarea" :maxlength="live ? 1000 : 500" :disabled="busy" :required="needsNote" placeholder="İşletme aynı sitede C bloğa taşınmış."/>
      </label>
      <p class="hint"><Info aria-hidden="true"/>{{ live ? 'Kişisel bilgi, bağlantı veya telefon numarası yazma. Bildirimin incelenir; profil değişikliği eski ve yeni değerle birlikte kaydedilir.' : 'Bildirimin incelenir; profil değişikliği eski ve yeni değerle birlikte kaydedilir.' }}</p>
      <p v-if="error" class="t-body-sm error" role="alert">{{ error }}</p>
    </form>
    <template #footer>
      <V2Button v-if="sent" @click="emit('close')">Kapat</V2Button>
      <template v-else-if="guest">
        <V2Button variant="outline" @click="emit('close')">Vazgeç</V2Button>
        <V2Button :to="signInHref ?? undefined" arrow>Giriş yap</V2Button>
      </template>
      <template v-else>
        <V2Button variant="outline" :disabled="busy" @click="close">Vazgeç</V2Button>
        <V2Button type="submit" form="bildir-form" arrow :disabled="!ready || busy">{{ busy ? 'Gönderiliyor…' : 'Bildir' }}</V2Button>
      </template>
    </template>
  </V2Modal>
</template>

<style scoped>
.form{display:flex;flex-direction:column;gap:20px}
.options{border:0;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.textarea{height:96px}
.error{color:var(--red-500)}
.sent{display:flex;flex-direction:column;align-items:center;gap:10px;padding:16px 8px 4px;text-align:center}
.sent-icon{display:grid;place-items:center;width:64px;height:64px;border-radius:999px;background:var(--lime-400);color:var(--ink-900);margin-bottom:4px}
</style>
