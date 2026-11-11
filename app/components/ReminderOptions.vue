<script setup lang="ts">
import {Bell, MessageSquare} from '@lucide/vue';
import type {Reminder} from '@otosanayide/core';
import {useLocale} from '~/composables/useLocale';
import {vDefaultChecked} from '~/lib/directives';

defineProps<{reminder?: Reminder}>();
const {t: i18nT} = useLocale();
const advanceOptions = [{value: 0, label: 'Hedef gün'}, {value: 1, label: '1 gün önce'}, {value: 3, label: '3 gün önce'}, {value: 7, label: '7 gün önce'}];
</script>

<template>
  <fieldset class="ds-col ds-g16">
    <legend class="ds-label">{{ i18nT("Ne zaman haber verelim?") }}</legend>
    <div class="ds-col">
      <div class="ds-row ds-g8 ds-wrap">
        <label v-for="o in advanceOptions" :key="o.value" class="opt"><input type="radio" name="advanceDays" :value="o.value" v-default-checked="(reminder?.advanceDays??1)===o.value"/><span class="ds-chip line">{{ i18nT(o.label) }}</span></label>
      </div>
      <p class="ds-help">{{ i18nT("Tarihli hatırlatma: Türkiye saatiyle 09.00. Kilometre eşiği son kaydettiğin kilometreye göre değerlendirilir; otomatik araç takibi yapılmaz.") }}</p>
    </div>
    <div class="ds-col ds-g10">
      <span class="ds-label group">{{ i18nT("Kanallar") }}</span>
      <label class="channel locked"><Bell :size="18" class="ds-i"/><span class="ds-f1 ds-col"><strong class="ds-small">{{ i18nT("Uygulama içi") }}</strong><span class="ds-xs ds-muted">{{ i18nT("Her zaman açık") }}</span></span><input type="checkbox" checked readonly :aria-label="i18nT('Uygulama içindeki hatırlatma listesi')" @click.prevent/><span class="ds-switch" aria-hidden="true"></span></label>
      <label class="channel"><Bell :size="18" class="ds-i"/><span class="ds-f1 ds-col"><strong class="ds-small">{{ i18nT("Push bildirimi") }}</strong><span class="ds-xs ds-muted">{{ i18nT("Cihaz izni gerekir") }}</span></span><input name="push" type="checkbox" v-default-checked="reminder?.channels?.includes('push')"/><span class="ds-switch" aria-hidden="true"></span></label>
      <label class="channel"><MessageSquare :size="18" class="ds-i"/><span class="ds-f1 ds-col"><strong class="ds-small">{{ i18nT("E-posta") }}</strong><span class="ds-xs ds-muted">{{ i18nT("Hesabımın e-posta adresine gönder") }}</span></span><input name="email" type="checkbox" v-default-checked="reminder?.channels?.includes('email')"/><span class="ds-switch" aria-hidden="true"></span></label>
      <p class="ds-xs ds-muted">{{ i18nT("Push ve e-posta tercihin kaydedilir. Gönderim hizmeti henüz etkin değil; şu anda bildirim gönderilmez. E-posta yalnızca doğrulanmış hesap adresine gönderilecek.") }}</p>
    </div>
  </fieldset>
</template>

<style scoped>
fieldset {min-width: 0; margin: 0; padding: 0; border: 0;}
legend {padding: 0;}
p {margin: 0;}
.group {margin-bottom: 0;}
.opt {position: relative; display: inline-flex; cursor: pointer;}
.opt input, .channel input {position: absolute; inset: 0; width: 100%; height: 100%; min-height: 0; margin: 0; padding: 0; opacity: 0; cursor: pointer;}
.opt input:checked + .ds-chip {background: #10243a; border-color: #10243a; color: #fff;}
.opt input:focus-visible + .ds-chip, .channel input:focus-visible + .ds-switch {outline: 2px solid #2459b4; outline-offset: 2px;}
.channel {position: relative; display: flex; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid #dfe5eb; border-radius: 10px;}
.channel input:checked + .ds-switch {background: #21684e;}
.channel input:checked + .ds-switch::after {left: 21px;}
.channel.locked input {cursor: default;}
</style>
