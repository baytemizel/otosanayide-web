<script setup lang="ts">
import {computed, ref} from 'vue';
import {ArrowRight} from '@lucide/vue';
import {allBrands, allServices, distanceSteps, paymentLabels, primaryBrands, primaryServices, type PaymentMethod, type SearchArea, type SearchFilters} from '~/data/mock/search';

// "Filtre paneli" (Figma 119:118). Every control patches the page's filter state; counts are
// computed by the page from the mock list inside the current location scope.
// Live mode (`live` set): options come from the core catalogue, one service and one brand can be chosen
// (the API takes one of each), counts are not shown (rejected, web-06) and the filters the API does not
// have (taksit, nakit, şu an açık, hafta sonu açık) are disabled with the reason.
const props = defineProps<{
  filters: SearchFilters;
  counts: {services: Record<string, number>; brands: Record<string, number>; payments: Record<PaymentMethod, number>} | null;
  total: number | null;
  live?: {services: string[]; primaryServices: string[]; brands: string[]; primaryBrands: string[]};
}>();
const emit = defineEmits<{patch: [patch: Partial<SearchFilters>]; clear: []; show: []}>();

const moreServices = ref(false);
const moreBrands = ref(false);

const place = computed(() => props.filters.ilce || props.filters.il);
const areas = computed<{value: SearchArea; label: string}[]>(() => [
  {value: 'ilce', label: props.filters.ilce ? 'Yalnız seçili ilçe' : `Yalnız ${props.filters.il}`},
  {value: 'cevre', label: `${place.value} çevresi`},
  {value: 'konum', label: 'Konumumu kullan'},
]);

const withSelected = (base: string[], all: string[], selected: string[], more: boolean) =>
  more ? all : [...base, ...selected.filter((value) => !base.includes(value))];
const services = computed(() => (props.live
  ? withSelected(props.live.primaryServices, props.live.services, props.filters.services, moreServices.value)
  : withSelected(primaryServices, allServices, props.filters.services, moreServices.value)));
const brands = computed(() => (props.live
  ? withSelected(props.live.primaryBrands, props.live.brands, props.filters.brands, moreBrands.value)
  : withSelected(primaryBrands, allBrands, props.filters.brands, moreBrands.value)));
const payments: PaymentMethod[] = ['kart', 'taksit', 'nakit'];
const unsupported = 'Bu filtre henüz aramada yok';
const paymentOff = (payment: PaymentMethod) => !!props.live && payment !== 'kart';
/** Distance applies to "çevresi" and "konum"; in live mode a city-only search sends no radius. */
const distanceOff = computed(() => !!props.live && props.filters.area === 'ilce');

const step = computed(() => Math.max(0, distanceSteps.indexOf(props.filters.km)));
const fill = computed(() => `${(step.value / (distanceSteps.length - 1)) * 100}%`);

function toggle<T>(list: T[], value: T) {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}
/** Live: the API takes one service and one brand, so a tick replaces the previous one. */
const pick = (list: string[], value: string) => (props.live ? (list.includes(value) ? [] : [value]) : toggle(list, value));
const count = (map: Record<string, number>, key: string) => map[key] ?? 0;
</script>

