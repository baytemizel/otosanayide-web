<script setup lang="ts">
import {Check} from '@lucide/vue';
import V2Doodle from '~/components/v2/V2Doodle.vue';
import V2Logo from '~/components/v2/V2Logo.vue';
import {useLocale} from '~/composables/useLocale';

// W10 "Giriş kartı" (Figma 123:69): dark promo panel on the left, white form panel (slot) on the right.
// Under the list the "Usta ve sürücü" doodle sits in a cream card (doodles go in a light card on dark grounds).
// Also used by the e-mail verification and password reset pages so all auth screens share one card.
// The list keeps the Turkish source; each item is translated at render.
const {t} = useLocale();
const features = [
  'Birden fazla araç ve bakım geçmişi',
  'Push, e-posta ve takvim hatırlatmaları',
  'Favori listeleri ve karşılaştırma',
  'Teklif ve randevu takibi',
];
</script>

<template>
  <section class="auth-shell v2-wrap">
    <div class="card">
      <aside class="promo">
        <img class="glow glow-orange" src="/v2/garage/auth-glow-orange.svg" alt="" width="620" height="620">
        <img class="glow glow-lime" src="/v2/garage/auth-glow-lime.svg" alt="" width="460" height="460">
        <div class="promo-top">
          <NuxtLink to="/" :aria-label="t('Otosanayide ana sayfa')"><V2Logo dark/></NuxtLink>
          <p class="t-h2 promo-title"><template v-for="(line, i) in t('Ücretsiz hesabınla\ndaha fazlası.').split('\n')" :key="i"><br v-if="i">{{ line }}</template></p>
          <ul class="features">
            <li v-for="item in features" :key="item" class="t-body-md">
              <span class="tick" aria-hidden="true"><Check :size="14" :stroke-width="2.5"/></span>{{ t(item) }}
            </li>
          </ul>
          <div class="art-card"><V2Doodle name="oz-hero" :size="248" eager/></div>
        </div>
        <p class="t-body-sm promo-note">{{ t('Keşif, arama ve yol tarifi için hesap gerekmez.') }}</p>
      </aside>
      <div class="panel">
        <slot/>
      </div>
    </div>
  </section>
</template>

<style scoped>
.auth-shell{padding-top:40px;padding-bottom:104px}
.card{display:flex;min-height:748px;border:1px solid var(--cream-200);border-radius:40px;overflow:hidden;background:var(--white);box-shadow:0 24px 30px rgba(10,20,36,.1)}
.promo{position:relative;flex:1 1 0;min-width:0;display:flex;flex-direction:column;justify-content:space-between;gap:40px;padding:56px;background:var(--ink-900);overflow:hidden;color:var(--white)}
.glow{position:absolute;pointer-events:none;max-width:none}
.glow-orange{left:260px;top:-280px;width:620px;height:620px}
.glow-lime{left:-220px;top:420px;width:460px;height:460px}
.promo-top{position:relative;display:flex;flex-direction:column;gap:28px;align-items:flex-start}
.promo-title{color:var(--white);max-width:520px}
.features{display:flex;flex-direction:column;gap:14px}
.features li{display:flex;align-items:center;gap:12px;color:var(--white)}
.tick{flex:none;width:26px;height:26px;border-radius:999px;background:var(--lime-400);color:var(--ink-900);display:grid;place-items:center}
.art-card{margin-top:-4px;padding:12px;border-radius:24px;background:var(--cream-50)}
.promo-note{position:relative;color:var(--ink-300)}
.panel{flex:none;width:580px;display:flex;flex-direction:column;gap:20px;padding:56px;background:var(--white)}
@media (max-width:1100px){
  .panel{width:520px;padding:48px 40px}
  .promo{padding:48px 40px}
}
@media (max-width:900px){
  .auth-shell{padding-top:24px;padding-bottom:64px}
  .card{flex-direction:column;min-height:0;border-radius:28px}
  .promo{flex:none;padding:32px 24px;gap:24px}
  .promo-title{font-size:34px}
  .features{gap:10px}
  .panel{width:auto;padding:32px 24px}
}
@media (max-width:600px){.features,.art-card{display:none}.promo-title{font-size:30px}}
</style>
