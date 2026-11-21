<script setup lang="ts">
import {onBeforeUnmount, onMounted, ref} from 'vue';
import {ArrowRight, Car, Check, Info, Star} from '@lucide/vue';
import {useLocale} from '~/composables/useLocale';
import {homeQuoteDefaultOffer, homeQuoteOffers, homeQuoteRequest, homeQuoteSteps} from '~/data/mock/home';

// Figma 112:211 "Teklif · tek talep, çok teklif". Steps tick as they progress (step 1 when the section
// comes into view, step 2 once an offer is picked); the chosen offer gets the orange frame.
// Step, badge and time texts are Turkish source text, translated at render; numbers follow the language.
const {t, localeTag} = useLocale();
const decimal = (value: number) => value.toLocaleString(localeTag.value, {minimumFractionDigits: 1, maximumFractionDigits: 1});
const lira = (value: number) => new Intl.NumberFormat(localeTag.value, {style: 'currency', currency: 'TRY', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0}).format(value);
const done = ref(1);
const chosen = ref(homeQuoteDefaultOffer);
const root = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

onMounted(() => {
  if (!root.value || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  done.value = 0;
  observer = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    observer?.disconnect();
    timer = setTimeout(() => { done.value = Math.max(done.value, 1); }, 500);
  }, {rootMargin: '0px 0px -25% 0px'});
  observer.observe(root.value);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  clearTimeout(timer);
});

function choose(id: string) {
  chosen.value = id;
  done.value = Math.max(done.value, 2);
}
</script>

<template>
  <section ref="root" class="home-quote" aria-labelledby="home-quote-title">
    <div class="v2-wrap inner">
      <div class="text">
        <p class="t-mono-md t-eyebrow">{{ t('TEKLİF AL') }}</p>
        <h2 id="home-quote-title" class="t-h2" v-html="t('Bir kez anlat,<br>teklifler gelsin.')"/>
        <p class="t-body-md t-muted lead">{{ t('Tek tek aramakla uğraşma. Aracını ve ihtiyacını yaz; yakınındaki servisler fiyat ve en erken randevu saatiyle dönsün.') }}</p>
        <ol class="steps">
          <li v-for="(step, i) in homeQuoteSteps" :key="step.title" :class="{done: i < done, current: i === done}">
            <span class="num" aria-hidden="true">
              <Transition name="tick" mode="out-in">
                <Check v-if="i < done" :size="18" :stroke-width="2.5"/>
                <span v-else>{{ String(i + 1).padStart(2, '0') }}</span>
              </Transition>
            </span>
            <span class="step-text">
              <span class="step-title">{{ t(step.title) }}<span class="sr-only">{{ i < done ? t(' (tamamlandı)') : i === done ? t(' (şu an)') : '' }}</span></span>
              <span class="t-body-sm t-muted">{{ t(step.text) }}</span>
            </span>
          </li>
        </ol>
        <div class="cta">
          <NuxtLink to="/talep" class="btn btn-dark">{{ t('Teklif iste') }}<ArrowRight aria-hidden="true"/></NuxtLink>
          <span class="t-body-sm t-muted">{{ t('Ücretsiz · bağlayıcı değil') }}</span>
        </div>
      </div>

      <div class="card">
        <div class="card-head">
          <div class="request">
            <p class="t-mono-sm t-muted">{{ t('TALEBİN') }}</p>
            <h3 class="t-h4">{{ t(homeQuoteRequest.title) }}</h3>
            <p class="t-body-sm t-muted vehicle"><Car :size="15" aria-hidden="true"/>{{ homeQuoteRequest.vehicle }}</p>
          </div>
          <span class="arrived t-label-sm"><span class="dot" aria-hidden="true"/>{{ t('{count} teklif geldi', {count: homeQuoteOffers.length}) }}</span>
        </div>

        <ul class="offers" :aria-label="t('Gelen teklifler')">
          <li v-for="offer in homeQuoteOffers" :key="offer.id">
            <button type="button" class="offer" :class="{on: chosen === offer.id}" :aria-pressed="chosen === offer.id" @click="choose(offer.id)">
              <img :src="offer.photo" alt="" width="52" height="52">
              <span class="who">
                <span class="t-label-md">{{ offer.name }}</span>
                <span class="rate"><Star :size="14" aria-hidden="true"/><span class="t-label-sm">{{ decimal(offer.rating) }}</span><span class="t-body-sm t-muted">· {{ decimal(offer.distanceKm) }} km</span></span>
              </span>
              <span class="when">
                <span class="t-mono-sm t-muted">{{ t('EN ERKEN') }}</span>
                <span class="t-label-sm">{{ t(offer.earliest) }}</span>
              </span>
              <span class="price">
                <span class="badge" :class="offer.tone">{{ t(offer.badge).toLocaleUpperCase(localeTag) }}</span>
                <span class="amount">{{ lira(offer.price) }}</span>
              </span>
            </button>
          </li>
        </ul>

        <div class="card-foot">
          <p class="t-body-sm t-muted note"><Info :size="16" aria-hidden="true"/>{{ t('Fiyatlar örnektir; her işletme kendi teklifini verir.') }}</p>
          <NuxtLink to="/talep" class="btn btn-primary">{{ t('Randevu al') }}<ArrowRight aria-hidden="true"/></NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home-quote{background:var(--cream-100)}
