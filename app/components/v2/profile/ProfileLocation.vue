<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {ArrowUpRight, Check, MapPin} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import ProfileMiniMap from './ProfileMiniMap.vue';
import type {MockBusiness} from '~/data/mock/businesses';
import {dayRangeLabel, type ProfileView} from '~/lib/v2/profile';
import {useLocale} from '~/composables/useLocale';

// "Konum ve saatler": map, coordinate status, address, opening hours and the report link.
// Demo: the drawn mock map and a map modal. Live (`mapHref` set): the drawing only for a verified point,
// and "Haritada aç" opens Google Maps (the point, or an address search when the point is not verified).
const props = withDefaults(defineProps<{business: MockBusiness; profile: ProfileView; mapHref?: string | null}>(), {mapHref: null});
const emit = defineEmits<{map: []; report: []}>();
const {t, locale, localeTag} = useLocale();

// "bugün" is resolved on the client so server and browser render the same markup.
const today = ref<number | null>(null);
onMounted(() => { today.value = new Date().getDay(); });
// The base address ends with the district, which the second line already shows.
const street = computed(() => props.business.address.replace(new RegExp(`,\\s*${props.business.district}$`), ''));
// Turkish keeps the row as built; other languages name the days with Intl, translate "Kapalı" and write "08:30".
const rows = computed(() => (props.profile.hours ?? []).map((row) => ({
  ...row,
  label: locale.value === 'tr' ? row.label : dayRangeLabel(row.days, localeTag.value),
  time: locale.value === 'tr' ? row.time : t(row.time).replace(/(\d{2})\.(\d{2})/g, '$1:$2'),
  today: today.value !== null && row.days.includes(today.value),
})));
const showMap = computed(() => !props.mapHref || props.profile.coordinateVerified);
</script>

<template>
  <section id="konum" class="profile-location" aria-labelledby="konum-baslik">
    <h2 id="konum-baslik" class="t-h3">{{ t('Konum ve saatler') }}</h2>
    <div class="card">
      <ProfileMiniMap v-if="showMap" :label="mapHref ? t('{name} konumu, temsilî harita', {name: business.name}) : t('{name} konumu, örnek harita', {name: business.name})" class="map"/>
      <div v-else class="map no-map">
        <MapPin :size="26" aria-hidden="true"/>
        <p class="t-label-sm">{{ t('Harita noktası doğrulanıyor') }}</p>
        <p class="t-body-sm t-muted">{{ t('Doğrulanmış konum eklendiğinde harita burada görünür.') }}</p>
      </div>
      <div class="info">
        <span v-if="profile.coordinateVerified" class="pill pill-lime"><Check :size="14" aria-hidden="true"/>{{ t('Koordinat doğrulandı') }}</span>
        <span v-else class="pill pill-cream">{{ t('Kesin konum doğrulanmadı · Adres araması') }}</span>
        <address class="t-body-md">{{ street }}<br>{{ business.district }} / {{ business.city }}</address>
        <ul v-if="rows.length" class="hours t-body-sm">
          <li v-for="row in rows" :key="row.label" :class="{today: row.today}">
            <span class="day">{{ row.label }}<template v-if="row.today"> · {{ t('bugün') }}</template></span>
            <span class="time">{{ row.time }}</span>
          </li>
        </ul>
        <p v-else-if="profile.hoursNote" class="t-body-sm hours-note">{{ profile.hoursNote }}</p>
        <p v-else class="t-body-sm t-muted unknown">{{ t('Çalışma saati henüz eklenmedi. Açık olduğu varsayılmaz.') }}</p>
        <a v-if="mapHref" class="btn btn-outline" :href="mapHref" target="_blank" rel="noopener noreferrer">{{ profile.coordinateVerified ? t('Google Maps’te aç') : t('Adresi haritada ara') }}<ArrowUpRight aria-hidden="true"/></a>
        <V2Button v-else variant="outline" arrow @click="emit('map')">{{ t('Haritada aç') }}</V2Button>
      </div>
    </div>
    <p class="foot">
      <button type="button" class="t-label-sm report" aria-haspopup="dialog" @click="emit('report')">{{ t('Yanlış bilgi bildir') }}</button>
      <span class="t-body-sm t-muted">{{ t('Profil değişiklikleri eski ve yeni değerle, zamanıyla saklanır.') }}</span>
    </p>
  </section>
</template>

<style scoped>
.profile-location{display:flex;flex-direction:column;gap:20px;scroll-margin-top:110px}
.card{display:flex;align-items:flex-start;gap:24px;padding:16px;background:var(--white);border:1px solid var(--cream-200);border-radius:28px}
.info{flex:1;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:14px;padding:10px 8px 10px 0}
.pill{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;font-weight:600;font-size:13px;line-height:1.2;color:var(--ink-800)}
.pill-lime{background:var(--lime-100);padding-left:9px}
.pill-lime :deep(svg){color:var(--green-500)}
.pill-cream{background:var(--cream-100)}
address{font-style:normal;color:var(--ink-800)}
.hours{align-self:stretch;display:flex;flex-direction:column;gap:6px}
.hours li{display:flex;justify-content:space-between;gap:12px;padding:6px 10px;border-radius:10px}
.day{color:var(--ink-700)}
.time{font-weight:600;color:var(--ink-900);white-space:nowrap}
.hours li.today{background:var(--lime-100)}
.hours li.today .day{font-weight:600;color:var(--ink-900)}
.unknown{max-width:340px}
.hours-note{white-space:pre-line;overflow-wrap:anywhere;color:var(--ink-800)}
.no-map{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;width:340px;height:260px;flex:none;padding:20px;border-radius:18px;background:var(--cream-100);color:var(--ink-500);text-align:center}
.foot{display:flex;flex-wrap:wrap;align-items:center;gap:6px 16px}
.report{color:var(--orange-600)}
.report:hover{text-decoration:underline;text-underline-offset:3px}
@media (max-width:900px){
  .card{flex-direction:column;align-items:stretch}
  .map{width:100%}
  .info{padding:4px 4px 8px}
}
</style>
