<script setup lang="ts">
import {ArrowRight} from '@lucide/vue';
import {formatKmValue, vehicleTitle, type MockVehicle} from '~/data/mock/garage';

// W11 "Araç özeti" (Figma 123:311): orange gradient band with TR plate, model and actions.
defineProps<{vehicle: MockVehicle}>();
const emit = defineEmits<{edit: []; 'add-record': []}>();
</script>

<template>
  <section class="hero" aria-labelledby="vehicle-title">
    <div class="copy">
      <p v-if="vehicle.plate" class="plate" :aria-label="`Plaka ${vehicle.plate}`"><span class="tr" aria-hidden="true">TR</span><span class="num" aria-hidden="true">{{ vehicle.plate }}</span></p>
      <p v-else class="plate empty"><span class="tr" aria-hidden="true">TR</span><span class="num">Plaka yok</span></p>
      <h2 id="vehicle-title" class="t-h3">{{ vehicleTitle(vehicle) }}</h2>
      <p class="t-body-md meta">{{ vehicle.fuel }} · {{ vehicle.transmission }} · {{ formatKmValue(vehicle.km) }} · VIN ve plaka zorunlu değil</p>
    </div>
    <div class="actions">
      <button type="button" class="btn btn-outline" @click="emit('edit')">Düzenle</button>
      <button type="button" class="btn btn-dark" @click="emit('add-record')">Kayıt ekle<ArrowRight aria-hidden="true"/></button>
    </div>
  </section>
</template>

<style scoped>
.hero{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:32px;border-radius:32px;background:linear-gradient(90deg,#F36B21,#FFA13D);overflow:hidden}
.copy{display:flex;flex-direction:column;align-items:flex-start;gap:12px;min-width:0}
.plate{display:inline-flex;align-items:center;background:var(--white);border:2px solid var(--ink-900);border-radius:10px;overflow:hidden}
.tr{width:26px;height:36px;display:grid;place-items:center;background:#1E4FBF;color:var(--white);font-family:var(--font-mono);font-weight:700;font-size:9px;letter-spacing:.06em}
.num{padding:0 14px;font-family:var(--font-mono);font-weight:700;font-size:17px;line-height:1.3;letter-spacing:.04em;color:var(--ink-900);white-space:nowrap}
.plate.empty .num{font-size:13px;color:var(--ink-500)}
.meta{color:rgba(10,21,36,.86)}
.actions{flex:none;display:flex;gap:10px}
.actions .btn-outline:hover{border-color:var(--ink-900)}
@media (max-width:900px){
  .hero{flex-direction:column;align-items:flex-start;padding:24px;border-radius:24px}
  .actions{flex-wrap:wrap}
}
</style>
