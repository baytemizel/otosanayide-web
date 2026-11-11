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
const tones = {draft: 'neu', pending: 'warn', approved: 'info', rejected: 'err', paused: 'neu'};
</script>

<template>
  <article class="ds-card ds-pad24 ds-col ds-g16">
    <div class="ds-row ds-sb ds-g12 ds-wrap">
      <h3>{{ v.brand||t('Yeni marka kampanyası') }}</h3>
      <span :class="['ds-badge',tones[item.status]]">{{ t(labels[item.status]) }}</span>
    </div>
    <p class="ds-note info ds-col">{{ t('Kreatif onayı yayın veya ödeme onayı değildir. Marka reklamları henüz canlıya açılmadı.') }}</p>
    <fieldset :disabled="busy||!editable" class="grid fs">
      <label class="fld"><span class="ds-label">{{ t('Marka adı') }}</span><input class="ds-field" :value="v.brand" maxlength="100" @input="set('brand',$event)"/></label>
      <label class="fld"><span class="ds-label">{{ t('Reklam başlığı') }}</span><input class="ds-field" :value="v.headline" maxlength="100" @input="set('headline',$event)"/></label>
      <label class="fld all"><span class="ds-label">{{ t('Reklam açıklaması') }}</span><textarea class="ds-field" :value="v.description" maxlength="400" @input="set('description',$event)"/></label>
      <label class="fld all"><span class="ds-label">{{ t('Hedef HTTPS bağlantısı') }}</span><input class="ds-field" type="url" :value="v.url" maxlength="500" @input="set('url',$event)"/></label>
      <label class="fld"><span class="ds-label">{{ t('Yerleşim') }}</span><select class="ds-field" :value="v.placement" @change="set('placement',$event)"><option value="home_banner">{{ t('Ana sayfa banner') }}</option><option value="category_banner">{{ t('Kategori banner') }}</option></select></label>
      <label class="fld"><span class="ds-label">{{ t('İl') }}</span><select class="ds-field" :value="v.city" @change="set('city',$event)"><option value="">{{ t('Kapsamdaki tüm iller') }}</option><option v-for="c in cities" :key="c">{{ c }}</option></select></label>
      <label class="fld"><span class="ds-label">{{ t('Kategori') }}</span><select class="ds-field" :value="v.category" @change="set('category',$event)"><option value="">{{ t('Tüm kategoriler') }}</option><option v-for="c in categories" :key="c.id" :value="c.id">{{ t(c.name) }}</option></select></label>
      <label class="fld"><span class="ds-label">{{ t('Başlangıç tarihi') }}</span><input class="ds-field" type="date" :value="v.startDate" @input="set('startDate',$event)"/></label>
      <label class="fld"><span class="ds-label">{{ t('Bitiş tarihi') }}</span><input class="ds-field" type="date" :value="v.endDate" @input="set('endDate',$event)"/></label>
    </fieldset>
    <BrandBannerPreview :value="v"/>
    <BrandPricing :key="JSON.stringify(demo?v:[v.placement,v.city,v.category])" :item="demo?{...item,creative:v}:item" :demo="demo" :dirty="!demo&&dirty" :disabled="busy" :onBusy="childBusy"/>
    <BrandReservations :key="v.placement" :item="demo?{...item,creative:v}:item" :demo="demo" :dirty="!demo&&dirty" :disabled="busy" :onBusy="childBusy"/>
    <BrandMetricReport :key="`metrics-${item.id}`" :campaignId="item.version?item.id:undefined" :demo="demo"/>
    <BrandImageEditor :item="item" :demo="demo" :enabled="mediaEnabled" :disabled="busy||(!demo&&dirty)" :onSaved="onSaved" :onBusy="childBusy"/>
    <button v-if="!demo&&editable&&item.image" class="ds-btn s" :disabled="busy||dirty" @click="void send('remove_image')">{{ t('Görseli kaldır') }}</button>
    <p v-if="item.note">{{ t('İnceleme notu') }}: {{ item.note }}</p>
    <template v-if="item.canReview">
      <label class="fld"><span class="ds-label">{{ t('İnceleme gerekçesi') }}</span><textarea class="ds-field" :disabled="busy" minlength="10" maxlength="1000" :value="note" @input="note=($event.target as HTMLTextAreaElement).value"/></label>
      <label class="ck"><input class="ds-check" v-model="rights" type="checkbox" :disabled="busy"/><span>{{ t('Marka kullanım iznini ve hedef bağlantıyı inceledim.') }}</span></label>
    </template>
    <div class="ds-row ds-g8 ds-wrap">
      <button v-if="editable" class="ds-btn p" :disabled="busy" @click="void send('save')">{{ t(demo?'Örnek marka taslağını kontrol et':'Taslağı kaydet') }}</button>
      <button v-if="!demo&&item.version>0&&item.status==='draft'" class="ds-btn s" :disabled="busy||dirty" @click="void send('submit')">{{ t('İncelemeye gönder') }}</button>
      <template v-if="!demo&&item.canReview">
        <button class="ds-btn p" :disabled="busy||!rights||note.trim().length<10" @click="void send('approve')">{{ t('Kreatifi onayla') }}</button>
        <button class="ds-btn s" :disabled="busy||note.trim().length<10" @click="void send('reject')">{{ t('Reddet') }}</button>
      </template>
      <button v-if="!demo&&['pending','approved'].includes(item.status)" class="ds-btn s" :disabled="busy" @click="void send('pause')">{{ t('Durdur') }}</button>
    </div>
    <p v-if="item.status==='pending'&&!item.canReview">{{ t('Son düzenleyen yönetici kendi kreatifini inceleyemez.') }}</p>
    <p v-if="error" role="alert" class="ds-note err">{{ t(error) }}</p>
    <p v-if="message" role="status">{{ t(message) }}</p>
  </article>
</template>

<style scoped>
p,h2,h3,h4,h5{margin:0}
h2,h3,h4{font:700 19px/1.3 Arimo,Arial,Helvetica,sans-serif;letter-spacing:0}
h5{font-size:15px;line-height:1.5}
.fld{display:flex;flex-direction:column;min-width:0;font-size:15px;font-weight:400}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px 12px}
.all{grid-column:1/-1}
@media(max-width:760px){.grid{grid-template-columns:minmax(0,1fr)}}
.ck{display:flex;gap:8px;align-items:flex-start;font-size:13px}
input.ds-check{min-height:0;padding:0;width:20px}
.fs{border:0;padding:0;margin:0;min-width:0}
@media(max-width:760px){.ds-btn{white-space:normal;height:auto;min-height:44px;padding-top:8px;padding-bottom:8px;flex:0 1 auto;max-width:100%;text-align:center}}
</style>
