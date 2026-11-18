<script setup lang="ts">
import {ref} from 'vue';
import {usePreferences} from '~/composables/v2/useAccountData';
import {mockAccountPreferences, type AccountPreference} from '~/data/mock/requests';
import {demoMode} from '~/lib/env';

// Switch rows ("anahtar") for notification and contact preferences (W18; also the W17 "Tercihler" modal).
// Demo: mock state shared across pages for the session; nothing is saved anywhere.
// Live: GET/PATCH /api/me/preferences (web-09); a switch is disabled while its change is sent.
const demo = demoMode();
const prefs = useState<AccountPreference[]>('v2-req-prefs', () => mockAccountPreferences.map((item) => ({...item})));
const live = usePreferences();
// Re-rendering the switch after each answer puts it back when a change was refused.
const attempt = ref(0);
async function toggle(id: Parameters<typeof live.toggle>[0], on: boolean) {
  await live.toggle(id, on);
  attempt.value++;
}
</script>

<template>
  <ul v-if="demo" class="prefs">
    <li v-for="pref in prefs" :key="pref.id" class="pref">
      <label :for="`pref-${pref.id}`" class="copy">
        <span class="title">{{ pref.title }}</span>
        <span class="t-body-sm t-muted">{{ pref.text }}</span>
      </label>
      <input :id="`pref-${pref.id}`" v-model="pref.on" type="checkbox" role="switch" class="switch" :aria-checked="pref.on">
    </li>
  </ul>
  <div v-else :aria-busy="live.loading.value || live.busy.value">
    <p v-if="live.loading.value" class="t-body-sm t-muted" role="status">Tercihler yükleniyor…</p>
    <ul v-else-if="live.rows.value.length" class="prefs">
      <li v-for="pref in live.rows.value" :key="pref.id" class="pref">
        <label :for="`pref-${pref.id}`" class="copy">
          <span class="title">{{ pref.title }}</span>
          <span class="t-body-sm t-muted">{{ pref.text }}</span>
          <span v-if="pref.note" class="t-body-sm t-muted note">{{ pref.note }}</span>
        </label>
        <input
          :id="`pref-${pref.id}`"
          :key="`${pref.id}-${attempt}`"
          type="checkbox"
          role="switch"
          class="switch"
          :checked="pref.on"
          :aria-checked="pref.on"
          :disabled="pref.locked || live.busy.value"
          @change="toggle(pref.id, ($event.target as HTMLInputElement).checked)"
        >
      </li>
    </ul>
    <p v-if="live.saved.value" class="t-body-sm ok" role="status">{{ live.saved.value }}</p>
    <p v-if="live.error.value" class="t-body-sm err" role="alert">{{ live.error.value }}</p>
  </div>
</template>

<style scoped>
.prefs{display:flex;flex-direction:column}
.pref{display:flex;align-items:center;gap:16px;padding:16px 0}
.pref + .pref{border-top:1px solid var(--cream-200);margin-top:6px;padding-top:22px}
.copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;cursor:pointer}
.title{font-weight:600;font-size:16px;line-height:1.2;color:var(--ink-900)}
.note{font-size:12px}
.ok{color:var(--green-500);font-weight:600;margin-top:8px}
.err{color:var(--red-500);font-weight:600;margin-top:8px}
</style>
