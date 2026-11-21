<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from 'vue';
import {ArrowRight, Bell, Car, Check, Wrench} from '@lucide/vue';
import {useLocale} from '~/composables/useLocale';
import {homeGarageBullets, homeGarageReminders, homeGarageTip, homeGarageVehicle} from '~/data/mock/home';

// Figma 112:321 "Garajım · hatırlatmalar": reminder switches toggle; rings fill by the time left.
// Texts are Turkish source text, translated at render; the plate and the vehicle name stay as they are.
const {t} = useLocale();
const reminders = ref(homeGarageReminders.map((r) => ({...r})));
const filled = ref(true);
const root = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | undefined;

const R = 19.5;
const C = 2 * Math.PI * R;
const tones = {orange: 'var(--orange-500)', amber: 'var(--amber-400)', green: 'var(--green-500)'} as const;
const dash = (remaining: number, on: boolean) => (filled.value && on ? C * (1 - remaining) : C);

onMounted(() => {
  if (!root.value || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  filled.value = false;
  observer = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    observer?.disconnect();
    requestAnimationFrame(() => { filled.value = true; });
  }, {rootMargin: '0px 0px -25% 0px'});
  observer.observe(root.value);
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <section ref="root" class="home-garage v2-wrap" aria-labelledby="home-garage-title">
    <div class="panel">
      <img class="ring-deco a" src="/v2/home/garage-ring-a.svg" alt="" width="520" height="520" aria-hidden="true">
      <img class="ring-deco b" src="/v2/home/garage-ring-b.svg" alt="" width="760" height="760" aria-hidden="true">

      <div class="text">
        <p class="pill t-mono-sm"><Car :size="16" aria-hidden="true"/>{{ t('GARAJIM') }}</p>
        <h2 id="home-garage-title" class="t-h2" v-html="t('Aracını ekle,<br>gerisi bizde.')"/>
        <p class="t-body-md lead">{{ t('Muayene, sigorta ve bakım tarihlerini biz takip edelim; zamanı gelince aracına uygun servisleri önerelim.') }}</p>
        <ul class="bullets">
          <li v-for="b in homeGarageBullets" :key="b" class="t-label-md"><span class="tick" aria-hidden="true"><Check :size="13" :stroke-width="2.5"/></span>{{ t(b) }}</li>
        </ul>
        <div class="cta">
          <NuxtLink to="/araclarim" class="btn btn-dark">{{ t('Aracını ekle') }}<ArrowRight aria-hidden="true"/></NuxtLink>
          <NuxtLink to="/hatirlatmalar" class="btn btn-outline">{{ t('Nasıl çalışır?') }}</NuxtLink>
        </div>
      </div>

      <div class="vehicle">
        <div class="vehicle-head">
          <span class="plate" :aria-label="t('Plaka {plate}', {plate: homeGarageVehicle.plate})"><span class="plate-tr" aria-hidden="true">TR</span><span class="plate-no" aria-hidden="true">{{ homeGarageVehicle.plate }}</span></span>
          <span class="bell" aria-hidden="true"><Bell :size="19"/></span>
        </div>
        <div class="vehicle-name">
          <h3 class="t-h4">{{ homeGarageVehicle.name }}</h3>
          <p class="t-body-sm t-muted">{{ t(homeGarageVehicle.detail) }}</p>
        </div>
        <hr class="divider">
        <ul class="reminders" :aria-label="t('Hatırlatmalar (örnek)')">
          <li v-for="r in reminders" :key="r.id" class="reminder" :class="{off: !r.on}">
            <svg class="ring" width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
              <circle cx="22" cy="22" :r="R" fill="none" stroke="var(--cream-200)" stroke-width="5"/>
              <circle
                cx="22" cy="22" :r="R" fill="none" :stroke="tones[r.tone]" stroke-width="5" stroke-linecap="butt"
                :stroke-dasharray="C" :stroke-dashoffset="dash(r.remaining, r.on)" transform="rotate(-90 22 22)" class="ring-fill"/>
            </svg>
            <span class="reminder-text">
              <span class="t-label-md title">{{ t(r.title) }}</span>
              <span class="t-body-sm t-muted">{{ r.on ? t(r.detail) : t('Hatırlatma kapalı') }}</span>
            </span>
            <input v-model="r.on" type="checkbox" role="switch" class="switch" :aria-label="t('{title} hatırlatması', {title: t(r.title)})">
          </li>
        </ul>
        <NuxtLink :to="{path: '/ara', query: {q: homeGarageTip.title}}" class="tip">
          <span class="tip-icon" aria-hidden="true"><Wrench :size="17"/></span>
          <span class="tip-text">
            <span class="t-label-sm">{{ t(homeGarageTip.title) }}</span>
            <span class="t-body-sm t-muted">{{ t(homeGarageTip.text) }}</span>
          </span>
          <span class="tip-go" aria-hidden="true"><ArrowRight :size="15"/></span>
        </NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-garage{padding-top:104px;padding-bottom:104px}
.panel{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:40px;padding:64px;border-radius:40px;background:linear-gradient(90deg,#F36B21 0%,#FFA13D 100%)}
.ring-deco{position:absolute;pointer-events:none;max-width:none}
.ring-deco.a{width:520px;height:520px;right:-100px;top:-180px}
.ring-deco.b{width:760px;height:760px;right:-220px;top:-300px}
.text{position:relative;flex:0 1 480px;display:flex;flex-direction:column;align-items:flex-start;gap:24px}
.pill{display:inline-flex;align-items:center;gap:8px;padding:7px 14px 7px 10px;border-radius:999px;background:var(--ink-900);color:var(--lime-400)}
.lead{max-width:420px;color:rgba(10,21,36,.86)}
.bullets{display:flex;flex-direction:column;gap:12px}
.bullets li{display:flex;align-items:center;gap:10px;color:var(--ink-900)}
.tick{flex:none;display:grid;place-items:center;width:24px;height:24px;border-radius:999px;background:var(--ink-900);color:var(--lime-400)}
.cta{display:flex;gap:12px;padding-top:8px;flex-wrap:wrap}

.vehicle{position:relative;flex:0 1 520px;min-width:0;display:flex;flex-direction:column;gap:18px;padding:24px;border-radius:32px;background:var(--white);box-shadow:0 30px 35px rgba(10,20,36,.28)}
.vehicle-head{display:flex;align-items:center;justify-content:space-between}
.plate{display:flex;align-items:center;overflow:hidden;border:2px solid var(--ink-900);border-radius:10px}
.plate-tr{display:grid;place-items:center;width:26px;height:38px;background:#1E4FBF;color:var(--white);font-family:var(--font-mono);font-weight:700;font-size:9px;letter-spacing:.06em}
.plate-no{padding:0 14px;font-family:var(--font-mono);font-weight:700;font-size:18px;line-height:1.3;letter-spacing:.04em;color:var(--ink-900);white-space:nowrap}
.bell{display:grid;place-items:center;width:42px;height:42px;border-radius:999px;background:var(--lime-400);color:var(--ink-900)}
.vehicle-name{display:flex;flex-direction:column;gap:4px}
.reminders{display:flex;flex-direction:column;gap:18px}
.reminder{display:flex;align-items:center;gap:14px}
.ring{flex:none}
.ring-fill{transition:stroke-dashoffset 1s cubic-bezier(.2,.7,.2,1)}
.reminder-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.title{color:var(--ink-900);transition:color .15s ease}
.off .title{color:rgba(10,21,36,.55)}
.tip{display:flex;align-items:center;gap:12px;padding:14px;border-radius:18px;background:var(--cream-50);border:1px solid var(--cream-200);color:var(--ink-900)}
.tip:hover{border-color:var(--ink-300)}
.tip-icon{flex:none;display:grid;place-items:center;width:38px;height:38px;border-radius:999px;background:var(--orange-100);color:var(--orange-600)}
.tip-text{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.tip-go{flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:999px;background:var(--ink-900);color:var(--white)}

@media (max-width:1100px){
  .panel{flex-direction:column;align-items:stretch;padding:48px}
  .text,.vehicle{flex:none}
}
@media (max-width:760px){
  .home-garage{padding-top:72px;padding-bottom:72px}
  .panel{padding:28px 18px;border-radius:32px}
  .vehicle{padding:18px}
}
</style>
