<script setup lang="ts">
import {computed, onMounted, ref} from 'vue';
import {Check} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import ProfileMiniMap from './ProfileMiniMap.vue';
import type {MockBusiness} from '~/data/mock/businesses';
import type {ProfileData} from '~/data/mock/profile';

// "Konum ve saatler": mock map, coordinate status, address, opening hours and the report link.
const props = defineProps<{business: MockBusiness; profile: ProfileData}>();
const emit = defineEmits<{map: []; report: []}>();

// "bugün" is resolved on the client so server and browser render the same markup.
const today = ref<number | null>(null);
onMounted(() => { today.value = new Date().getDay(); });
// The base address ends with the district, which the second line already shows.
const street = computed(() => props.business.address.replace(new RegExp(`,\\s*${props.business.district}$`), ''));
const rows = computed(() => (props.profile.hours ?? []).map((row) => ({...row, today: today.value !== null && row.days.includes(today.value)})));
</script>

<template>
  <section id="konum" class="profile-location" aria-labelledby="konum-baslik">
    <h2 id="konum-baslik" class="t-h3">Konum ve saatler</h2>
    <div class="card">
      <ProfileMiniMap :label="`${business.name} konumu, örnek harita`" class="map"/>
      <div class="info">
        <span v-if="profile.coordinateVerified" class="pill pill-lime"><Check :size="14" aria-hidden="true"/>Koordinat doğrulandı</span>
        <span v-else class="pill pill-cream">Kesin konum doğrulanmadı · Adres araması</span>
        <address class="t-body-md">{{ street }}<br>{{ business.district }} / {{ business.city }}</address>
        <ul v-if="rows.length" class="hours t-body-sm">
          <li v-for="row in rows" :key="row.label" :class="{today: row.today}">
            <span class="day">{{ row.label }}<template v-if="row.today"> · bugün</template></span>
            <span class="time">{{ row.time }}</span>
          </li>
        </ul>
        <p v-else class="t-body-sm t-muted unknown">Çalışma saati henüz eklenmedi. Açık olduğu varsayılmaz.</p>
        <V2Button variant="outline" arrow @click="emit('map')">Haritada aç</V2Button>
      </div>
    </div>
    <p class="foot">
      <button type="button" class="t-label-sm report" @click="emit('report')">Yanlış bilgi bildir</button>
      <span class="t-body-sm t-muted">Profil değişiklikleri eski ve yeni değerle, zamanıyla saklanır.</span>
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
.foot{display:flex;flex-wrap:wrap;align-items:center;gap:6px 16px}
.report{color:var(--orange-600)}
.report:hover{text-decoration:underline;text-underline-offset:3px}
@media (max-width:900px){
  .card{flex-direction:column;align-items:stretch}
  .map{width:100%}
  .info{padding:4px 4px 8px}
}
</style>
