<script setup lang="ts">
import {computed} from 'vue';
import {GitCompareArrows, Heart, Navigation, Phone} from '@lucide/vue';
import V2Button from '~/components/v2/V2Button.vue';
import type {MockBusiness} from '~/data/mock/businesses';
import type {ProfileView} from '~/lib/v2/profile';
import {demoMode} from '~/lib/env';
import {portalUrl} from '~/lib/portal';
import {useMockCompare} from '~/composables/useMockCompare';
import {useMockSaved} from '~/composables/useMockSaved';
import {useLocale} from '~/composables/useLocale';

// Sticky "Eylem kartı": request/appointment CTAs for managed profiles, the claim call-out for unclaimed ones.
// Live (`targets` set): "Ara" dials a checked number (core contact), "Yol tarifi" opens Google Maps
// (core location), and the request buttons follow the core activation rule (`featureAvailable`).
const props = withDefaults(defineProps<{
  business: MockBusiness;
  profile: ProfileView;
  targets?: {call: string | null; directions: string} | null;
  actions?: {quotes: boolean; appointments: boolean} | null;
}>(), {targets: null, actions: null});
const emit = defineEmits<{directions: []}>();
const {t} = useLocale();

const saved = useMockSaved();
const compare = useMockCompare();
const isSaved = computed(() => saved.has(props.business.id));
const inCompare = computed(() => compare.has(props.business.id));
const compareFull = computed(() => !inCompare.value && compare.ids.value.length >= compare.max);
// Demo keeps its placeholder link; live renders the button passive until the portal origin is set.
const claimHref = computed(() => portalUrl('claim', {business: props.business.id}) ?? (demoMode() ? '#' : null));
const tel = computed(() => (props.targets ? props.targets.call : `tel:${props.business.phone.replace(/\s/g, '')}`));
const quotes = computed(() => props.actions?.quotes ?? true);
const appointments = computed(() => props.actions?.appointments ?? true);
</script>

<template>
  <aside class="profile-action-card" :aria-label="t('Hemen ulaş')">
    <template v-if="business.claimed">
      <h2 class="t-h4">{{ t('Hemen ulaş') }}</h2>
      <V2Button size="lg" arrow :to="`/talep?servis=${business.id}`" :disabled="!quotes" class="wide">{{ t('Teklif iste') }}</V2Button>
      <V2Button variant="dark" arrow :to="`/randevu?servis=${business.id}`" :disabled="!appointments" class="wide">{{ t('Randevu al') }}</V2Button>
      <p v-if="!quotes || !appointments" class="note">
        {{ !quotes && !appointments ? t('Bu işletme henüz çevrim içi teklif ve randevu almıyor.') : !quotes ? t('Bu işletme henüz çevrim içi teklif almıyor.') : t('Bu işletme henüz çevrim içi randevu almıyor.') }}
        {{ t('Telefonla ulaşabilirsin.') }}
      </p>
    </template>
    <div class="tiles">
      <a v-if="tel" :href="tel" class="tile"><Phone :size="20" aria-hidden="true"/><span class="t-label-sm">{{ t('Ara') }}</span></a>
      <span v-else class="tile off" aria-disabled="true"><Phone :size="20" aria-hidden="true"/><span class="t-label-sm">{{ t('Telefon yok') }}</span></span>
      <a v-if="targets" :href="targets.directions" target="_blank" rel="noopener noreferrer" class="tile"><Navigation :size="20" aria-hidden="true"/><span class="t-label-sm">{{ t('Yol tarifi') }}</span></a>
      <button v-else type="button" class="tile" @click="emit('directions')"><Navigation :size="20" aria-hidden="true"/><span class="t-label-sm">{{ t('Yol tarifi') }}</span></button>
      <button type="button" class="tile" :class="{on: isSaved}" :aria-pressed="isSaved" @click="saved.toggle(business.id)">
        <Heart :size="20" aria-hidden="true"/><span class="t-label-sm">{{ isSaved ? t('Kaydedildi') : t('Kaydet') }}</span>
      </button>
    </div>
    <template v-if="business.claimed && profile.facts.length">
      <hr class="divider">
      <dl class="facts">
        <div v-for="fact in profile.facts" :key="fact.label" class="fact">
          <dt class="t-body-sm t-muted">{{ t(fact.label) }}</dt>
          <dd class="t-label-sm">{{ t(fact.value) }}</dd>
        </div>
      </dl>
    </template>
    <div v-if="!business.claimed" class="claim">
      <h2 class="t-h4">{{ t('Bu işletme sizin mi?') }}</h2>
      <p class="t-body-sm">{{ t('Ücretsiz sahiplenin; bilgileri güncelleyin, yorumlara yanıt verin.') }}</p>
      <V2Button variant="lime" arrow :href="claimHref ?? undefined" :disabled="!claimHref">{{ t('Sahiplik başvurusu') }}</V2Button>
      <p v-if="!claimHref" class="t-body-sm">{{ t('İşletme portalı bağlantısı henüz hazır değil.') }}</p>
    </div>
    <div class="compare">
      <label class="compare-toggle t-label-sm" :class="{disabled: compareFull}">
        <input type="checkbox" class="checkbox" :checked="inCompare" :disabled="compareFull" @change="compare.toggle(business.id)">
        <GitCompareArrows :size="16" aria-hidden="true"/>{{ t('Karşılaştırmaya ekle') }}
      </label>
      <NuxtLink v-if="compare.ids.value.length > 1" :to="compare.href.value" class="t-label-sm compare-link">{{ t('Karşılaştır ({count})', {count: compare.ids.value.length}) }}</NuxtLink>
    </div>
    <p v-if="business.claimed" class="note">{{ t('Arama, yol tarifi ve yorum okuma üyeliksizdir.') }}</p>
  </aside>
</template>

<style scoped>
.profile-action-card{display:flex;flex-direction:column;gap:14px;padding:24px;background:var(--white);border:1px solid var(--cream-200);border-radius:28px;box-shadow:0 20px 25px rgba(10,20,36,.08)}
.wide{width:100%}
.tiles{display:flex;gap:10px}
.tile{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 4px;background:var(--cream-50);border:1px solid var(--cream-200);border-radius:18px;color:var(--ink-900);transition:border-color .15s ease}
.tile:hover{border-color:var(--ink-300)}
.tile.off{color:var(--ink-500);cursor:not-allowed}
.tile.off:hover{border-color:var(--cream-200)}
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
