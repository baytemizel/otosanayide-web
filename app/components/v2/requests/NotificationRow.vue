<script setup lang="ts">
import {Bell, Calendar, File, MessageSquare, ShieldCheck} from '@lucide/vue';
import {useLocale} from '~/composables/useLocale';
import type {NotificationView} from '~/lib/v2/requests';

// One row of the W17 notification list. Unread rows are cream with an orange dot;
// opening the row or pressing the dot marks it read. Title and text are Turkish source text built by the web
// (lib/v2/requests, demo mock) and are translated here; API-written text has no key and stays as sent.
defineProps<{item: NotificationView}>();
const emit = defineEmits<{read: []}>();
const {t} = useLocale();
const icons = {file: File, calendar: Calendar, bell: Bell, message: MessageSquare, shield: ShieldCheck};
</script>

<template>
  <li class="row" :class="{unread: item.unread}">
    <span class="icon" :class="item.tone" aria-hidden="true"><component :is="icons[item.icon]" :size="20"/></span>
    <NuxtLink :to="item.to" class="copy" @click="emit('read')">
      <span class="title">{{ t(item.title) }}<span v-if="item.unread" class="sr-only"> {{ t('(okunmadı)') }}</span></span>
      <span class="t-body-sm t-muted text">{{ t(item.text) }}</span>
    </NuxtLink>
    <span class="t-mono-sm t-muted time">{{ item.time }}</span>
    <button v-if="item.unread" type="button" class="dot-btn" :aria-label="t('{title}: okundu olarak işaretle', {title: t(item.title)})" @click="emit('read')"><span class="dot"/></button>
    <span v-else class="dot-btn" aria-hidden="true"/>
  </li>
</template>

<style scoped>
.row{display:flex;align-items:center;gap:16px;padding:16px 18px;border-radius:20px;transition:background-color .15s ease}
.row:hover{background:var(--cream-50)}
.row.unread{background:var(--cream-50)}
.icon{width:48px;height:48px;flex:none;border-radius:999px;display:grid;place-items:center;color:var(--ink-900)}
.icon.orange{background:var(--orange-100)}
.icon.lime{background:var(--lime-100)}
.icon.sky{background:var(--sky-200)}
.icon.cream{background:var(--cream-100)}
.copy{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.copy:hover .title{text-decoration:underline}
.title{font-weight:600;font-size:16px;line-height:1.2;color:var(--ink-900)}
.text{overflow-wrap:anywhere}
.time{flex:none;white-space:nowrap;text-transform:none}
.dot-btn{width:10px;height:10px;flex:none;display:grid;place-items:center;position:relative}
button.dot-btn::before{content:"";position:absolute;inset:-12px}
.dot{width:10px;height:10px;border-radius:999px;background:var(--orange-500)}
@media (max-width:560px){
  .row{flex-wrap:wrap;gap:6px 12px;padding:14px}
  .copy{flex-basis:calc(100% - 60px)}
  .time{margin-left:60px}
}
</style>
