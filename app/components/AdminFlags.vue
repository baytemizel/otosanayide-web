<script setup lang="ts">
import {ref} from 'vue';
import {useApp} from '~/composables/useApp';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {adminApi} from '~/lib/admin-api';

/** web-16 (4): read-only. Flags are deployment configuration; nothing here changes them. */
const app = useApp();
const {t: i18nT} = useLocale();
const data = ref<Awaited<ReturnType<typeof adminApi.flags>> | null>(null);
const error = ref('');
useClientEffect(() => [app.user, app.demo], () => {
  const user = app.user;
  if (!user || app.demo) return;
  let cancelled = false;
  adminApi.flags(() => user.getIdToken()).then(v => {
    if (!cancelled) data.value = v;
  }).catch(e => {
    if (!cancelled) error.value = e instanceof Error ? e.message : 'Bayraklar yüklenemedi.';
  });
  return () => {
    cancelled = true;
  };
});
</script>

<template>
  <div class="ds-note info">{{ i18nT('Bayraklar dağıtım yapılandırmasıdır; burada yalnız okunur. Değişiklik sunucu ortamında yapılır.') }}</div>
  <p v-if="app.demo" class="ds-small ds-muted">{{ i18nT('Önizlemede bayrak durumu gösterilmez.') }}</p>
  <p v-else-if="error" class="ds-note err" role="alert">{{ i18nT(error) }}</p>
  <section v-else-if="data" class="ds-card" style="overflow:hidden">
    <div class="ds-table-wrap">
      <table class="ds-table">
        <thead><tr><th>{{ i18nT('Bayrak') }}</th><th>{{ i18nT('Durum') }}</th><th>{{ i18nT('Kaynak') }}</th></tr></thead>
        <tbody>
          <tr v-for="f in [...data.flags, ...data.workers.map(w => ({...w, name: w.key}))]" :key="f.key">
            <td><div class="ds-b">{{ f.name }}</div><div class="ds-xs ds-muted">{{ f.key }}</div></td>
            <td><span class="ds-badge" :class="f.enabled ? 'ok' : 'neu'">{{ i18nT(f.enabled ? 'Açık' : 'Kapalı') }}</span></td>
            <td class="ds-xs ds-muted">{{ f.source }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="data.pushDriver" class="ds-xs ds-muted pad">{{ i18nT('Push sürücüsü: {0}', {'0': data.pushDriver}) }}</p>
  </section>
  <p v-else class="ds-small ds-muted" role="status">{{ i18nT('Yükleniyor…') }}</p>
</template>

<style scoped>
.pad {padding: 12px 16px; margin: 0;}
p {margin: 0;}
</style>
