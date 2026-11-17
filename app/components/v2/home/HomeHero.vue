<script setup lang="ts">
import {ArrowRight, Check, Navigation, Phone, ShieldCheck, Star} from '@lucide/vue';
import HomeCounterStrip from '~/components/v2/home/HomeCounterStrip.vue';
import HomeSmartSearch from '~/components/v2/home/HomeSmartSearch.vue';
import {formatKm, formatRating, mockBusiness} from '~/data/mock/businesses';
import {homeHeroTrust} from '~/data/mock/home';

// Figma 108:42 (without the shared navbar): glows, hero 108:78, smart search 108:148, counter strip 108:235.
const live = mockBusiness('ornek-teknik-garaj')!;
</script>

<template>
  <section class="home-hero" aria-labelledby="home-hero-title">
    <img class="glow glow-right" src="/v2/home/glow-hero-right.svg" alt="" width="980" height="980" aria-hidden="true">
    <img class="glow glow-left" src="/v2/home/glow-hero-left.svg" alt="" width="560" height="560" aria-hidden="true">

    <div class="v2-wrap inner">
      <div class="hero">
        <div class="text">
          <p class="pill">
            <img src="/v2/home/eyebrow-dot.svg" alt="" width="20" height="20">
            <span class="t-mono-sm">ÜYELİK GEREKMEZ · ŞİMDİLİK 41 İLDE</span>
          </p>
          <h1 id="home-hero-title" class="t-hero">Aracına iyi<br>bakacak ustayı<br><em>ilk seferde</em> bul.</h1>
          <p class="t-body-lg t-muted lead">Mekanikten oto kuaföre 20 kategoride servisleri karşılaştır, gerçek yorumları oku; tek dokunuşla ara ya da yol tarifi al.</p>
          <ul class="trust">
            <li v-for="item in homeHeroTrust" :key="item" class="t-label-sm">
              <span class="tick" aria-hidden="true"><Check :size="12" :stroke-width="2.5"/></span>{{ item }}
            </li>
          </ul>
        </div>

        <div class="visual-wrap">
          <div class="visual">
            <div class="block" aria-hidden="true"/>
            <div class="photo">
              <img src="/v2/workshop.jpg" alt="Serviste lifte alınmış bir aracın altında çalışan usta" width="1200" height="675">
            </div>
            <NuxtLink to="/ara" class="badge">
              <span class="t-mono-sm">ÜYELİKSİZ</span>
              <span class="t-mono-sm">KEŞİF</span>
              <ArrowRight :size="18" aria-hidden="true"/>
            </NuxtLink>
            <div class="reminder" aria-hidden="true">
              <img src="/v2/home/hero-ring.svg" alt="" width="42" height="42">
              <span class="reminder-text">
                <span class="t-mono-sm">MUAYENE</span>
                <span class="t-label-md">42 gün kaldı</span>
              </span>
            </div>
            <div class="live">
              <div class="live-head">
                <img src="/v2/home/car-detail.jpg" alt="" width="48" height="48">
                <span class="live-name">
                  <NuxtLink :to="`/servis/${live.id}`" class="t-label-md">{{ live.name }}</NuxtLink>
                  <span class="t-body-sm t-muted">{{ live.district }} · {{ formatKm(live.distanceKm) }}</span>
                </span>
              </div>
              <div class="live-rating">
                <Star :size="16" class="star" aria-hidden="true"/>
                <span class="t-label-sm">{{ formatRating(live.rating) }}</span>
                <span class="t-body-sm t-muted">({{ live.reviewCount }} yorum)</span>
                <span class="open t-label-sm"><span class="dot" aria-hidden="true"/>Açık</span>
              </div>
              <div class="live-actions">
                <a :href="`tel:${live.phone.replace(/\s/g, '')}`" class="act dark t-label-sm"><Phone :size="15" aria-hidden="true"/>Ara</a>
                <NuxtLink :to="`/servis/${live.id}`" class="act soft t-label-sm"><Navigation :size="15" aria-hidden="true"/>Yol tarifi</NuxtLink>
              </div>
            </div>
            <p class="verified t-label-sm"><ShieldCheck :size="18" aria-hidden="true"/>Doğrulanmış işletme</p>
          </div>
        </div>
      </div>

      <HomeSmartSearch/>
      <HomeCounterStrip/>
    </div>
  </section>