.inner{display:flex;align-items:center;gap:80px;padding-top:104px;padding-bottom:104px}
.text{flex:0 0 500px;display:flex;flex-direction:column;align-items:flex-start;gap:28px}
.lead{max-width:440px}
.steps{display:flex;flex-direction:column;gap:18px}
.steps li{display:flex;align-items:flex-start;gap:16px}
.num{flex:none;display:grid;place-items:center;width:40px;height:40px;border-radius:999px;border:1.5px solid var(--ink-300);font-family:var(--font-mono);font-weight:700;font-size:11px;letter-spacing:.06em;color:var(--ink-500);transition:background-color .3s ease,border-color .3s ease,color .3s ease}
.current .num{background:var(--orange-500);border-color:var(--orange-500);color:var(--ink-900)}
.done .num{background:var(--ink-900);border-color:var(--ink-900);color:var(--lime-400)}
.step-text{display:flex;flex-direction:column;gap:3px;padding-top:2px}
.step-title{font-weight:600;font-size:17px;line-height:1.2;color:var(--ink-900)}
.cta{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.tick-enter-active,.tick-leave-active{transition:transform .2s ease,opacity .2s ease}
.tick-enter-from,.tick-leave-to{transform:scale(.4);opacity:0}

.card{flex:1;min-width:0;display:flex;flex-direction:column;gap:18px;padding:28px;background:var(--white);border:1px solid var(--cream-200);border-radius:32px;box-shadow:0 24px 30px rgba(10,20,36,.1)}
.card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.request{display:flex;flex-direction:column;gap:6px}
.vehicle{display:flex;align-items:center;gap:6px}
.arrived{flex:none;display:flex;align-items:center;gap:7px;padding:7px 12px;border-radius:999px;background:var(--lime-100);color:var(--ink-800)}
.dot{width:7px;height:7px;border-radius:999px;background:var(--green-500)}
.offers{display:flex;flex-direction:column;gap:18px}
.offer{width:100%;display:flex;align-items:center;gap:16px;padding:16px;border-radius:22px;background:var(--cream-50);border:1px solid var(--cream-200);text-align:left;transition:border-color .15s ease,background-color .15s ease,box-shadow .15s ease}
.offer:hover{border-color:var(--ink-300)}
.offer.on{background:var(--white);border:2px solid var(--orange-500);padding:15px;box-shadow:0 14px 15px rgba(10,20,36,.12)}
.offer img{flex:none;width:52px;height:52px;border-radius:14px;object-fit:cover}
.who{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px;color:var(--ink-900)}
.rate{display:flex;align-items:center;gap:5px}
.rate :deep(svg){color:var(--orange-500);fill:currentColor}
.when{flex:0 0 96px;display:flex;flex-direction:column;gap:4px;color:var(--ink-900);white-space:nowrap}
.price{flex:0 0 128px;display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.badge{padding:4px 9px;border-radius:999px;font-family:var(--font-mono);font-weight:700;font-size:11px;line-height:1.3;letter-spacing:.06em;color:var(--ink-900);white-space:nowrap}
.badge.sky{background:var(--sky-200)}
.badge.lime{background:var(--lime-400)}
.badge.orange{background:var(--orange-100)}
.amount{font-weight:700;font-size:22px;line-height:1.2;color:var(--ink-900)}
.card-foot{display:flex;align-items:center;justify-content:space-between;gap:16px;padding-top:4px}
.note{display:flex;align-items:center;gap:8px}

@media (max-width:1100px){
  .inner{flex-direction:column;align-items:stretch;gap:48px}
  .text{flex:none}
}
@media (max-width:760px){
  .inner{padding-top:72px;padding-bottom:72px}
  .card{padding:18px;border-radius:28px}
  .offer{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:6px 12px}
  .offer img{grid-row:span 2}
  .who{grid-column:2}
  .when{grid-column:2;grid-row:2}
  .price{grid-column:3;grid-row:1 / span 2}
  .rate{flex-wrap:wrap}
  .card-foot{flex-direction:column;align-items:flex-start}
}
</style>
