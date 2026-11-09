<script setup lang="ts">
import {computed, ref} from 'vue';
import {cities, categories} from '@otosanayide/core';
import BrandBannerPreview from '~/components/BrandBannerPreview.vue';
import BrandImageEditor from '~/components/BrandImageEditor.vue';
import BrandMetricReport from '~/components/BrandMetricReport.vue';
import BrandPricing from '~/components/BrandPricing.vue';
import BrandReservations from '~/components/BrandReservations.vue';
import {useLocale} from '~/composables/useLocale';
import {brandAction, type BrandAction, type BrandCreative, type BrandView} from '@otosanayide/core/brand-campaigns';

const labels = {draft: 'Taslak', pending: 'İncelemede', approved: 'Kreatif Onaylandı · Yayında Değil', rejected: 'Reddedildi', paused: 'Durduruldu'};
const props = withDefaults(defineProps<{item: BrandView; demo?: boolean; mediaEnabled?: boolean; onSaved?: (item: BrandView) => void; onBusy?: (busy: boolean) => void; onAction: (a: BrandAction) => Promise<void>}>(), {demo: false, mediaEnabled: false});
const {t} = useLocale();
const v = ref<BrandCreative>(props.item.creative);
const note = ref('');
const rights = ref(false);
const busy = ref(false);
const error = ref('');
const message = ref('');
let lock = false;
const editable = computed(() => ['draft', 'rejected', 'paused'].includes(props.item.status));
const dirty = computed(() => JSON.stringify(v.value) !== JSON.stringify(props.item.creative));

function set(field: keyof BrandCreative, e: Event) {
  v.value = {...v.value, [field]: (e.target as HTMLInputElement).value} as BrandCreative;
}

function childBusy(value: boolean) {
  busy.value = value;
  props.onBusy?.(value);
}

async function send(action: BrandAction['action']) {
  if (lock) return;
  lock = true;
  busy.value = true;
  error.value = '';
  message.value = '';
  try {
    const common = {id: props.item.id, version: props.item.version};
    const a = brandAction.parse(action === 'save' ? {...common, action, value: v.value} : action === 'approve' || action === 'reject' ? {...common, action, note: note.value, rightsChecked: rights.value} : {...common, action});
    if (props.demo) {
      message.value = 'Örnek marka taslağı kontrol edildi. Kayıt veya yayın yapılmadı.';
      return;
    }
    await props.onAction(a);
  } catch (e) {
    error.value = e instanceof Error && !e.message.startsWith('[') ? e.message : 'Marka, metin, HTTPS bağlantısı, hedef ve tarihleri kontrol et.';
  } finally {
    lock = false;
    busy.value = false;
  }
}
</script>

<template>
  <article class="panel stack">
    <div class="row between">
      <h3>{{ v.brand||t('Yeni marka kampanyası') }}</h3>
      <span class="badge">{{ t(labels[item.status]) }}</span>
    </div>
    <p class="notice">{{ t('Kreatif onayı yayın veya ödeme onayı değildir. Marka reklamları henüz canlıya açılmadı.') }}</p>
    <fieldset :disabled="busy||!editable" class="form-grid" :style="{border:0,padding:0,minWidth:0}">
      <label>{{ t('Marka adı') }}<input :value="v.brand" maxlength="100" @input="set('brand',$event)"/></label>
      <label>{{ t('Reklam başlığı') }}<input :value="v.headline" maxlength="100" @input="set('headline',$event)"/></label>
      <label class="span-all">{{ t('Reklam açıklaması') }}<textarea :value="v.description" maxlength="400" @input="set('description',$event)"/></label>
      <label class="span-all">{{ t('Hedef HTTPS bağlantısı') }}<input type="url" :value="v.url" maxlength="500" @input="set('url',$event)"/></label>
      <label>{{ t('Yerleşim') }}<select :value="v.placement" @change="set('placement',$event)"><option value="home_banner">{{ t('Ana sayfa banner') }}</option><option value="category_banner">{{ t('Kategori banner') }}</option></select></label>
      <label>{{ t('İl') }}<select :value="v.city" @change="set('city',$event)"><option value="">{{ t('Kapsamdaki tüm iller') }}</option><option v-for="c in cities" :key="c">{{ c }}</option></select></label>
      <label>{{ t('Kategori') }}<select :value="v.category" @change="set('category',$event)"><option value="">{{ t('Tüm kategoriler') }}</option><option v-for="c in categories" :key="c.id" :value="c.id">{{ t(c.name) }}</option></select></label>
      <label>{{ t('Başlangıç tarihi') }}<input type="date" :value="v.startDate" @input="set('startDate',$event)"/></label>
      <label>{{ t('Bitiş tarihi') }}<input type="date" :value="v.endDate" @input="set('endDate',$event)"/></label>
    </fieldset>
    <BrandBannerPreview :value="v"/>
    <BrandPricing :key="JSON.stringify(demo?v:[v.placement,v.city,v.category])" :item="demo?{...item,creative:v}:item" :demo="demo" :dirty="!demo&&dirty" :disabled="busy" :onBusy="childBusy"/>
    <BrandReservations :key="v.placement" :item="demo?{...item,creative:v}:item" :demo="demo" :dirty="!demo&&dirty" :disabled="busy" :onBusy="childBusy"/>
    <BrandMetricReport :key="`metrics-${item.id}`" :campaignId="item.version?item.id:undefined" :demo="demo"/>
    <BrandImageEditor :item="item" :demo="demo" :enabled="mediaEnabled" :disabled="busy||(!demo&&dirty)" :onSaved="onSaved" :onBusy="childBusy"/>
    <button v-if="!demo&&editable&&item.image" class="button secondary" :disabled="busy||dirty" @click="void send('remove_image')">{{ t('Görseli kaldır') }}</button>
    <p v-if="item.note">{{ t('İnceleme notu') }}: {{ item.note }}</p>
    <template v-if="item.canReview">
      <label>{{ t('İnceleme gerekçesi') }}<textarea :disabled="busy" minlength="10" maxlength="1000" :value="note" @input="note=($event.target as HTMLTextAreaElement).value"/></label>
      <label class="row"><input v-model="rights" type="checkbox" :disabled="busy"/>{{ t('Marka kullanım iznini ve hedef bağlantıyı inceledim.') }}</label>
    </template>
    <div class="row" :style="{flexWrap:'wrap'}">
      <button v-if="editable" class="button primary" :disabled="busy" @click="void send('save')">{{ t(demo?'Örnek marka taslağını kontrol et':'Taslağı kaydet') }}</button>
      <button v-if="!demo&&item.version>0&&item.status==='draft'" class="button secondary" :disabled="busy||dirty" @click="void send('submit')">{{ t('İncelemeye gönder') }}</button>
      <template v-if="!demo&&item.canReview">
        <button class="button primary" :disabled="busy||!rights||note.trim().length<10" @click="void send('approve')">{{ t('Kreatifi onayla') }}</button>
        <button class="button secondary" :disabled="busy||note.trim().length<10" @click="void send('reject')">{{ t('Reddet') }}</button>
      </template>
      <button v-if="!demo&&['pending','approved'].includes(item.status)" class="button secondary" :disabled="busy" @click="void send('pause')">{{ t('Durdur') }}</button>
    </div>
    <p v-if="item.status==='pending'&&!item.canReview">{{ t('Son düzenleyen yönetici kendi kreatifini inceleyemez.') }}</p>
    <p v-if="error" role="alert" class="error">{{ t(error) }}</p>
    <p v-if="message" role="status">{{ t(message) }}</p>
  </article>
</template>
