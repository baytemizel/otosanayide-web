<script setup lang="ts">
import {ArrowRight} from '@lucide/vue';
import {homeBusinessPanel} from '~/data/mock/home';
import {portalUrl} from '~/lib/portal';

// Figma 113:463 "İşletmeler için". Business screens live in the portal; without its origin the links stay on this section.
const claimHref = portalUrl('claim') ?? '/#isletmeler';
const newHref = portalUrl('newBusiness') ?? '/#isletmeler';
</script>

<template>
  <section id="isletmeler" class="home-business v2-wrap" aria-labelledby="home-business-title">
    <div class="panel">
      <img class="glow glow-right" src="/v2/home/glow-biz-right.svg" alt="" width="700" height="700" aria-hidden="true">
      <img class="glow glow-left" src="/v2/home/glow-biz-left.svg" alt="" width="480" height="480" aria-hidden="true">

      <div class="text">
        <p class="pill t-mono-sm"><span class="pill-dot" aria-hidden="true"/>İŞLETMELER İÇİN</p>
        <h2 id="home-business-title" class="t-h2">İşletmen listede mi?</h2>
        <p class="t-body-md lead">Profilini ücretsiz sahiplen; bilgilerini güncelle, yorumlara yanıt ver, teklif taleplerini tek kutuda topla.</p>
        <div class="cta">
          <a :href="claimHref" class="btn btn-lime">Bu işletme benim<ArrowRight aria-hidden="true"/></a>
          <a :href="newHref" class="btn btn-outline-dark">Yeni işletme ekle<ArrowRight aria-hidden="true"/></a>
        </div>
        <p class="t-body-sm fine">Sahiplik rozeti yönetim yetkisini gösterir; hizmet kalitesi garantisi değildir.</p>
      </div>

      <figure class="preview" aria-label="Örnek işletme paneli: bu hafta 128 profil görüntülenmesi">
        <p class="t-mono-sm muted">BU HAFTA · ÖRNEK PANEL</p>
        <div class="stat">
          <span class="t-stat">{{ homeBusinessPanel.views }}</span>
          <span class="change t-mono-sm">{{ homeBusinessPanel.change }}</span>
        </div>
        <p class="t-body-sm muted">profil görüntülenmesi</p>
        <div class="bars" aria-hidden="true">
          <span v-for="(bar, i) in homeBusinessPanel.bars" :key="bar.day" class="bar-col">
            <span class="bar" :class="{peak: i === homeBusinessPanel.peak}" :style="{height: `${bar.height}px`}"/>
            <span class="day">{{ bar.day }}</span>
          </span>
        </div>
        <ul class="stats">
          <li v-for="s in homeBusinessPanel.stats" :key="s" class="chip chip-dark">{{ s }}</li>
        </ul>
      </figure>
    </div>
  </section>
</template>

<style scoped>
.home-business{padding-bottom:104px}
.panel{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;gap:40px;padding:56px;border-radius:40px;background:var(--ink-900);color:var(--white)}
.glow{position:absolute;pointer-events:none;max-width:none}
.glow-right{width:700px;height:700px;left:760px;top:-260px}
.glow-left{width:480px;height:480px;left:-200px;top:180px}
.text{position:relative;flex:0 1 600px;min-width:0;display:flex;flex-direction:column;align-items:flex-start;gap:22px}
.pill{display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);color:var(--lime-400)}
.pill-dot{width:7px;height:7px;border-radius:999px;background:var(--lime-400)}
.lead{max-width:520px;color:var(--ink-300)}
.cta{display:flex;flex-wrap:wrap;gap:12px;padding-top:6px}
.fine{max-width:520px;color:rgba(163,177,194,.8)}

.preview{position:relative;flex:0 0 380px;margin:0;display:flex;flex-direction:column;gap:16px;padding:24px;border-radius:28px;background:var(--ink-800);border:1px solid rgba(255,255,255,.1);box-shadow:0 24px 30px rgba(10,20,36,.4)}
.muted{color:var(--ink-300)}
.stat{display:flex;align-items:center;gap:12px}
.change{padding:5px 10px;border-radius:999px;background:var(--lime-400);color:var(--ink-900);font-weight:700}
.bars{display:flex;align-items:flex-end;justify-content:space-between;height:112px}
.bar-col{display:flex;flex-direction:column;align-items:center;gap:6px}
.bar{width:32px;border-radius:8px;background:rgba(255,255,255,.16);transition:background-color .2s ease}
.bar.peak{background:var(--lime-400)}
.bar-col:hover .bar:not(.peak){background:rgba(255,255,255,.3)}
.day{font-family:var(--font-mono);font-weight:500;font-size:10px;line-height:1.3;letter-spacing:.06em;color:var(--ink-300)}
.stats{display:flex;flex-wrap:wrap;gap:8px}

@media (max-width:1100px){
  .panel{flex-direction:column;align-items:stretch}
  .text,.preview{flex:none}
}
@media (max-width:760px){
  .home-business{padding-bottom:72px}
  .panel{padding:28px 18px;border-radius:32px}
  .preview{padding:18px}
  .bar{width:26px}
}
</style>
