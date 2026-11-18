<script setup lang="ts">
import {computed, ref} from 'vue';
import {Locate, Minus, Plus, Search, Star} from '@lucide/vue';
import {formatKm, formatRating, type MockBusiness} from '~/data/mock/businesses';
import {homeMapPins} from '~/data/mock/home';

// Figma 111:306 "Harita · canlı": a styled mock map (no map SDK). Pins are rating bubbles;
// the selected pin is dark and shows a small card. Hovering a list card highlights its pin.
const props = defineProps<{businesses: MockBusiness[]; selectedId: string | null; hoverId: string | null; photos?: Record<string, string>}>();
const emit = defineEmits<{select: [id: string]}>();

const W = 600;
const H = 706;
const zoom = ref(1);
const pins = computed(() => props.businesses.map((b) => {
  const at = homeMapPins[b.id] ?? {x: (b.map.x / 100) * W, y: (b.map.y / 100) * H};
  return {business: b, left: `${(at.x / W) * 100}%`, top: `${(at.y / H) * 100}%`};
}));
const setZoom = (value: number) => { zoom.value = Math.min(1.6, Math.max(1, Math.round(value * 10) / 10)); };
function locate() {
  zoom.value = 1;
  const nearest = [...props.businesses].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))[0];
  if (nearest) emit('select', nearest.id);
}
</script>

<template>
  <div class="home-map" role="region" aria-label="Servis haritası (örnek)">
    <div class="layer" :style="{transform: `scale(${zoom})`}">
      <img class="base" src="/v2/home/map-base.svg" alt="" width="600" height="800" aria-hidden="true">
      <span class="you" aria-hidden="true">
        <img src="/v2/home/map-you-ring.svg" alt="" width="96" height="96">
        <img class="you-dot" src="/v2/home/map-you.svg" alt="" width="22" height="22">
      </span>
      <span
        v-for="pin in pins" :key="pin.business.id" class="pin-anchor"
        :class="{selected: pin.business.id === selectedId, hot: pin.business.id === hoverId}"
        :style="{left: pin.left, top: pin.top, transform: `scale(${1 / zoom})`}">
        <span v-if="pin.business.id === selectedId" class="popup">
          <img :src="photos?.[pin.business.id] ?? pin.business.photo ?? '/v2/workshop.jpg'" alt="" width="48" height="48">
          <span class="popup-text">
            <NuxtLink :to="`/servis/${pin.business.id}`" class="t-label-sm">{{ pin.business.name }}</NuxtLink>
            <span class="t-body-sm t-muted">{{ formatKm(pin.business.distanceKm) }} · {{ pin.business.open ? 'Açık' : 'Kapalı' }}</span>
          </span>
        </span>
        <button
          type="button" class="pin t-label-sm" :aria-pressed="pin.business.id === selectedId"
          :aria-label="pin.business.reviewCount ? `${pin.business.name}, puan ${formatRating(pin.business.rating)}` : `${pin.business.name}, henüz puan yok`"
          @click="emit('select', pin.business.id)">
          <template v-if="pin.business.reviewCount"><Star :size="14" aria-hidden="true"/>{{ formatRating(pin.business.rating) }}</template>
          <template v-else>Yeni</template>
        </button>
      </span>
    </div>

    <NuxtLink to="/ara" class="area t-label-sm"><Search :size="16" aria-hidden="true"/>Bu alanda ara</NuxtLink>
    <div class="zoom">
      <button type="button" aria-label="Yakınlaştır" :disabled="zoom >= 1.6" @click="setZoom(zoom + 0.2)"><Plus :size="18" aria-hidden="true"/></button>
      <span class="zoom-sep" aria-hidden="true"/>
      <button type="button" aria-label="Uzaklaştır" :disabled="zoom <= 1" @click="setZoom(zoom - 0.2)"><Minus :size="18" aria-hidden="true"/></button>
    </div>
    <button type="button" class="locate" aria-label="Konumuma en yakın servisi seç" @click="locate"><Locate :size="20" aria-hidden="true"/></button>
  </div>
</template>

<style scoped>
.home-map{position:relative;overflow:hidden;width:100%;aspect-ratio:600/706;border-radius:28px;background:var(--cream-100)}
.layer{position:absolute;inset:0;transform-origin:50% 50%;transition:transform .25s ease}
.base{position:absolute;left:0;top:0;width:100%;height:auto;max-width:none}
.you{position:absolute;left:53%;top:58.64%;width:96px;height:96px}
.you-dot{position:absolute;left:37px;top:37px}
.pin-anchor{position:absolute;transform-origin:0 0;transition:transform .25s ease;z-index:1}
.pin-anchor.selected,.pin-anchor.hot{z-index:3}
.pin{display:flex;align-items:center;gap:5px;padding:7px 12px 7px 9px;border-radius:999px;background:var(--white);color:var(--ink-900);box-shadow:0 6px 8px rgba(10,20,36,.2);white-space:nowrap;transition:background-color .15s ease,color .15s ease,transform .15s ease}
.pin :deep(svg){color:var(--orange-500);fill:currentColor}
.pin:hover,.hot .pin{transform:scale(1.08);background:var(--ink-900);color:var(--white)}
.selected .pin{background:var(--ink-900);color:var(--white);box-shadow:0 6px 8px rgba(10,20,36,.35)}
.selected .pin :deep(svg),.hot .pin :deep(svg),.pin:hover :deep(svg){color:var(--lime-400)}
.popup{position:absolute;left:50%;bottom:calc(100% + 6px);transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:10px 16px 10px 10px;border-radius:20px;background:var(--white);box-shadow:0 14px 16px rgba(10,20,36,.22);white-space:nowrap}
.popup img{width:48px;height:48px;border-radius:12px;object-fit:cover}
.popup-text{display:flex;flex-direction:column;gap:2px}
.popup-text a{color:var(--ink-900)}
.popup-text a:hover{text-decoration:underline}

.area{position:absolute;left:50%;top:18px;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:10px 18px 10px 14px;border-radius:999px;background:var(--ink-900);color:var(--white);box-shadow:0 10px 12px rgba(10,20,36,.3);white-space:nowrap;z-index:4}
.area :deep(svg){color:var(--lime-400)}
.zoom{position:absolute;right:18px;top:18px;display:flex;flex-direction:column;overflow:hidden;border-radius:16px;background:var(--white);box-shadow:0 8px 20px rgba(10,20,36,.16);z-index:4}
.zoom button{display:grid;place-items:center;width:44px;height:44px;color:var(--ink-900)}
.zoom button:disabled{color:var(--ink-300);cursor:default}
.zoom-sep{height:1px;background:var(--cream-200)}
.locate{position:absolute;right:18px;bottom:18px;display:grid;place-items:center;width:44px;height:44px;border-radius:999px;background:var(--white);color:var(--ink-900);box-shadow:0 8px 10px rgba(10,20,36,.16);z-index:4}
</style>
