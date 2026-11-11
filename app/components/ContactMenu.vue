<script setup lang="ts">
import {computed, ref, useTemplateRef} from 'vue';
import {Copy, MessageCircle, Phone, X} from '@lucide/vue';
import {contactOptions} from '@otosanayide/core/contact';
import {useClientEffect} from '~/composables/useClientEffect';
import {useLocale} from '~/composables/useLocale';

const props = withDefaults(defineProps<{phone?: string; name: string; sample?: boolean}>(), {sample: false});
const {t: i18nT} = useLocale();
const options = computed(() => contactOptions(props.phone));
const dialog = useTemplateRef<HTMLDialogElement>('dialog');
const trigger = useTemplateRef<HTMLButtonElement>('trigger');
const open = ref(false);
const notice = ref('');

useClientEffect(() => [open.value], () => {
  if (!open.value) return;
  const previous = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  return () => {
    document.body.style.overflow = previous;
  };
});

function close() {
  dialog.value?.close();
}
function show() {
  notice.value = '';
  dialog.value?.showModal();
  open.value = true;
}
function onDialogClick(e: MouseEvent) {
  if (e.target === e.currentTarget) close();
}
function onDialogClose() {
  open.value = false;
  trigger.value?.focus();
}
async function copy() {
  try {
    await navigator.clipboard.writeText(options.value!.displayNumber);
    notice.value = 'Telefon numarası kopyalandı.';
  } catch {
    notice.value = 'Kopyalanamadı. Yukarıdaki numarayı seçip kopyalayabilirsin.';
  }
}
</script>

<template>
  <p v-if="sample || !options" class="ds-small ds-muted cm-none">{{ sample ? i18nT("Telefon bilgisi örnek profilde gösterilmez.") : i18nT("Geçerli telefon bilgisi henüz yok.") }}</p>
  <template v-else>
    <button ref="trigger" class="ds-btn p lg" aria-haspopup="dialog" @click="show"><Phone :size="18"/>{{ i18nT("Ara") }}</button>
    <dialog ref="dialog" class="contact-dialog" :aria-label="i18nT('{0} iletişim seçenekleri',{'0':name})" @click="onDialogClick" @close="onDialogClose">
      <div class="ds-row ds-sb ds-g12"><h2 class="cm-h">{{ i18nT("İletişime geç") }}</h2><button class="ds-iconbtn" :aria-label="i18nT('İletişim menüsünü kapat')" @click="close"><X :size="18"/></button></div>
      <p class="cm-p">{{ name }}<br/><strong>{{ phone }}</strong></p>
      <p v-if="options.e164===null" class="ds-small ds-muted cm-p">{{ i18nT("Türkiye içi çağrı merkezi numarası.") }}</p>
      <div class="ds-col ds-g8">
        <a class="ds-btn p cm-full" :href="options.call"><Phone :size="18"/>{{ i18nT("Ara") }}</a>
        <a v-for="m in options.messengers" :key="m.id" class="ds-btn s cm-full" :href="m.web" target="_blank" rel="noopener noreferrer"><MessageCircle :size="18"/>{{ i18nT(m.label) }}{{ i18nT(" ile aç") }}</a>
        <button class="ds-btn s cm-full" @click="copy"><Copy :size="18"/>{{ i18nT("Numarayı kopyala") }}</button>
      </div>
      <p v-if="options.mobile" class="ds-xs ds-muted cm-p">{{ i18nT("Web tarayıcısı yüklü uygulamaları doğrulayamaz. Bağlantı uygulamayı veya web sayfasını açar. İşletmenin bu numarayla hesabı olmayabilir; Telegram gizlilik ayarları erişimi kısıtlayabilir.") }}</p>
      <p v-if="notice" role="status" class="ds-small cm-p">{{ i18nT(notice) }}</p>
    </dialog>
  </template>
</template>

<style scoped>
.cm-none {margin: 0; max-width: 220px;}
.cm-h {margin: 0; font: 700 19px/1.3 Arimo, Arial, Helvetica, sans-serif; letter-spacing: 0;}
.cm-p {margin: 14px 0;}
.cm-full {width: 100%;}
</style>
