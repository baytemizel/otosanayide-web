<script setup lang="ts">
import {mockAccountPreferences, type AccountPreference} from '~/data/mock/requests';

// Switch rows ("anahtar") for notification and contact preferences (W18; also the W17 "Tercihler" modal).
// Mock state shared across pages for the session; nothing is saved anywhere.
const prefs = useState<AccountPreference[]>('v2-req-prefs', () => mockAccountPreferences.map((item) => ({...item})));
</script>

<template>
  <ul class="prefs">
    <li v-for="pref in prefs" :key="pref.id" class="pref">
      <label :for="`pref-${pref.id}`" class="copy">
        <span class="title">{{ pref.title }}</span>
        <span class="t-body-sm t-muted">{{ pref.text }}</span>
      </label>
      <input :id="`pref-${pref.id}`" v-model="pref.on" type="checkbox" role="switch" class="switch" :aria-checked="pref.on">
    </li>
  </ul>
</template>

<style scoped>
.prefs{display:flex;flex-direction:column}
.pref{display:flex;align-items:center;gap:16px;padding:16px 0}
.pref + .pref{border-top:1px solid var(--cream-200);margin-top:6px;padding-top:22px}
.copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;cursor:pointer}
.title{font-weight:600;font-size:16px;line-height:1.2;color:var(--ink-900)}
</style>