</template>

<style scoped>
.home-hero{position:relative}
.glow{position:absolute;pointer-events:none;max-width:none}
.glow-right{width:980px;height:980px;left:calc(50% - 20px);top:-352px}
.glow-left{width:560px;height:560px;left:calc(50% - 920px);top:378px}
.inner{position:relative;display:flex;flex-direction:column;gap:56px;padding-top:56px;padding-bottom:72px}

.hero{display:flex;align-items:center;gap:40px}
.text{flex:0 1 680px;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:28px}
.pill{display:inline-flex;align-items:center;gap:10px;padding:7px 16px 7px 8px;background:var(--white);border:1px solid var(--cream-200);border-radius:999px;color:var(--ink-800)}
h1 em{font-style:normal;color:var(--orange-500)}
.lead{max-width:560px}
.trust{display:flex;flex-wrap:wrap;gap:12px 22px}
.trust li{display:flex;align-items:center;gap:8px;color:var(--ink-800)}
.tick{display:grid;place-items:center;width:22px;height:22px;border-radius:999px;background:var(--ink-900);color:var(--lime-400)}

.visual-wrap{flex:none;width:520px;height:560px;margin-left:auto}
.visual{position:relative;width:520px;height:560px}
.block{position:absolute;left:120px;top:0;width:400px;height:520px;border-radius:40px;background:var(--orange-500)}
.photo{position:absolute;left:70px;top:36px;width:420px;height:500px;border-radius:36px;overflow:hidden}
.photo img{width:100%;height:100%;object-fit:cover}
.photo::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,20,36,0) 45%,rgba(10,20,36,.62) 100%)}
.badge{position:absolute;left:14px;top:64px;width:116px;height:116px;border-radius:999px;background:var(--lime-400);color:var(--ink-900);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;box-shadow:0 10px 12px rgba(10,20,36,.16);transition:transform .2s ease}
.badge .t-mono-sm{font-weight:700}
.badge:hover{transform:rotate(-6deg) scale(1.03)}
.reminder{position:absolute;left:318px;top:96px;display:flex;align-items:center;gap:12px;padding:14px 18px 14px 14px;border-radius:20px;background:var(--ink-900);box-shadow:0 16px 18px rgba(10,20,36,.25)}
.reminder-text{display:flex;flex-direction:column;gap:3px;white-space:nowrap}
.reminder .t-mono-sm{color:var(--lime-400)}
.reminder .t-label-md{color:var(--white)}
.live{position:absolute;left:0;top:372px;width:300px;display:flex;flex-direction:column;gap:14px;padding:16px;border-radius:24px;background:var(--white);box-shadow:0 18px 20px rgba(10,20,36,.2)}
.live-head{display:flex;align-items:center;gap:12px}
.live-head img{width:48px;height:48px;border-radius:14px;object-fit:cover}
.live-name{display:flex;flex-direction:column;gap:2px;white-space:nowrap}
.live-name a:hover{text-decoration:underline}
.live-rating{display:flex;align-items:center;gap:6px}
.star{color:var(--orange-500);fill:var(--orange-500)}
.open{margin-left:auto;display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;background:var(--lime-100);color:var(--ink-800)}
.dot{width:7px;height:7px;border-radius:999px;background:var(--green-500)}
.live-actions{display:flex;gap:8px}
.act{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:11px 0;border-radius:999px}
.act.dark{background:var(--ink-900);color:var(--white)}
.act.soft{background:var(--cream-100);color:var(--ink-900)}
.verified{position:absolute;left:326px;top:468px;display:flex;align-items:center;gap:8px;padding:10px 16px 10px 12px;border-radius:999px;background:var(--white);color:var(--ink-900);box-shadow:0 10px 12px rgba(10,20,36,.16);white-space:nowrap}
.verified :deep(svg){color:var(--green-500)}

@media (max-width:1180px){
  .hero{flex-direction:column;align-items:flex-start}
  .text{flex:none;width:100%}
  .visual-wrap{margin:0 auto}
}
@media (max-width:760px){
  .inner{gap:40px;padding-top:32px;padding-bottom:56px}
  .visual-wrap{width:333px;height:358px}
  .visual{transform:scale(.64);transform-origin:top left}
}
</style>
