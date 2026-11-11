<script setup lang="ts">
import {ref, useId, useTemplateRef} from 'vue';
import {ArrowRight, ShieldCheck, Star, X} from '@lucide/vue';
import ReviewFormScore from '~/components/ReviewFormScore.vue';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';
import {vDefaultValue} from '~/lib/directives';

const props = withDefaults(defineProps<{initial?: Record<string, any>; onSubmit: (value: Record<string, unknown>) => Promise<void>; onCancel: () => void; demo?: boolean; businessName?: string}>(), {initial: () => ({}), demo: false});

const {t: i18nT} = useLocale();
const wc = ref(String(props.initial.wc ?? 'unknown'));
const busy = ref(false);
const error = ref('');
const resolved = ref(String(props.initial.resolved ?? 'unknown'));
const length = ref(String(props.initial.text ?? '').length);
const dialog = useTemplateRef<HTMLDialogElement>('dialog');
const titleId = useId();
let unmounting = false;
/** İletişim and Fiyat şeffaflığı have no review field; they stay passive and carry no name. */
const passiveDimensions = ['İletişim', 'Fiyat şeffaflığı'];
const resolvedOptions = [{value: 'yes', label: 'Evet'}, {value: 'partial', label: 'Kısmen'}, {value: 'no', label: 'Hayır'}, {value: 'unknown', label: 'Henüz belli değil'}];
const wcOptions = [{value: 'yes', label: 'Evet'}, {value: 'no', label: 'Hayır'}, {value: 'unknown', label: 'Bilmiyorum'}];

useClientEffect(() => [], () => {
  const previous = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  const el = dialog.value;
  el?.showModal();
  return () => {
    document.body.style.overflow = previous;
    unmounting = true;
    el?.close();
  };
});

function onDialogCancel(e: Event) {
  e.preventDefault();
  if (!busy.value) props.onCancel();
}
function onDialogClose() {
  if (unmounting) return;
  if (busy.value) dialog.value?.showModal();
  else props.onCancel();
}
function onTextInput(e: Event) {
  length.value = (e.target as HTMLTextAreaElement).value.length;
}

