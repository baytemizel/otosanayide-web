<script setup lang="ts">
import {computed, ref} from 'vue';
import {turkeyAppointmentTime} from '@otosanayide/core/request-operations';
import {useLocale} from '~/composables/useLocale';
import type {RequestItem} from '~/lib/request-board-helpers';

const props = withDefaults(defineProps<{item: RequestItem; business?: boolean; onAction: (value: Record<string, unknown>) => Promise<void>}>(), {business: false});

const {t: i18nT, localeTag} = useLocale();
const text = ref('');
const price = ref('');
const start = ref('');
const busy = ref(false);
const error = ref('');
const confirm = ref('');
const active = computed(() => ['requested', 'offered', 'confirmed'].includes(props.item.status));
const statusLabels: Record<string, string> = {requested: 'İşletme yanıtı bekleniyor', offered: 'Kullanıcı onayı bekleniyor', confirmed: 'Kesinleşti', declined: 'İşletme reddetti', cancelled: 'İptal edildi', completed: 'Tamamlandı'};

async function run(action: string) {
  const r = props.item;
  busy.value = true;
  error.value = '';
  try {
    await props.onAction({id: r.id, version: r.version, action, ...(action === 'offer' ? {text: text.value, ...(r.kind === 'quotes' ? {price: Number(price.value)} : {startsAt: turkeyAppointmentTime(start.value)})} : ['cancel', 'decline'].includes(action) ? {text: text.value} : {})});
    confirm.value = '';
  } catch (e) {
    error.value = e instanceof Error ? (e.message.startsWith('[') ? 'Bilgileri kontrol edin.' : e.message) : 'İşlem tamamlanamadı.';
  } finally {
    busy.value = false;
  }
}
function submitOffer(e: Event) {
  e.preventDefault();
  void run('offer');
}
</script>

<template>
  <article class="panel stack">
    <div class="row between">
      <h3>{{ item.service }}</h3>
      <span>{{ i18nT(item.kind==='quotes'?'Teklif talebi':'Randevu talebi') }}</span>
    </div>
    <NuxtLink :to="`/servis/${encodeURIComponent(item.businessId)}`">{{ item.businessName }}</NuxtLink>
    <p>{{ item.vehicle }}</p>
    <p class="review-text">{{ item.message }}</p>
    <p v-if="item.preferredDate">{{ i18nT('Tercih ettiğin tarih') }}: {{ item.preferredDate }}</p>
    <strong role="status">{{ i18nT(statusLabels[item.status]??'Belirtilmedi') }}</strong>
    <section v-if="item.offer" class="notice">
      <p class="review-text">{{ item.offer.text }}</p>
      <strong v-if="item.offer.price!==undefined">{{ item.offer.price.toLocaleString(localeTag,{style:'currency',currency:'TRY'}) }}</strong>
      <p v-if="item.offer.startsAt">{{ new Date(item.offer.startsAt).toLocaleString(localeTag,{timeZone:'Europe/Istanbul'}) }} · {{ i18nT('Türkiye saati') }}</p>
      <p v-if="item.status==='offered'">{{ i18nT('Yanıtın son kabul zamanı') }}: {{ new Date(item.offer.expiresAtMs).toLocaleString(localeTag,{timeZone:'Europe/Istanbul'}) }}</p>
    </section>
    <p v-if="item.resolution" class="review-text">{{ item.resolution }}</p>
    <template v-if="active">
      <form v-if="business&&['requested','offered'].includes(item.status)" class="stack" @submit="submitOffer">
        <label>{{ i18nT('İşletme açıklaması') }}<textarea v-model="text" required minlength="10" maxlength="2000" :disabled="busy"/></label>
        <label v-if="item.kind==='quotes'">{{ i18nT('Teklif tutarı (TL)') }}<input type="number" min="0.01" max="10000000" step="0.01" :value="price" required :disabled="busy" @input="price=($event.target as HTMLInputElement).value"/></label>
        <label v-else>{{ i18nT('Önerilen kabul saati (Türkiye)') }}<input v-model="start" type="datetime-local" step="3600" required :disabled="busy"/></label>
        <p class="small muted">{{ item.kind==='appointments'?i18nT('Saat önerisi yer ayırmaz. Kullanıcı kabulünde saat başına bir randevu ayrılır; işlem süresi garanti edilmez.'):i18nT('Teklifin kapsadığı parça ve işçiliği açıklamada belirt.') }}</p>
        <button class="button primary" :disabled="busy">{{ i18nT('Öneriyi gönder') }}</button>
      </form>
      <div class="row">
        <button v-if="!business&&item.status==='offered'" class="button primary" :disabled="busy||item.offer!.expiresAtMs<=Date.now()" @click="confirm='accept'">{{ i18nT('Öneriyi kabul et') }}</button>
        <button v-if="business&&item.status==='confirmed'" class="button secondary" :disabled="busy" @click="confirm='complete'">{{ i18nT('Tamamlandı olarak işaretle') }}</button>
        <button v-if="business&&['requested','offered'].includes(item.status)" class="button secondary" :disabled="busy" @click="confirm='decline'">{{ i18nT('Talebi reddet') }}</button>
        <button class="text-button" :disabled="busy" @click="confirm='cancel'">{{ i18nT('Talebi iptal et') }}</button>
      </div>
    </template>
    <section v-if="confirm" class="notice stack">
      <p>{{ i18nT(confirm==='accept'?'Kabul edince talep kesinleşir. Bu ekranda ödeme alınmaz.':confirm==='complete'?'Hizmetin tamamlandığını onaylıyor musun?':'İptal veya ret gerekçesi gerekli.') }}</p>
      <label v-if="['cancel','decline'].includes(confirm)">{{ i18nT('Gerekçe') }}<textarea v-model="text" minlength="10" maxlength="1000" :disabled="busy"/></label>
      <div class="row">
        <button class="button primary" :disabled="busy||(['cancel','decline'].includes(confirm)&&text.trim().length<10)" @click="run(confirm)">{{ i18nT('İşlemi onayla') }}</button>
        <button class="button secondary" :disabled="busy" @click="confirm=''">{{ i18nT('Vazgeç') }}</button>
      </div>
    </section>
    <p v-if="error" role="alert" class="error">{{ i18nT(error) }}</p>
  </article>
</template>