<template>
  <div class="panel">
    <div class="head">
      <h2 id="filtreler" class="t-h4" tabindex="-1">Filtreler</h2>
      <button type="button" class="clear t-label-sm" @click="emit('clear')">Temizle</button>
    </div>
    <hr class="divider">

    <fieldset class="group">
      <legend class="t-mono-sm t-muted">Arama alanı</legend>
      <label v-for="area in areas" :key="area.value" class="row" :class="{on: filters.area === area.value}">
        <input type="radio" class="radio" name="arama-alani" :value="area.value" :checked="filters.area === area.value" @change="emit('patch', {area: area.value})">
        <span>{{ area.label }}</span>
      </label>
    </fieldset>
    <hr class="divider">

    <div class="group" :class="{muted: filters.area === 'ilce'}">
      <label for="arama-mesafesi" class="t-mono-sm t-muted">Arama mesafesi</label>
      <input id="arama-mesafesi" type="range" :disabled="distanceOff" class="range" min="0" :max="distanceSteps.length - 1" step="1" :value="step"
             :style="{'--fill': fill}" :aria-valuetext="`${filters.km} km`"
             @input="emit('patch', {km: distanceSteps[Number(($event.target as HTMLInputElement).value)]})">
      <div class="stops">
        <button v-for="km in distanceSteps" :key="km" type="button" class="t-mono-sm" :class="{on: filters.km === km}" :aria-pressed="filters.km === km" :disabled="distanceOff" @click="emit('patch', {km})">{{ km }} km</button>
      </div>
      <p class="note">Mesafeler kuş uçuşudur; gerçek yol süresi farklı olabilir.</p>
      <p v-if="distanceOff" class="note">Mesafe yalnız “çevresi” ya da “Konumumu kullan” seçiliyken uygulanır.</p>
    </div>
    <hr class="divider">

    <fieldset class="group">
      <legend class="t-mono-sm t-muted">Hizmet</legend>
      <label v-for="service in services" :key="service" class="row" :class="{on: filters.services.includes(service)}">
        <input type="checkbox" class="box" :checked="filters.services.includes(service)" @change="emit('patch', {services: pick(filters.services, service)})">
        <span>{{ service }}</span><span class="fill" aria-hidden="true"/><span v-if="counts" class="t-mono-sm t-muted">{{ count(counts.services, service) }}</span>
      </label>
      <button type="button" class="more t-label-sm" :aria-expanded="moreServices" @click="moreServices = !moreServices">{{ moreServices ? 'Daha az göster' : 'Tümünü göster' }}</button>
      <p v-if="live" class="note">Aynı anda bir hizmet seçilebilir.</p>
    </fieldset>
    <hr class="divider">

    <fieldset class="group">
      <legend class="t-mono-sm t-muted">Marka uzmanlığı</legend>
      <label v-for="brand in brands" :key="brand" class="row" :class="{on: filters.brands.includes(brand)}">
        <input type="checkbox" class="box" :checked="filters.brands.includes(brand)" @change="emit('patch', {brands: pick(filters.brands, brand)})">
        <span>{{ brand }}</span><span class="fill" aria-hidden="true"/><span v-if="counts" class="t-mono-sm t-muted">{{ count(counts.brands, brand) }}</span>
      </label>
      <button type="button" class="more t-label-sm" :aria-expanded="moreBrands" @click="moreBrands = !moreBrands">{{ moreBrands ? 'Daha az göster' : 'Tümünü göster' }}</button>
      <p v-if="live" class="note">Aynı anda bir marka seçilebilir.</p>
    </fieldset>
    <hr class="divider">

    <fieldset class="group">
      <legend class="t-mono-sm t-muted">Ödeme</legend>
      <label v-for="payment in payments" :key="payment" class="row" :class="{on: filters.payments.includes(payment), off: paymentOff(payment)}" :title="paymentOff(payment) ? unsupported : undefined">
        <input type="checkbox" class="box" :checked="filters.payments.includes(payment) && !paymentOff(payment)" :disabled="paymentOff(payment)" @change="emit('patch', {payments: toggle(filters.payments, payment)})">
        <span>{{ paymentLabels[payment].option }}</span><span class="fill" aria-hidden="true"/>
        <span v-if="paymentOff(payment)" class="t-mono-sm t-muted">Yakında</span>
        <span v-else-if="counts" class="t-mono-sm t-muted">{{ counts.payments[payment] }}</span>
      </label>
    </fieldset>
    <hr class="divider">

    <fieldset class="group">
      <legend class="t-mono-sm t-muted">Durum</legend>
      <label class="row toggle" :class="{off: live}" :title="live ? unsupported : undefined">
        <span>Şu an açık</span><span class="fill" aria-hidden="true"/><span v-if="live" class="t-mono-sm t-muted">Yakında</span>
        <input type="checkbox" role="switch" class="switch" :checked="filters.openNow && !live" :disabled="!!live" @change="emit('patch', {openNow: !filters.openNow})">
      </label>
      <label class="row toggle" :class="{off: live}" :title="live ? unsupported : undefined">
        <span>Hafta sonu açık</span><span class="fill" aria-hidden="true"/><span v-if="live" class="t-mono-sm t-muted">Yakında</span>
        <input type="checkbox" role="switch" class="switch" :checked="filters.weekend && !live" :disabled="!!live" @change="emit('patch', {weekend: !filters.weekend})">
      </label>
      <label class="row toggle">
        <span>Sadece doğrulanmış</span><span class="fill" aria-hidden="true"/>
        <input type="checkbox" role="switch" class="switch" :checked="filters.verifiedOnly" @change="emit('patch', {verifiedOnly: !filters.verifiedOnly})">
      </label>
    </fieldset>

    <p v-if="live" class="note">Taksit, nakit, şu an açık ve hafta sonu filtreleri henüz aramada yok; sonuç sayısı filtre başına gösterilmez.</p>
    <p class="note">Bilinmeyen bilgi “var” sayılmaz. Değerler işletme beyanına dayanır.</p>
    <button type="button" class="btn btn-dark show" @click="emit('show')">{{ total === null ? 'Sonuçları göster' : `${total} sonucu göster` }}<ArrowRight aria-hidden="true"/></button>
  </div>
