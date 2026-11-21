<script setup lang="ts">
import {computed, ref} from 'vue';
import {ArrowRight, Check, Info, Wrench} from '@lucide/vue';
import {useLocale} from '~/composables/useLocale';
import {homeCategoryStats, homeSymptomArea, homeSymptomDefault, homeSymptoms} from '~/data/mock/home';

// Figma 109:138 "Belirti Bulucu · interaktif": multi-select; the result panel updates on every selection.
// Symptom, category, system and part names are Turkish source text, translated at render.
const {t, locale, localeTag} = useLocale();
const selected = ref<string[]>([...homeSymptomDefault]);
const steps = computed(() => [t('Belirtiyi seç'), t('Olası kategoriyi gör'), t('Servisleri karşılaştır')]);

function toggle(id: string) {
  selected.value = selected.value.includes(id) ? selected.value.filter((x) => x !== id) : [...selected.value, id];
}

const result = computed(() => {
  const picked = homeSymptoms.filter((s) => selected.value.includes(s.id))
    .sort((a, b) => selected.value.indexOf(a.id) - selected.value.indexOf(b.id));
  if (!picked.length) return null;
  // The category most of the picked symptoms point to wins; ties go to the first pick.
  const tally = new Map<string, number>();
  for (const s of picked) tally.set(s.category, (tally.get(s.category) ?? 0) + 1);
  const category = [...tally.entries()].sort((a, b) => b[1] - a[1])[0]![0];
  const lead = picked.find((s) => s.category === category)!;
  const parts = [...new Set(picked.flatMap((s) => s.parts))].slice(0, 4);
  const stats = homeCategoryStats[category] ?? {count: 5, nearestKm: 2, open: 3};
  return {category, system: lead.system, parts, stats};
});
// Turkish possessive suffix after a number: 9’u, 5’i, 4’ü, 6’sı …
const unitSuffix = ['', 'i', 'si', 'ü', 'ü', 'i', 'sı', 'si', 'i', 'u'];
const tenSuffix = ['', 'u', 'si', 'u', 'ı', 'si', 'ı', 'i', 'i', 'ı'];
const ofSuffix = (n: number) => (n % 10 ? unitSuffix[n % 10] : tenSuffix[Math.floor(n / 10) % 10]) || 'ı';
// "9’u şu an açık" in Turkish; English has no suffix ("9 open now").
const openCount = (n: number) => (locale.value === 'tr' ? `${n}’${ofSuffix(n)}` : String(n));
const km = (value: number) => `${value.toLocaleString(localeTag.value, {minimumFractionDigits: 1, maximumFractionDigits: 1})} km`;
const servicesLink = computed(() => ({path: '/ara', query: {belirti: selected.value.join(',')}}));
</script>