async function submit(e: Event) {
  e.preventDefault();
  const values = Object.fromEntries(new FormData(e.currentTarget as HTMLFormElement));
  error.value = '';
  busy.value = true;
  try {
    await props.onSubmit(Object.fromEntries(Object.entries(values).filter(([, v]) => v !== '')));
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Yorum gönderilemedi.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <dialog ref="dialog" class="rf-dialog" :aria-labelledby="titleId" @cancel="onDialogCancel" @close="onDialogClose">
    <div class="ds-modal-scrim">
      <form class="ds-modal rf" @submit="submit">
        <header class="rf-head">
          <div>
            <p v-if="businessName" class="ds-xs ds-muted">{{ businessName }}</p>
            <h3 :id="titleId">{{ i18nT('Deneyimini paylaş') }}</h3>
          </div>
          <button type="button" class="ds-iconbtn" :aria-label="i18nT('Vazgeç')" :disabled="busy" @click="onCancel"><X :size="18"/></button>
        </header>
        <div class="rf-body">
          <slot/>
          <ol class="ds-steps rf-steps">
            <li class="ds-step on"><span class="n">1</span>{{ i18nT('Puan') }}</li>
            <li class="ds-step-line" aria-hidden="true"/>
            <li class="ds-step on"><span class="n">2</span>{{ i18nT('Deneyim') }}</li>
            <li class="ds-step-line" aria-hidden="true"/>
            <li class="ds-step ds-passive" aria-disabled="true" :title="i18nT('Yakında')"><span class="n">3</span>{{ i18nT('Fotoğraf') }}</li>
            <li class="ds-step-line" aria-hidden="true"/>
            <li class="ds-step ds-passive" aria-disabled="true" :title="i18nT('Yakında')"><span class="n">4</span>{{ i18nT('Önizleme') }}</li>
          </ol>
          <p class="ds-small ds-muted">{{ i18nT('Yalnızca hizmet aldığın işletmeyi değerlendir. Puanlar reklam veya ücretli üyelikten etkilenmez. Ad, telefon, plaka veya ödeme bilgisi paylaşma.') }}</p>
          <fieldset :disabled="busy" class="rf-fields">
            <div class="rf-cols">
              <div class="rf-col">
                <ReviewFormScore :initial="initial.rating" name="rating" :label="i18nT('Genel deneyim')" required large/>
                <ReviewFormScore :initial="initial.quality" name="quality" :label="i18nT('Hizmet kalitesi')"/>
                <div v-for="label in passiveDimensions" :key="label" class="rf-passive ds-passive" aria-disabled="true" :title="i18nT('Yakında')"><span>{{ i18nT(label) }}</span><span class="ds-stars" aria-hidden="true"><Star v-for="n in 5" :key="n" :size="22"/></span></div>
                <ReviewFormScore :initial="initial.payment" name="payment" :label="i18nT('Ödeme kolaylığı')"/>
                <ReviewFormScore :initial="initial.cleanliness" name="cleanliness" :label="i18nT('Temizlik')"/>
                <ReviewFormScore v-if="wc==='yes'" :initial="initial.wcCleanliness" name="wcCleanliness" :label="i18nT('WC temizliği')"/>
                <p class="ds-xs ds-muted">{{ i18nT('Boyut puanları isteğe bağlıdır.') }}</p>
              </div>
              <div class="rf-col">
                <div role="radiogroup" :aria-labelledby="`${titleId}-resolved`">
                  <span :id="`${titleId}-resolved`" class="ds-label rf-group-label">{{ i18nT('Sorun çözüldü mü?') }}</span>
                  <div class="ds-row ds-g6 ds-wrap"><label v-for="o in resolvedOptions" :key="o.value" class="ds-chip line rf-chip" :class="{on:resolved===o.value}"><input v-model="resolved" type="radio" name="resolved" :value="o.value"/>{{ i18nT(o.label) }}</label></div>
                </div>
                <div role="radiogroup" :aria-labelledby="`${titleId}-wc`">
                  <span :id="`${titleId}-wc`" class="ds-label rf-group-label">{{ i18nT('WC var mıydı?') }}</span>
                  <div class="ds-row ds-g6 ds-wrap"><label v-for="o in wcOptions" :key="o.value" class="ds-chip line rf-chip" :class="{on:wc===o.value}"><input v-model="wc" type="radio" name="wc" :value="o.value"/>{{ i18nT(o.label) }}</label></div>
                </div>
                <div class="rf-pair">
                  <div class="rf-grow">
                    <span class="ds-label rf-group-label">{{ i18nT('Hizmet') }}</span>
                    <select class="ds-field ds-passive" disabled aria-disabled="true" :aria-label="i18nT('Hizmet')" :title="i18nT('Yakında')"><option>{{ i18nT('Seç') }}</option></select>
                  </div>
                  <div class="rf-grow">
                    <span class="ds-label rf-group-label">{{ i18nT('Ziyaret ayı') }}</span>
                    <select class="ds-field ds-passive" disabled aria-disabled="true" :aria-label="i18nT('Ziyaret ayı')" :title="i18nT('Yakında')"><option>{{ i18nT('Seç') }}</option></select>
                  </div>
                </div>
              </div>
            </div>
            <label class="rf-text">
              <span class="ds-label rf-group-label">{{ i18nT('Yorumun') }}</span>
              <textarea v-default-value="initial.text??''" class="ds-field" name="text" required minlength="10" maxlength="3000" :placeholder="i18nT('Aldığın hizmeti ve sonucunu anlat.')" @input="onTextInput"/>
              <span class="ds-row ds-sb ds-g12 ds-xs ds-muted rf-text-help"><span>{{ i18nT('Plaka, telefon veya fatura kimlik bilgisi yazmayın.') }}</span><span class="rf-count">{{ length }} / 3000</span></span>
            </label>
          </fieldset>
          <div class="ds-note warn"><ShieldCheck :size="16"/><span>{{ i18nT('Yorumunu gerçek bir ziyarete dayanarak yazdığını beyan ediyorsun. Şüpheli içerik incelemeye alınabilir; her olumsuz yorum otomatik gizlenmez.') }}</span></div>
          <p v-if="error" class="ds-note err" role="alert">{{ error.startsWith('[')?i18nT('Puanını ve açıklamanı kontrol et.'):i18nT(error) }}</p>
        </div>
        <footer class="rf-foot">
          <p class="ds-xs ds-muted">{{ i18nT('Yorumlar yayımlanmadan önce incelenir. İşletme başına bir değerlendirme alınır.') }}</p>
          <div class="ds-row ds-g10">
            <button type="button" :disabled="busy" class="ds-btn s" @click="onCancel">{{ i18nT('Vazgeç') }}</button>
            <button :disabled="busy" class="ds-btn p">{{ busy?i18nT('Gönderiliyor…'):demo?i18nT('Örnek yorumu kontrol et'):i18nT('İncelemeye gönder') }}<ArrowRight :size="16"/></button>
          </div>
        </footer>
      </form>
    </div>
  </dialog>
</template>

<style scoped>
.rf-dialog {width: 100vw; height: 100dvh; max-width: none; max-height: none; margin: 0; padding: 0; border: 0; background: transparent; overflow: hidden;}
.rf-dialog::backdrop {background: transparent;}
.ds-modal-scrim > .rf {max-width: 720px; display: flex; flex-direction: column; color: #10243a;}
.rf p, .rf h3 {margin: 0;}
.rf-head {display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 22px 28px; border-bottom: 1px solid #edf0f3;}
.rf-head h3 {font-size: 19px; line-height: 1.3;}
.rf-body {display: flex; flex-direction: column; gap: 20px; padding: 24px 28px;}
.rf-steps {list-style: none; margin: 0; padding: 0; flex-wrap: wrap;}
.rf-fields {display: flex; flex-direction: column; gap: 20px; min-width: 0; margin: 0; padding: 0; border: 0;}
.rf-cols {display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px;}
.rf-col {display: flex; flex-direction: column; gap: 10px; min-width: 0;}
.rf-col:last-child {gap: 12px;}
.rf-group-label {display: block;}
.rf-passive {display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 13px;}
.rf-chip {position: relative; cursor: pointer;}
.rf-chip.on {border-color: #10243a;}
.rf-chip input {position: absolute; inset: 0; width: 100%; min-height: 0; height: 100%; margin: 0; padding: 0; opacity: 0; cursor: pointer;}
.rf-chip:has(input:focus-visible) {outline: 2px solid #2459b4; outline-offset: 2px;}
.rf-fields:disabled .rf-chip {opacity: .6; cursor: wait;}
.rf-pair {display: flex; gap: 10px;}
.rf-grow {flex: 1; min-width: 0;}
.rf-text {display: block;}
.rf-text textarea {height: 120px;}
.rf-text-help {margin-top: 6px; align-items: flex-start;}
.rf-count {flex: none;}
.rf-foot {display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 28px; border-top: 1px solid #edf0f3;}
.rf-foot p {flex: 1 1 240px;}
@media (max-width: 760px) {
  .rf-head, .rf-body, .rf-foot {padding-left: 20px; padding-right: 20px;}
  .rf-cols {grid-template-columns: minmax(0, 1fr);}
  .rf-steps .ds-step-line {display: none;}
}
@media (max-width: 480px) {
  .rf-foot .ds-row {width: 100%;}
  .rf-foot .ds-btn {flex: 1;}
  .rf-pair {flex-direction: column;}
  .rf-foot .ds-btn.p {white-space: normal; height: auto; min-height: 44px;}
}
</style>