</template>

<style scoped>
.panel{display:flex;flex-direction:column;gap:22px;padding:24px;background:var(--white);border:1px solid var(--cream-200);border-radius:28px}
.head{display:flex;align-items:center;justify-content:space-between}
.head h2:focus{outline:none}
.clear{color:var(--orange-600)}
.clear:hover{text-decoration:underline}
.group{display:flex;flex-direction:column;align-items:stretch;gap:12px;margin:0;padding:0;border:0;min-width:0}
.group legend{padding:0;margin-bottom:12px}
.row{display:flex;align-items:center;gap:10px;font-size:14px;line-height:1.45;color:var(--ink-700);cursor:pointer}
.row.on{font-weight:600;color:var(--ink-900)}
.row.toggle{color:var(--ink-800)}
.fill{flex:1}
.box{appearance:none;flex:none;display:grid;place-content:center;width:22px;height:22px;margin:0;background:var(--white);border:1.5px solid var(--ink-300);border-radius:7px;cursor:pointer}
.box:checked{background:var(--orange-500);border-color:var(--orange-500)}
.box:checked::before{content:"";width:9px;height:5px;border-left:1.75px solid var(--ink-900);border-bottom:1.75px solid var(--ink-900);transform:translateY(-1px) rotate(-45deg)}
.more{align-self:flex-start;color:var(--orange-600)}
.more:hover{text-decoration:underline}
.range{-webkit-appearance:none;appearance:none;width:100%;height:24px;margin:0;background:transparent;cursor:pointer}
.range::-webkit-slider-runnable-track{height:6px;border-radius:3px;background:linear-gradient(to right,var(--ink-900) var(--fill),var(--cream-200) var(--fill))}
.range::-moz-range-track{height:6px;border-radius:3px;background:linear-gradient(to right,var(--ink-900) var(--fill),var(--cream-200) var(--fill))}
.range::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;margin-top:-8px;border-radius:999px;background:var(--white);border:3px solid var(--ink-900)}
.range::-moz-range-thumb{width:16px;height:16px;border-radius:999px;background:var(--white);border:3px solid var(--ink-900)}
.stops{display:flex;justify-content:space-between}
.stops button{color:var(--ink-500)}
.stops button.on{font-weight:700;color:var(--ink-900)}
.muted .range,.muted .stops{opacity:.45}
.row.off{cursor:not-allowed;color:var(--ink-300)}
.row.off .box,.row.off .switch{cursor:not-allowed;opacity:.5}
.note{font-size:13px;line-height:1.45;color:var(--ink-500)}
.show{width:100%}
</style>
