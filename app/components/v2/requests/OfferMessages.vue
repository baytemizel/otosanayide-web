<script setup lang="ts">
import {nextTick, ref} from 'vue';
import {ArrowRight} from '@lucide/vue';
import type {ThreadMessage} from '~/lib/v2/requests';

// "Mesajlar" card (W15). Demo: the page appends the message locally. Live: `send` posts it and
// resolves when the server has it; on failure the draft stays and the error is shown.
const props = withDefaults(defineProps<{
  messages: ThreadMessage[];
  send?: (text: string) => void | Promise<void>;
  closed?: boolean;
  loading?: boolean;
  error?: string;
  hasMore?: boolean;
  hint?: string;
}>(), {send: undefined, closed: false, loading: false, error: '', hasMore: false, hint: ''});
const emit = defineEmits<{send: [text: string]; more: []}>();
const draft = ref('');
const busy = ref(false);
const sendError = ref('');
const list = ref<HTMLElement | null>(null);

async function send() {
  const text = draft.value.trim();
  if (!text || busy.value) return;
  sendError.value = '';
  if (props.send) {
    busy.value = true;
    try {
      await props.send(text);
    } catch (e) {
      sendError.value = e instanceof Error ? e.message : 'Mesaj gönderilemedi.';
      return;
    } finally {
      busy.value = false;
    }
  } else emit('send', text);
  draft.value = '';
  await nextTick();
  list.value?.scrollTo({top: list.value.scrollHeight});
}
</script>

<template>
  <section class="msgs" aria-labelledby="msgs-title">
    <h2 id="msgs-title" class="t-h4">Mesajlar</h2>
    <ol ref="list" class="list" aria-live="polite" :aria-busy="loading">
      <li v-for="(message, index) in props.messages" :key="index" class="msg" :class="message.from">
        <p class="bubble t-body-sm">{{ message.text }}</p>
        <p class="meta">{{ message.from === 'member' ? 'Sen' : 'İşletme' }} · {{ message.time }}</p>
      </li>
      <li v-if="loading" class="empty t-body-sm t-muted" role="status">Mesajlar yükleniyor…</li>
      <li v-else-if="!props.messages.length && !error" class="empty t-body-sm t-muted">{{ closed ? 'Bu talepte mesaj yok.' : 'Henüz mesaj yok. İşletmeye soru sorabilirsin.' }}</li>
    </ol>
    <button v-if="hasMore" type="button" class="more t-body-sm" :disabled="loading" @click="emit('more')">Daha fazla mesaj</button>
    <p v-if="error" class="err t-body-sm" role="alert">{{ error }}</p>
    <p v-if="closed" class="t-body-sm t-muted">Kapanmış talepte mesaj gönderilemez.</p>
    <form v-else class="compose" @submit.prevent="send">
      <label for="msg-input" class="sr-only">Mesaj</label>
      <input id="msg-input" v-model="draft" class="compose-input" placeholder="Mesaj yaz…" autocomplete="off" :maxlength="props.send ? 1000 : 500" :disabled="busy">
      <button type="submit" class="send" aria-label="Mesajı gönder" :disabled="!draft.trim() || busy"><ArrowRight :size="16" aria-hidden="true"/></button>
    </form>
    <p v-if="sendError" class="err t-body-sm" role="alert">{{ sendError }}</p>
    <p v-if="hint" class="t-body-sm t-muted hint">{{ hint }}</p>
  </section>
</template>

<style scoped>
.msgs{width:340px;flex:none;display:flex;flex-direction:column;gap:12px;padding:20px;background:var(--white);border:1px solid var(--cream-200);border-radius:28px}
.list{display:flex;flex-direction:column;gap:12px;max-height:420px;overflow-y:auto}
.msg{display:flex;flex-direction:column;align-items:flex-start;gap:4px}
.msg.member{align-items:flex-end}
.bubble{max-width:248px;padding:10px 14px;border-radius:18px;background:var(--cream-100);color:var(--ink-900);overflow-wrap:anywhere}
.member .bubble{background:var(--ink-900);color:var(--white)}
.meta{font-family:var(--font-mono);font-weight:500;font-size:10px;line-height:1.3;letter-spacing:.06em;color:var(--ink-500)}
.compose{display:flex;align-items:center;gap:10px;padding:6px 6px 6px 16px;border:1px solid var(--cream-200);border-radius:999px}
.compose:focus-within{border-color:var(--ink-900)}
.compose-input{flex:1;min-width:0;border:0;background:none;padding:6px 0;font-size:14px;line-height:1.45;color:var(--ink-900)}
.compose-input::placeholder{color:var(--ink-500)}
.compose-input:focus{outline:none}
.send{width:36px;height:36px;flex:none;border-radius:999px;background:var(--orange-500);color:var(--ink-900);display:grid;place-items:center}
.send:disabled{cursor:default}
.more{align-self:flex-start;font-weight:600;color:var(--orange-600)}
.err{color:var(--red-500);font-weight:600}
.hint{font-size:12px}
@media (max-width:1100px){.msgs{width:100%}}
</style>