<template>
  <section id="belirti-bulucu" class="home-symptoms" aria-labelledby="home-symptoms-title">
    <img class="glow glow-left" src="/v2/home/glow-symptom-left.svg" alt="" width="760" height="760" aria-hidden="true">
    <img class="glow glow-right" src="/v2/home/glow-symptom-right.svg" alt="" width="620" height="620" aria-hidden="true">

    <div class="v2-wrap inner">
      <div class="text">
        <p class="pill t-mono-sm"><span class="pill-dot" aria-hidden="true"/>{{ t('BELİRTİ BULUCU') }}</p>
        <h2 id="home-symptoms-title" class="t-h2" v-html="t('Belirtiyi seç,<br>doğru ustaya git.')"/>
        <p class="t-body-md lead">{{ t('Arızanın adını bilmen gerekmiyor. Fark ettiğin belirtiyi seç; hangi kategoriye bakman gerektiğini ve yakınındaki uygun servisleri gösterelim.') }}</p>
        <ol class="steps">
          <li v-for="(step, i) in steps" :key="step">
            <span class="num" aria-hidden="true">{{ String(i + 1).padStart(2, '0') }}</span>
            <span class="t-label-md">{{ step }}</span>
          </li>
        </ol>
      </div>

      <div class="card">
        <div class="card-head">
          <h3 class="t-h4">{{ t('Ne fark ettin?') }}</h3>
          <p class="t-mono-sm count" aria-live="polite">{{ t('{selected} / {total} SEÇİLDİ', {selected: selected.length, total: homeSymptoms.length}) }}</p>
        </div>
        <ul class="chips" :aria-label="t('Belirtiler')">
          <li v-for="s in homeSymptoms" :key="s.id">
            <button
              type="button" class="chip" :class="selected.includes(s.id) ? 'chip-dark-active' : 'chip-dark'"
              :aria-pressed="selected.includes(s.id)" @click="toggle(s.id)">
              <Check v-if="selected.includes(s.id)" :size="14" :stroke-width="2.5" aria-hidden="true"/>{{ t(s.label) }}
            </button>
          </li>
        </ul>

        <div class="panel" aria-live="polite">
          <template v-if="result">
            <div class="panel-head">
              <div class="panel-title">
                <p class="t-mono-sm t-muted">{{ t('OLASI KATEGORİ') }}</p>
                <p class="t-h4">{{ t(result.category) }} · {{ t(result.system) }}</p>
              </div>
              <span class="panel-icon" aria-hidden="true"><Wrench :size="22"/></span>
            </div>
            <ul class="parts">
              <li v-for="p in result.parts" :key="p" class="chip chip-soft">{{ t(p) }}</li>
            </ul>
            <hr class="divider">
            <div class="panel-foot">
              <div class="panel-stats">
                <p class="t-label-md">{{ t('{area} çevresinde {count} uygun servis', {area: homeSymptomArea, count: result.stats.count}) }}</p>
                <p class="t-body-sm t-muted">{{ t('En yakını {nearest} · {open} şu an açık', {nearest: km(result.stats.nearestKm), open: openCount(result.stats.open)}) }}</p>
              </div>
              <NuxtLink :to="servicesLink" class="btn btn-primary">{{ t('Servisleri gör') }}<ArrowRight aria-hidden="true"/></NuxtLink>
            </div>
          </template>
          <div v-else class="empty">
            <p class="t-mono-sm t-muted">{{ t('OLASI KATEGORİ') }}</p>
            <p class="t-h4">{{ t('Bir ya da daha fazla belirti seç') }}</p>
            <p class="t-body-sm t-muted">{{ t('Seçtiğin her belirtiyle olası kategori ve yakınındaki servisler burada güncellenir.') }}</p>
          </div>
        </div>

        <p class="note t-body-sm"><Info :size="16" aria-hidden="true"/>{{ t('Ön bilgilendirmedir; teşhis yerine geçmez.') }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-symptoms{position:relative;overflow:hidden;background:var(--ink-900);color:var(--white)}
.glow{position:absolute;pointer-events:none;max-width:none}
.glow-left{width:760px;height:760px;left:calc(50% - 1040px);top:260px}
.glow-right{width:620px;height:620px;left:calc(50% + 360px);top:-300px}
.inner{position:relative;display:flex;align-items:center;gap:80px;padding-top:104px;padding-bottom:104px}
.text{flex:0 0 480px;display:flex;flex-direction:column;align-items:flex-start;gap:28px}
.pill{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);color:var(--lime-400)}
.pill-dot{width:7px;height:7px;border-radius:999px;background:var(--lime-400)}
.lead{max-width:440px;color:var(--ink-300)}
.steps{display:flex;flex-direction:column;gap:14px}
.steps li{display:flex;align-items:center;gap:14px;color:rgba(255,255,255,.72)}
.num{display:grid;place-items:center;width:38px;height:38px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);font-family:var(--font-mono);font-weight:700;font-size:11px;letter-spacing:.06em;color:var(--white)}
.steps li:first-child{color:var(--white)}
.steps li:first-child .num{background:var(--lime-400);border-color:var(--lime-400);color:var(--ink-900)}

.card{flex:1;min-width:0;display:flex;flex-direction:column;gap:22px;padding:28px;background:var(--ink-800);border:1px solid rgba(255,255,255,.1);border-radius:32px;box-shadow:0 30px 35px rgba(10,20,36,.4)}
.card-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.count{color:var(--ink-300);white-space:nowrap}
.chips{display:flex;flex-wrap:wrap;gap:10px}
.chips .chip-dark:hover{border-color:rgba(255,255,255,.4)}
.panel{display:flex;flex-direction:column;gap:18px;padding:24px;border-radius:24px;background:var(--cream-50);color:var(--ink-900)}
.panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
.panel-title{display:flex;flex-direction:column;gap:6px}
.panel-icon{flex:none;display:grid;place-items:center;width:48px;height:48px;border-radius:999px;background:var(--orange-100);color:var(--orange-600)}
.parts{display:flex;flex-wrap:wrap;gap:8px}
.panel-foot{display:flex;align-items:center;justify-content:space-between;gap:16px}
.panel-stats{display:flex;flex-direction:column;gap:4px}
.empty{display:flex;flex-direction:column;gap:6px;min-height:185px;justify-content:center}
.note{display:flex;align-items:center;gap:8px;color:var(--ink-300)}

@media (max-width:1100px){
  .inner{flex-direction:column;align-items:stretch;gap:48px}
  .text{flex:none}
}
@media (max-width:760px){
  .inner{padding-top:72px;padding-bottom:72px}
  .card{padding:20px;border-radius:28px}
  .panel{padding:18px}
  .panel-foot{flex-direction:column;align-items:flex-start}
}
</style>
