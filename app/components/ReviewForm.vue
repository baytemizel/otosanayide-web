<script setup lang="ts">
import {ref} from 'vue';
import ReviewFormScore from '~/components/ReviewFormScore.vue';
import {useLocale} from '~/composables/useLocale';
import {vDefaultValue} from '~/lib/directives';

const props = withDefaults(defineProps<{initial?: Record<string, any>; onSubmit: (value: Record<string, unknown>) => Promise<void>; onCancel: () => void; demo?: boolean}>(), {initial: () => ({}), demo: false});

const {t: i18nT} = useLocale();
const wc = ref(String(props.initial.wc ?? 'unknown'));
const busy = ref(false);
const error = ref('');

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
  <form class="panel stack" @submit="submit">
    <h3>{{ i18nT('Deneyimini paylaş') }}</h3>
    <p class="small muted">{{ i18nT('Yalnızca hizmet aldığın işletmeyi değerlendir. Puanlar reklam veya ücretli üyelikten etkilenmez. Ad, telefon, plaka veya ödeme bilgisi paylaşma.') }}</p>
    <fieldset :disabled="busy" class="review-fields">
      <div class="form-grid">
        <ReviewFormScore :initial="initial.rating" name="rating" :label="i18nT('Genel deneyim')" required/>
        <ReviewFormScore :initial="initial.quality" name="quality" :label="i18nT('Hizmet kalitesi')"/>
        <ReviewFormScore :initial="initial.payment" name="payment" :label="i18nT('Ödeme kolaylığı')"/>
        <ReviewFormScore :initial="initial.cleanliness" name="cleanliness" :label="i18nT('İşletme temizliği')"/>
        <label>{{ i18nT('Sorun çözüldü mü?') }}<select v-default-value="initial.resolved??'unknown'" name="resolved">
          <option value="unknown">{{ i18nT('Henüz belli değil') }}</option>
          <option value="yes">{{ i18nT('Evet') }}</option>
          <option value="partial">{{ i18nT('Kısmen') }}</option>
          <option value="no">{{ i18nT('Hayır') }}</option>
        </select></label>
        <label>{{ i18nT('WC var mı?') }}<select v-model="wc" name="wc">
          <option value="unknown">{{ i18nT('Bilmiyorum') }}</option>
          <option value="yes">{{ i18nT('Evet') }}</option>
          <option value="no">{{ i18nT('Hayır') }}</option>
        </select></label>
        <ReviewFormScore v-if="wc==='yes'" :initial="initial.wcCleanliness" name="wcCleanliness" :label="i18nT('WC temizliği')"/>
      </div>
      <label>{{ i18nT('Deneyimin') }}<textarea v-default-value="initial.text??''" name="text" required minlength="10" maxlength="3000" :placeholder="i18nT('Aldığın hizmeti ve sonucunu anlat.')"/></label>
    </fieldset>
    <p class="small muted">{{ i18nT('Yorumlar yayımlanmadan önce incelenir. İşletme başına bir değerlendirme alınır.') }}</p>
    <p v-if="error" class="error" role="alert">{{ error.startsWith('[')?i18nT('Puanını ve açıklamanı kontrol et.'):i18nT(error) }}</p>
    <div class="row">
      <button :disabled="busy" class="button primary">{{ busy?i18nT('Gönderiliyor…'):demo?i18nT('Örnek yorumu kontrol et'):i18nT('İncelemeye gönder') }}</button>
      <button type="button" :disabled="busy" class="button secondary" @click="onCancel">{{ i18nT('Vazgeç') }}</button>
    </div>
  </form>
</template>
