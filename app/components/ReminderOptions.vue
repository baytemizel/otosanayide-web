<script setup lang="ts">
import type {Reminder} from '@otosanayide/core';
import {useLocale} from '~/composables/useLocale';
import {vDefaultChecked, vDefaultValue} from '~/lib/directives';

defineProps<{reminder?: Reminder}>();
const {t: i18nT} = useLocale();
</script>

<template>
  <fieldset class="stack">
    <legend>{{ i18nT("Nasıl hatırlatalım?") }}</legend>
    <label class="check"><input type="checkbox" checked readonly @click.prevent/>{{ i18nT("Uygulama içindeki hatırlatma listesi") }}</label>
    <label class="check"><input name="push" type="checkbox" v-default-checked="reminder?.channels?.includes('push')"/>{{ i18nT("Push bildirimi") }}</label>
    <label class="check"><input name="email" type="checkbox" v-default-checked="reminder?.channels?.includes('email')"/>{{ i18nT("Hesabımın e-posta adresine gönder") }}</label>
    <p class="small muted">{{ i18nT("Push ve e-posta tercihin kaydedilir. Gönderim hizmeti henüz etkin değil; şu anda bildirim gönderilmez. E-posta yalnızca doğrulanmış hesap adresine gönderilecek.") }}</p>
    <label>{{ i18nT("Ne zaman?") }}<select name="advanceDays" v-default-value="reminder?.advanceDays??1"><option value="0">{{ i18nT("Hedef gün") }}</option><option value="1">{{ i18nT("1 gün önce") }}</option><option value="3">{{ i18nT("3 gün önce") }}</option><option value="7">{{ i18nT("7 gün önce") }}</option></select></label>
    <p class="small muted">{{ i18nT("Tarihli hatırlatma: Türkiye saatiyle 09.00. Kilometre eşiği son kaydettiğin kilometreye göre değerlendirilir; otomatik araç takibi yapılmaz.") }}</p>
  </fieldset>
</template>
