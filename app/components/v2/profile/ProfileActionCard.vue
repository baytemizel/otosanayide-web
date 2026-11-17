<script setup lang="ts">
import {computed} from 'vue';
import {GitCompareArrows, Heart, Navigation, Phone} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import type {MockBusiness} from '~/data/mock/businesses';
import type {ProfileData} from '~/data/mock/profile';
import {portalUrl} from '~/lib/portal';
import {useMockCompare} from '~/composables/useMockCompare';
import {useMockSaved} from '~/composables/useMockSaved';

// Sticky "Eylem kartı": request/appointment CTAs for managed profiles, the claim call-out for unclaimed ones.
const props = defineProps<{business: MockBusiness; profile: ProfileData}>();
const emit = defineEmits<{directions: []}>();

const saved = useMockSaved();
const compare = useMockCompare();
const isSaved = computed(() => saved.has(props.business.id));
const inCompare = computed(() => compare.has(props.business.id));
const compareFull = computed(() => !inCompare.value && compare.ids.value.length >= compare.max);
const claimHref = computed(() => portalUrl('claim', {business: props.business.id}) ?? '#');
const tel = computed(() => `tel:${props.business.phone.replace(/\s/g, '')}`);
</script>

<template>
  <aside class="profile-action-card" aria-label="Hemen ulaş">
    <template v-if="business.claimed">
      <h2 class="t-h4">Hemen ulaş</h2>
      <V2Button size="lg" arrow :to="`/talep?servis=${business.id}`" class="wide">Teklif iste</V2Button>
      <V2Button variant="dark" arrow :to="`/randevu?servis=${business.id}`" class="wide">Randevu al</V2Button>
    </template>
    <div class="tiles">
      <a :href="tel" class="tile"><Phone :size="20" aria-hidden="true"/><span class="t-label-sm">Ara</span></a>
      <button type="button" class="tile" @click="emit('directions')"><Navigation :size="20" aria-hidden="true"/><span class="t-label-sm">Yol tarifi</span></button>
      <button type="button" class="tile" :class="{on: isSaved}" :aria-pressed="isSaved" @click="saved.toggle(business.id)">
        <Heart :size="20" aria-hidden="true"/><span class="t-label-sm">{{ isSaved ? 'Kaydedildi' : 'Kaydet' }}</span>
      </button>
    </div>
    <template v-if="business.claimed">
      <hr class="divider">
      <dl class="facts">
        <div v-for="fact in profile.facts" :key="fact.label" class="fact">
          <dt class="t-body-sm t-muted">{{ fact.label }}</dt>
          <dd class="t-label-sm">{{ fact.value }}</dd>
        </div>
      </dl>
    </template>
    <div v-else class="claim">
      <h2 class="t-h4">Bu işletme sizin mi?</h2>
      <p class="t-body-sm">Ücretsiz sahiplenin; bilgileri güncelleyin, yorumlara yanıt verin.</p>
      <V2Button variant="lime" arrow :href="claimHref">Sahiplik başvurusu</V2Button>
    </div>
    <div class="compare">
      <label class="compare-toggle t-label-sm" :class="{disabled: compareFull}">
        <input type="checkbox" class="checkbox" :checked="inCompare" :disabled="compareFull" @change="compare.toggle(business.id)">
        <GitCompareArrows :size="16" aria-hidden="true"/>Karşılaştırmaya ekle
      </label>
      <NuxtLink v-if="compare.ids.value.length > 1" :to="compare.href.value" class="t-label-sm compare-link">Karşılaştır ({{ compare.ids.value.length }})</NuxtLink>
    </div>
    <p v-if="business.claimed" class="note">Arama, yol tarifi ve yorum okuma üyeliksizdir.</p>
  </aside>
</template>

<style scoped>
.profile-action-card{display:flex;flex-direction:column;gap:14px;padding:24px;background:var(--white);border:1px solid var(--cream-200);border-radius:28px;box-shadow:0 20px 25px rgba(10,20,36,.08)}
.wide{width:100%}
.tiles{display:flex;gap:10px}
.tile{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 4px;background:var(--cream-50);border:1px solid var(--cream-200);border-radius:18px;color:var(--ink-900);transition:border-color .15s ease}
.tile:hover{border-color:var(--ink-300)}
.tile.on :deep(svg){color:var(--orange-500);fill:var(--orange-500)}
.facts{display:flex;flex-direction:column;gap:14px}
.fact{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
.fact dd{margin:0;text-align:right}
.claim{display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:22px;border-radius:24px;background:var(--ink-900);color:var(--white)}
.claim .t-body-sm{color:var(--ink-300)}
.compare{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.compare-toggle{display:inline-flex;align-items:center;gap:8px;color:var(--ink-700);cursor:pointer}
.compare-toggle .checkbox{width:20px;height:20px}
.compare-toggle.disabled{opacity:.5;cursor:not-allowed}
.compare-link{color:var(--orange-600)}
.note{font-size:13px;line-height:1.45;color:var(--ink-500)}
</style>
